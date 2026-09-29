import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';

class CloudFlutterIdePage extends StatefulWidget {
  const CloudFlutterIdePage({super.key});
  @override State<CloudFlutterIdePage> createState() => _CloudFlutterIdePageState();
}

class _CloudFlutterIdePageState extends State<CloudFlutterIdePage> {
  final repo = TextEditingController(text: 'ly7902800-coder/A');
  final branch = TextEditingController(text: 'genesis-cloud-flutter');
  final base = TextEditingController(text: 'main');
  final path = TextEditingController(text: 'apps/mobile/lib/main.dart');
  final code = TextEditingController();
  final terminal = TextEditingController();
  final dio = Dio();
  Timer? timer;
  Timer? heartbeatTimer;
  bool busy = false;
  bool computerMode = true;
  int editorVersion = 0;
  String treePath = '';
  List<Map<String, dynamic>> treeEntries = [];
  WebViewController? previewController;
  String? previewUrl;
  String? devtoolsUrl;
  WebViewController? devtoolsController;

  WebSocketChannel? terminalSocket;
  String panel = 'editor';
  String projectName = 'Genesis Flutter Project';
  String target = 'apk';
  List<Map<String, dynamic>> artifacts = [];
  String? buildRunId;
  String status = 'Cloud Flutter workspace ready';
  late final String sessionId =
      'genesis-' + DateTime.now().millisecondsSinceEpoch.toString();

  String? get apiBase {
    const v = String.fromEnvironment('GENESIS_API_URL', defaultValue: '');
    return v.isEmpty ? null : v;
  }

  Future<Map<String, dynamic>> request(String method, String endpoint,
      {Map<String, dynamic>? data, Map<String, String>? query}) async {
    if (apiBase == null) throw Exception('GENESIS_API_URL is not configured');
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('genesis_auth_token');
    final r = await dio.request<Map<String, dynamic>>(
      apiBase! + endpoint,
      data: data,
      queryParameters: query,
      options: Options(
        method: method,
        headers: {
          'Content-Type': 'application/json',
          if (token != null && token.isNotEmpty)
            'Authorization': 'Bearer ' + token,
        },
      ),
    );
    return r.data ?? <String, dynamic>{};
  }

  Future<void> startWorkspace() async {
    setState(() => busy = true);
    try {
      await request('POST', '/v1/flutter/worker/start', data: {
        'sessionId': sessionId, 'repo': repo.text.trim(), 'branch': branch.text.trim(),
      });
      await _loadTree();
      await _connectTerminal();
      heartbeatTimer?.cancel();
      heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) => _heartbeat());
            await _startDebug();
      setState(() => status = 'Cloud Flutter debug workspace is running');
    } catch (e) {
      setState(() => status = 'Workspace error: ' + e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void _snack(String message) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message))); }

  Future<void> _openContentStudio() async {
    try {
      final data = await request('GET', '/v1/content/sources');
      if (!mounted) return;
      final sources = (data['sources'] as List? ?? []);
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) => SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Genesis Content Studio', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('مصادر فيديو وصور قابلة للربط مع API رسمي أو رفع المستخدم.'),
              const SizedBox(height: 12),
              ...sources.map((src) => Card(
                child: ListTile(
                  leading: Icon(src['id'] == 'short-video' ? Icons.smartphone : Icons.video_library),
                  title: Text(src['name'].toString()),
                  subtitle: Text('Mode: ${src['mode']} • Provider: ${src['provider']}'),
                  trailing: FilledButton(
                    onPressed: () async {
                      try {
                        final plan = await request('POST', '/v1/content/feed-plan', data: {'kind': src['id']});
                        if (mounted) {
                          Navigator.pop(context);
                          setState(() => status = 'Content feed ready: ${plan['source']?['name'] ?? src['name']}');
                        }
                      } catch (e) {
                        if (mounted) _snack(e.toString());
                      }
                    },
                    child: const Text('Use'),
                  ),
                ),
              )),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) _snack(e.toString());
    }
  }

  Future<void> _openIntegrations() async {
    try {
      final data = await request('GET', '/v1/integrations');
      if (!mounted) return;
      final items = (data['integrations'] as List? ?? []);
      showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => SafeArea(
        child: ListView(padding: const EdgeInsets.all(16), children: [
          const Text('Genesis Integrations', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          ...items.map((item) => Card(child: ListTile(
            leading: const Icon(Icons.extension),
            title: Text(item['name'].toString()),
            subtitle: Text('${item['category']} • ${item['status']}'),
            trailing: FilledButton(onPressed: () async {
              try { await request('POST', '/v1/integrations/${item['id']}/connect'); if (mounted) Navigator.pop(context); } catch (_) {}
            }, child: const Text('Connect')),
          ))),
        ]),
      ));
    } catch (e) { if (mounted) _snack(e.toString()); }
  }

  Future<void> _heartbeat() async {
    try {
      await request('POST', '/v1/flutter/workspace/heartbeat', data: {
        'sessionId': sessionId,
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
      });
    } catch (_) {}
  }

  Future<void> _connectTerminal() async {
    try {
      final r = await request('POST', '/v1/flutter/terminal-url', data: {
        'sessionId': sessionId,
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
      });
      final url = r['url']?.toString();
      if (url == null || url.isEmpty) return;
      terminalSocket?.sink.close();
      final socket = WebSocketChannel.connect(Uri.parse(url));
      terminalSocket = socket;
      socket.stream.listen((event) {
        try {
          final m = jsonDecode(event.toString()) as Map<String, dynamic>;
          final data = m['data']?.toString() ?? m['message']?.toString() ?? '';
          if (data.isNotEmpty && mounted) {
            setState(() => status = data);
          }
          if (m['type'] == 'exit' && mounted) {
            setState(() => status = 'Terminal process exited: ' + (m['code']?.toString() ?? '0'));
          }
        } catch (_) {}
      }, onError: (e) {
        if (mounted) setState(() => status = 'Live terminal error: ' + e.toString());
      });
      await socket.ready;
      if (mounted) setState(() => status = 'Live terminal connected');
    } catch (e) {
      if (mounted) setState(() => status = 'Terminal connection error: ' + e.toString());
    }
  }


  Future<void> _startDebug() async {
    final r = await request('POST', '/v1/flutter/debug/start', data: {
      'sessionId': sessionId, 'repo': repo.text.trim(), 'branch': branch.text.trim(),
    });
    final preview = await request('POST', '/v1/flutter/preview-url', data: {'sessionId': sessionId});
    previewUrl = preview['url']?.toString();
    final debug = await request('POST', '/v1/flutter/debug/status', data: {'sessionId': sessionId});
    devtoolsUrl = debug['devtoolsUrl']?.toString();
    if (devtoolsUrl != null) {
      devtoolsController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..loadRequest(Uri.parse(devtoolsUrl!));
    }
    if (previewUrl != null) {
      previewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(NavigationDelegate(
          onPageStarted: (_) => setState(() => status = 'Live Flutter preview loading'),
          onPageFinished: (_) => setState(() => status = 'Live Flutter preview connected'),
        ))
        ..loadRequest(Uri.parse(previewUrl!));
    }
    setState(() => status = 'Debug session started: ' + (r['sessionId']?.toString() ?? sessionId));
  }

  Future<void> _debugAction(String endpoint, String label) async {
    setState(() => busy = true);
    try {
      await request('POST', endpoint, data: {
        'sessionId': sessionId, 'repo': repo.text.trim(), 'branch': branch.text.trim(),
      });
      setState(() => status = label + ' complete');
    } catch (e) {
      setState(() => status = label + ' error: ' + e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _loadTree([String? pathValue]) async {
    try {
      final p = pathValue ?? treePath;
      final r = await request('POST', '/v1/flutter/workspace/tree', data: {
        'sessionId': sessionId, 'repo': repo.text.trim(), 'branch': branch.text.trim(), 'path': p,
      });
      setState(() {
        treePath = p;
        treeEntries = (r['entries'] as List? ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      });
    } catch (e) {
      setState(() => status = 'Explorer error: ' + e.toString());
    }
  }

  Future<void> openFile() async {
    setState(() => busy = true);
    try {
      final r = await request('POST', '/v1/flutter/workspace/file/read', data: {
        'sessionId': sessionId, 'repo': repo.text.trim(), 'branch': branch.text.trim(), 'path': path.text.trim(),
      });
      code.text = r['content']?.toString() ?? '';
      editorVersion++;
      setState(() => status = 'Loaded ' + path.text.trim());
    } catch (e) {
      setState(() => status = 'Load error: ' + e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> saveFile() async {
    setState(() => busy = true);
    try {
      await request('POST', '/v1/flutter/workspace/branch', data: {
        'repo': repo.text.trim(), 'baseBranch': base.text.trim(), 'branch': branch.text.trim(),
      });
      await request('POST', '/v1/flutter/workspace/file/write', data: {
        'sessionId': sessionId, 'repo': repo.text.trim(), 'branch': branch.text.trim(),
        'path': path.text.trim(), 'content': code.text, 'message': 'Genesis Cloud Flutter edit', 'sync': true,
      });
      setState(() => status = 'Saved, committed and pushed to GitHub workspace');
    } catch (e) {
      setState(() => status = 'Save error: ' + e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> runCommand() async {
    final c = terminal.text.trim();
    if (c.isEmpty) return;
    setState(() {
      busy = true;
      panel = 'terminal';
    });
    try {
      if (terminalSocket != null) {
        terminalSocket!.sink.add(jsonEncode({'type': 'exec', 'command': c}));
        setState(() => status = 'Running: ' + c);
      } else {
        final r = await request('POST', '/v1/flutter/worker/command', data: {
          'sessionId': sessionId,
          'repo': repo.text.trim(),
          'branch': branch.text.trim(),
          'command': c,
        });
        status = (r['stdout']?.toString() ?? '') + (r['stderr']?.toString() ?? '');
        setState(() {});
      }
    } catch (e) {
      setState(() => status = 'Terminal error: ' + e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> buildProject() async {
    setState(() => busy = true);
    try {
      await request('POST', '/v1/flutter/workspace/branch', data: {
        'repo': repo.text.trim(),
        'baseBranch': base.text.trim(),
        'branch': branch.text.trim(),
      });
      await request('POST', '/v1/flutter/build', data: {
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
        'target': target,
      });
      setState(() => status =
          target.toUpperCase() + ' build dispatched to GitHub Actions');
      timer?.cancel();
      timer = Timer.periodic(const Duration(seconds: 8), (_) => pollBuild());
    } catch (e) {
      setState(() => status = 'Build error: ' + e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> loadArtifacts(String runId) async {
    try {
      final r = await request('GET', '/v1/flutter/build/artifacts', query: {
        'repo': repo.text.trim(), 'runId': runId,
      });
      setState(() {
        artifacts = (r['artifacts'] as List? ?? []).whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => e['expired'] != true).toList();
      });
    } catch (e) {
      if (mounted) setState(() => status = 'Artifact error: ' + e.toString());
    }
  }

  Future<void> pollBuild() async {
    try {
      final r = await request('GET', '/v1/flutter/build/status', query: {
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
      });
      if (r['found'] != true) return;
      buildRunId = r['runId']?.toString();
      if (r['status'] == 'completed') {
        timer?.cancel();
        if (r['conclusion'] == 'success' && buildRunId != null) await loadArtifacts(buildRunId!);
        setState(() => status =
            'Build ' + (r['conclusion']?.toString() ?? 'completed'));
      } else {
        setState(() => status =
            'Build running: ' + (r['status']?.toString() ?? ''));
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    timer?.cancel();
    heartbeatTimer?.cancel();
    terminalSocket?.sink.close();
    repo.dispose();
    branch.dispose();
    base.dispose();
    path.dispose();
    code.dispose();
    terminal.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFF101114),
        body: SafeArea(
          child: Column(
            children: [
              _topBar(),
              Expanded(
                child: computerMode ? _desktopLayout() : _mobileLayout(),
              ),
              _statusBar(),
            ],
          ),
        ),
      );

  Widget _topBar() => Container(
        height: 54,
        color: const Color(0xFF18191D),
        child: Row(
          children: [
            IconButton(
              onPressed: () => context.pop(),
              icon: const Icon(Icons.arrow_back, size: 19),
            ),
            const Icon(Icons.flutter_dash, size: 23),
            const SizedBox(width: 8),
            const Text('Genesis Cloud IDE',
                style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(width: 14),
            _chip(branch.text),
            const Spacer(),
            _tool(Icons.play_arrow, 'Run', startWorkspace),
            _tool(Icons.bug_report_outlined, 'Debug', _startDebug),
            _tool(Icons.stop_circle_outlined, 'Stop', () => _debugAction('/v1/flutter/debug/stop', 'Stop Debug')),
            _tool(Icons.refresh, 'Hot Reload', () => _debugAction('/v1/flutter/debug/hot-reload', 'Hot Reload')),
            _tool(Icons.restart_alt, 'Hot Restart', () => _debugAction('/v1/flutter/debug/hot-restart', 'Hot Restart')),
            _tool(Icons.build_outlined, 'Build', buildProject),
            _tool(Icons.video_library_outlined, 'Content', _openContentStudio),
            _tool(Icons.android, 'APK', () { setState(() => target = 'apk'); buildProject(); }),
            IconButton(
              tooltip: computerMode ? 'Mobile mode' : 'Computer mode',
              onPressed: () => setState(() => computerMode = !computerMode),
              icon: Icon(
                  computerMode ? Icons.phone_android : Icons.desktop_windows),
            ),
          ],
        ),
      );

  Widget _tool(IconData icon, String label, VoidCallback action) =>
      TextButton.icon(
        onPressed: busy ? null : action,
        icon: Icon(icon, size: 17),
        label: Text(label, style: const TextStyle(fontSize: 11)),
      );

  Widget _chip(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
            color: const Color(0xFF25272D),
            borderRadius: BorderRadius.circular(6)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.account_tree_outlined, size: 14),
          const SizedBox(width: 5),
          Text(text, style: const TextStyle(fontSize: 11)),
        ]),
      );

  void _message(String value) => setState(() => status = value);

  Widget _desktopLayout() => Row(children: [
        SizedBox(width: 225, child: _explorer()),
        Expanded(
          flex: 5,
          child: Column(children: [
            _editorTabs(),
            Expanded(child: _editor()),
            _bottomPanel(),
          ]),
        ),
        SizedBox(width: 385, child: _preview()),
      ]);

  Widget _mobileLayout() => Column(children: [
        _editorTabs(),
        Expanded(
          child: panel == 'preview'
              ? _preview()
              : panel == 'devtools'
                  ? _devtools()
                  : panel == 'terminal'
                      ? _terminalPanel()
                      : panel == 'tools'
                          ? _flutterTools()
                          : _editor(),
        ),
        _mobileNavigation(),
      ]);


  Widget _flutterTools() => Container(
        color: const Color(0xFF111216),
        padding: const EdgeInsets.all(12),
        child: ListView(children: [
          _toolGroup('FLUTTER CLI', Icons.flutter_dash, [
            ['Version', Icons.info_outline, 'flutter --version'],
            ['Help', Icons.help_outline, 'flutter --help --verbose'],
            ['Create Web', Icons.language, 'flutter create --platforms=web .'],
            ['Analyze', Icons.rule, 'flutter analyze'],
            ['Test', Icons.science, 'flutter test'],
            ['Format', Icons.format_align_left, 'dart format .'],
            ['Dart Fix', Icons.auto_fix_high, 'dart fix --dry-run'],
            ['Clean', Icons.cleaning_services, 'flutter clean'],
            ['Doctor', Icons.health_and_safety, 'flutter doctor -v'],
            ['Packages', Icons.extension, 'flutter pub deps'],
            ['Pub Get', Icons.download, 'flutter pub get'],
            ['Pub Upgrade', Icons.upgrade, 'flutter pub upgrade'],
            ['Outdated', Icons.update, 'flutter pub outdated'],
            ['Devices', Icons.devices, 'flutter devices'],
            ['Emulators', Icons.smartphone, 'flutter emulators'],
            ['Custom Devices', Icons.settings_input_component, 'flutter custom-devices list'],
            ['Logs', Icons.article, 'flutter logs'],
            ['Screenshot', Icons.photo_camera, 'flutter screenshot'],
            ['Generate l10n', Icons.translate, 'flutter gen-l10n'],
            ['Precache', Icons.cached, 'flutter precache'],
            ['Config', Icons.settings, 'flutter config --list'],
            ['Channel', Icons.alt_route, 'flutter channel'],
            ['Build APK', Icons.android, 'flutter build apk --release'],
            ['Build AAB', Icons.inventory_2, 'flutter build appbundle --release'],
            ['Build Web', Icons.web, 'flutter build web --release'],
            ['Run Chrome', Icons.play_arrow, 'flutter run -d chrome --web-run-headless'],
            ['Attach', Icons.link, 'flutter attach'],
            ['Drive', Icons.drive_eta, 'flutter drive'],
            ['Install', Icons.install_mobile, 'flutter install'],
            ['Integration Test', Icons.integration_instructions, 'flutter test integration_test'],
            ['Coverage', Icons.analytics, 'flutter test --coverage'],
            ['Assemble', Icons.build_circle, 'flutter assemble'],
            ['Symbolize', Icons.bug_report, 'flutter symbolize --help'],
          ]),
          _toolGroup('DART TOOLCHAIN', Icons.code, [
            ['Dart Version', Icons.info, 'dart --version'],
            ['Dart Analyze', Icons.rule, 'dart analyze'],
            ['Dart Format', Icons.format_align_left, 'dart format .'],
            ['Dart Fix', Icons.auto_fix_high, 'dart fix --dry-run'],
            ['Dart Test', Icons.science, 'dart test'],
            ['Dart Pub Get', Icons.download, 'dart pub get'],
            ['Dart Pub Outdated', Icons.update, 'dart pub outdated'],
            ['Dart Compile', Icons.memory, 'dart compile exe --help'],
            ['DevTools', Icons.speed, 'dart devtools'],
          ]),
          _toolGroup('3D STUDIO', Icons.view_in_ar, [
            ['Check 3D Toolchain', Icons.health_and_safety, '__toolchain_check__'],
            ['Blender Version', Icons.view_in_ar, 'blender --version'],
            ['Blender Headless', Icons.auto_awesome, 'blender --background --version'],
            ['Python 3D', Icons.code, 'python3 --version'],
            ['List 3D Assets', Icons.folder_special, 'find . -maxdepth 4 -type f -name "*.glb" -o -name "*.gltf" -o -name "*.obj" -o -name "*.fbx"'],
          ]),
          _toolGroup('GAME ENGINE LAB', Icons.sports_esports, [
            ['Engine Status', Icons.health_and_safety, '__toolchain_check__'],
            ['Godot Version', Icons.sports_esports, 'godot --version'],
            ['Godot Headless Check', Icons.terminal, 'godot --headless --editor --quit'],
            ['Godot Project Check', Icons.rule, 'godot --headless --path . --editor --quit'],
            ['Game Assets', Icons.folder_copy, 'find . -maxdepth 4 -type f -name "*.tscn" -o -name "*.godot" -o -name "*.glb" -o -name "*.gltf"'],
          ]),
          _toolGroup('APP + WEB PLATFORM', Icons.apps, [
            ['Backend Health', Icons.health_and_safety, 'node --version'],
            ['Video Pipeline', Icons.video_library, 'python3 --version'],
            ['Storage Check', Icons.storage, 'find . -maxdepth 3 -type d -name "uploads" -o -name "storage"'],
            ['API Project Check', Icons.api, 'find . -maxdepth 3 -type f -name "package.json" -o -name "openapi.yaml" -o -name "schema.prisma"'],
          ]),
          _toolGroup('CONTENT ENGINE', Icons.video_library, [
            ['Short Video Feed', Icons.smartphone, '__content_short__'],
            ['Long Video Feed', Icons.ondemand_video, '__content_long__'],
            ['Mixed Feed', Icons.video_library, '__content_mixed__'],
            ['Content Studio', Icons.video_settings, '__content_studio__'],
            ['Media Assets', Icons.perm_media, 'find . -maxdepth 4 -type f -name "*.mp4" -o -name "*.webm" -o -name "*.mov" -o -name "*.jpg" -o -name "*.png"'],
          ]),
          _toolGroup('AAA GAME STUDIO', Icons.videogame_asset, [
            ['World Builder', Icons.public, '__game_world__'],
            ['Terrain', Icons.terrain, '__game_terrain__'],
            ['Characters', Icons.person, '__game_characters__'],
            ['Combat System', Icons.gps_fixed, '__game_combat__'],
            ['Weapons', Icons.my_location, '__game_weapons__'],
            ['Vehicles', Icons.directions_car, '__game_vehicles__'],
            ['Enemy AI', Icons.smart_toy, '__game_ai__'],
            ['Navigation', Icons.route, '__game_navigation__'],
            ['Animation', Icons.animation, '__game_animation__'],
            ['Cinematics', Icons.movie, '__game_cinematics__'],
            ['VFX', Icons.auto_awesome, '__game_vfx__'],
            ['3D Audio', Icons.surround_sound, '__game_audio__'],
            ['Multiplayer', Icons.public, '__game_multiplayer__'],
            ['Dedicated Server', Icons.dns, '__server_studio__'],
            ['Matchmaking', Icons.groups, '__server_matchmaking__'],
            ['Anti-Cheat', Icons.security, '__server_anticheat__'],
            ['Profiler', Icons.speed, '__game_profiler__'],
            ['QA Tests', Icons.bug_report, '__game_qa__'],
          ]),
          _toolGroup('ONLINE GAME SERVERS', Icons.dns, [
            ['Server Status', Icons.health_and_safety, '__server_status__'],
            ['Dedicated Server', Icons.dns, '__server_studio__'],
            ['Matchmaking', Icons.shuffle, '__server_matchmaking__'],
            ['Lobby', Icons.meeting_room, '__server_lobby__'],
            ['Replication', Icons.sync, '__server_replication__'],
            ['Lag Compensation', Icons.network_check, '__server_network__'],
            ['Reconnect', Icons.refresh, '__server_reconnect__'],
            ['Anti-Cheat', Icons.shield, '__server_anticheat__'],
            ['Player Data', Icons.storage, '__server_data__'],
            ['Leaderboards', Icons.leaderboard, '__server_leaderboard__'],
            ['Server Logs', Icons.receipt_long, '__server_logs__'],
            ['Server Metrics', Icons.analytics, '__server_metrics__'],
            ['Autoscaling', Icons.auto_graph, '__server_scale__'],
          ]),
          _toolGroup('GAME BACKEND', Icons.cloud, [
            ['Accounts', Icons.account_circle, '__backend_accounts__'],
            ['Inventory', Icons.inventory_2, '__backend_inventory__'],
            ['Progression', Icons.trending_up, '__backend_progression__'],
            ['Friends', Icons.people, '__backend_friends__'],
            ['Cloud Save', Icons.cloud_upload, '__backend_save__'],
            ['Match History', Icons.history, '__backend_history__'],
            ['Chat', Icons.chat, '__backend_chat__'],
            ['Analytics', Icons.analytics, '__backend_analytics__'],
          ]),
          _toolGroup('GAME PRODUCTION', Icons.sports_esports, [
            ['Game Project Check', Icons.rule, 'godot --headless --path . --editor --quit'],
            ['Import Assets', Icons.inventory_2, 'godot --headless --path . --editor --quit --import'],
            ['3D Asset Check', Icons.view_in_ar, 'blender --background --version'],
            ['Game Test', Icons.play_circle, 'godot --headless --path . --quit'],
          ]),
          _toolGroup('QUALITY + GIT', Icons.verified, [
            ['Git Status', Icons.account_tree, 'git status --short'],
            ['Git Diff', Icons.compare_arrows, 'git diff --stat'],
            ['Git Branches', Icons.call_split, 'git branch --all'],
            ['Git Log', Icons.history, 'git log -10 --oneline'],
            ['Flutter Doctor', Icons.health_and_safety, 'flutter doctor -v'],
          ]),
          const SizedBox(height: 14),
          const Text('PROJECT TARGET', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _targetButton('APK', 'apk', Icons.android)),
            const SizedBox(width: 8),
            Expanded(child: _targetButton('AAB', 'aab', Icons.inventory_2)),
            const SizedBox(width: 8),
            Expanded(child: _targetButton('WEB', 'web', Icons.web))
          ]),
          const SizedBox(height: 14),
          Text('Target: ' + target.toUpperCase(), style: const TextStyle(fontSize: 11, color: Color(0xFF9EA3AE)))
        ]));

  Widget _toolGroup(String title, IconData icon, List<List<dynamic>> tools) =>
      Card(
        color: const Color(0xFF181A1F),
        margin: const EdgeInsets.only(bottom: 10),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(icon, size: 17),
              const SizedBox(width: 7),
              Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 9),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: tools.map((t) => _toolButton(t[0] as String, t[1] as IconData, t[2] as String)).toList(),
            ),
          ]),
        ),
      );

  Widget _toolButton(String label, IconData icon, String command) => OutlinedButton.icon(
        onPressed: busy ? null : () {
          if (command == '__content_studio__') {
            _openContentStudio();
            return;
          }
          if (command == '__content_short__' || command == '__content_long__' || command == '__content_mixed__') {
            final kind = command == '__content_short__' ? 'short-video' : command == '__content_long__' ? 'long-video' : 'mixed-video';
            request('POST', '/v1/content/feed-plan', data: {'kind': kind}).then((r) {
              if (mounted) setState(() => status = 'Content feed ready: ${r['source']?['name'] ?? kind}');
            }).catchError((e) {
              if (mounted) setState(() => status = 'Content feed error: $e');
            });
            return;
          }
          const gameCommands = <String, String>{
            '__game_world__':'godot --headless --path . --editor --quit',
            '__game_terrain__':'find . -maxdepth 4 -type f | grep -E '\\.(tscn|glb|gltf|obj|fbx)
          runCommand();
        },
        icon: Icon(icon, size: 16),
        label: Text(label, style: const TextStyle(fontSize: 11)));

  Widget _targetButton(String label, String value, IconData icon) => ElevatedButton.icon(
        onPressed: busy ? null : () => setState(() => target = value),
        icon: Icon(icon, size: 15),
        label: Text(label, style: const TextStyle(fontSize: 10)));

  Widget _explorer() => Container(
        color: const Color(0xFF17181C),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _sectionHeader('EXPLORER', Icons.folder_open),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(children: [
              Expanded(child: Text(treePath.isEmpty ? 'Workspace' : treePath,
                  overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11))),
              IconButton(tooltip: 'Refresh', onPressed: busy ? null : () => _loadTree(),
                  icon: const Icon(Icons.refresh, size: 17)),
            ]),
          ),
          if (treePath.isNotEmpty)
            ListTile(dense: true, leading: const Icon(Icons.arrow_upward, size: 16),
              title: const Text('..', style: TextStyle(fontSize: 12)),
              onTap: () { final parts = treePath.split('/')..removeLast(); _loadTree(parts.join('/')); }),
          Expanded(
            child: ListView.builder(
              itemCount: treeEntries.length,
              itemBuilder: (_, i) {
                final e = treeEntries[i];
                final isDir = e['type'] == 'directory';
                return ListTile(
                  dense: true,
                  leading: Icon(isDir ? Icons.folder : Icons.code, size: 16),
                  title: Text(e['name']?.toString() ?? '', overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12)),
                  onTap: () {
                    final p = e['path']?.toString() ?? '';
                    if (isDir) { _loadTree(p); } else { path.text = p; openFile(); }
                  },
                );
              },
            ),
          ),
        ]),
      );

  Widget _tree(String label, int indent, IconData icon, bool selected) =>
      Container(
        color: selected ? const Color(0xFF263248) : null,
        padding: EdgeInsets.only(left: 10 + indent * 13.0, top: 6, bottom: 6),
        child: Row(children: [
          Icon(icon, size: 16),
          const SizedBox(width: 7),
          Expanded(
              child: Text(label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12))),
          if (icon == Icons.folder)
            const Icon(Icons.chevron_right, size: 14),
        ]),
      );

  Widget _editorTabs() => Container(
        height: 38,
        color: const Color(0xFF1D1F24),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: const BoxDecoration(
              color: Color(0xFF101114),
              border: Border(top: BorderSide(color: Color(0xFF64B5F6))),
            ),
            child: const Row(children: [
              Icon(Icons.code, size: 15),
              SizedBox(width: 7),
              Text('main.dart', style: TextStyle(fontSize: 12)),
              SizedBox(width: 10),
              Text('×', style: TextStyle(color: Colors.grey)),
            ]),
          ),
          const Spacer(),
          IconButton(
              tooltip: 'Open',
              onPressed: busy ? null : openFile,
              icon: const Icon(Icons.folder_open, size: 17)),
          IconButton(
              tooltip: 'Save',
              onPressed: busy ? null : saveFile,
              icon: const Icon(Icons.save_outlined, size: 17)),
        ]),
      );

  Widget _editor() => Container(
        color: const Color(0xFF101114),
        child: Stack(
          children: [
            Positioned.fill(
              child: TextField(
                controller: code,
                expands: true,
                maxLines: null,
                minLines: null,
                keyboardType: TextInputType.multiline,
                textAlignVertical: TextAlignVertical.top,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  height: 1.45,
                  color: Color(0xFFE6E6E6),
                ),
                decoration: const InputDecoration(
                  hintText: "// اكتب كود Flutter / Dart هنا...\\n\\nimport 'package:flutter/material.dart';",
                  hintStyle: TextStyle(fontFamily: 'monospace', fontSize: 13, color: Color(0xFF666A73)),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.fromLTRB(54, 14, 14, 24),
                ),
              ),
            ),
            Positioned(
              left: 0, top: 0, bottom: 0, width: 44,
              child: IgnorePointer(
                child: Container(
                  color: const Color(0xFF15161A),
                  alignment: Alignment.topRight,
                  padding: const EdgeInsets.only(right: 8, top: 14),
                  child: ValueListenableBuilder<TextEditingValue>(
                    valueListenable: code,
                    builder: (_, value, __) {
                      final lines = (value.text.isEmpty ? 1 : '\\n'.allMatches(value.text).length + 1);
                      return SingleChildScrollView(
                        physics: const NeverScrollableScrollPhysics(),
                        child: Text(
                          List.generate(lines, (i) => (i + 1).toString()).join('\\n'),
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.45, color: Color(0xFF555963)),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
            Positioned(
              right: 10, top: 8,
              child: DecoratedBox(
                decoration: BoxDecoration(color: const Color(0xFF25272D), borderRadius: BorderRadius.circular(6)),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  child: Text('Dart • Flutter', style: TextStyle(fontSize: 10)),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _artifactPanel() => Container(
        color: const Color(0xFF17181C),
        padding: const EdgeInsets.all(10),
        child: Row(children: [
          const Icon(Icons.android, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(
            artifacts.isEmpty ? 'APK: بعد نجاح Build راح يظهر الـArtifact هنا' :
              'APK جاهز: ' + artifacts.map((a) => a['name']?.toString() ?? 'artifact').join(', '),
            style: const TextStyle(fontSize: 11),
          )),
          if (artifacts.isNotEmpty)
            IconButton(
              tooltip: 'فتح Artifact',
              icon: const Icon(Icons.open_in_new, size: 18),
              onPressed: () async {
                final url = artifacts.first['downloadUrl']?.toString();
                if (url != null && await canLaunchUrl(Uri.parse(url))) {
                  await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                }
              },
            ),
        ]),
      );

  Widget _preview() => Container(
        color: const Color(0xFF17181C),
        child: Column(children: [
          _sectionHeader('FLUTTER PREVIEW', Icons.phone_android),
          _artifactPanel(),
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(26, 8, 26, 18),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: const Color(0xFF0B0C0E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF3A3D44)),
              ),
              child: previewController == null
                  ? const Center(child: Text('Press Run to start the real Flutter debug preview'))
                  : WebViewWidget(controller: previewController!),
            ),
          ),
        ]),
      );

  Widget _bottomPanel() => SizedBox(
        height: 185,
        child: Column(children: [
          Row(children: [
            _panelTab('TERMINAL', 'terminal'),
            _panelTab('PROBLEMS', 'problems'),
            _panelTab('OUTPUT', 'output'),
            _panelTab('DEBUG CONSOLE', 'debug'),
            _panelTab('DEVTOOLS', 'devtools'),
            const Spacer(),
          ]),
          Expanded(child: panel == 'devtools' ? _devtools() : _terminalPanel()),
        ]),
      );

  Widget _devtools() => Container(
        color: const Color(0xFF0D0E10),
        child: devtoolsController == null
            ? const Center(child: Text('Start Debug to connect Flutter DevTools'))
            : WebViewWidget(controller: devtoolsController!),
      );

  Widget _panelTab(String label, String id) => TextButton(
        onPressed: () => setState(() => panel = id),
        child: Text(label,
            style: TextStyle(
                fontSize: 10,
                color: panel == id
                    ? Colors.white
                    : const Color(0xFF8D919A))),
      );

  Widget _terminalPanel() => Container(
        color: const Color(0xFF0D0E10),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Column(children: [
          Expanded(
            child: SingleChildScrollView(
              reverse: true,
              child: Align(
                alignment: Alignment.topLeft,
                child: Text(status,
                    style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: Color(0xFFB8BDC7))),
              ),
            ),
          ),
          Row(children: [
            const Text(r'$ ', style: TextStyle(fontFamily: 'monospace')),
            Expanded(
              child: TextField(
                controller: terminal,
                onSubmitted: (_) => runCommand(),
                style:
                    const TextStyle(fontFamily: 'monospace', fontSize: 12),
                decoration: const InputDecoration(
                    hintText: 'flutter analyze',
                    border: InputBorder.none,
                    isDense: true),
              ),
            ),
            IconButton(
                onPressed: busy ? null : runCommand,
                icon: const Icon(Icons.play_arrow, size: 18)),
          ]),
        ]),
      );

  Widget _mobileNavigation() => Container(
        height: 54,
        color: const Color(0xFF18191D),
        child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _nav(Icons.code, 'Code', 'editor'),
              _nav(Icons.phone_android, 'Preview', 'preview'),
              _nav(Icons.terminal, 'Terminal', 'terminal'),
              _nav(Icons.build_circle, 'Flutter', 'tools'),
              _nav(Icons.account_tree, 'Inspector', 'devtools'),
              IconButton(
                  tooltip: 'Computer mode',
                  onPressed: () => setState(() => computerMode = true),
                  icon: const Icon(Icons.desktop_windows)),
            ]),
      );

  Widget _nav(IconData icon, String label, String id) => TextButton(
        onPressed: () => setState(() => panel = id),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 18),
          Text(label, style: const TextStyle(fontSize: 9)),
        ]),
      );

  Widget _sectionHeader(String label, IconData icon) => SizedBox(
        height: 38,
        child: Row(children: [
          const SizedBox(width: 12),
          Icon(icon, size: 16),
          const SizedBox(width: 7),
          Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: .6)),
        ]),
      );

  Widget _statusBar() => Container(
        height: 26,
        color: const Color(0xFF24262B),
        child: Row(children: [
          const SizedBox(width: 10),
          Icon(busy ? Icons.sync : Icons.check_circle_outline, size: 13),
          const SizedBox(width: 6),
          Expanded(
              child: Text(busy ? 'Working...' : status,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10))),
          Text(target.toUpperCase(), style: const TextStyle(fontSize: 10)),
          const SizedBox(width: 10),
        ]),
      );
}
 | head -200',
            '__game_characters__':'find . -maxdepth 5 -type f | grep -Ei 'character|player|npc|enemy' | head -200',
            '__game_combat__':'find . -maxdepth 5 -type f | grep -Ei 'combat|weapon|damage|health' | head -200',
            '__game_weapons__':'find . -maxdepth 5 -type f | grep -Ei 'weapon|gun|rifle|ammo' | head -200',
            '__game_vehicles__':'find . -maxdepth 5 -type f | grep -Ei 'vehicle|car|truck' | head -200',
            '__game_ai__':'find . -maxdepth 5 -type f | grep -Ei 'ai|enemy|npc|behavior' | head -200',
            '__game_navigation__':'find . -maxdepth 5 -type f | grep -Ei 'navigation|path|navmesh' | head -200',
            '__game_animation__':'find . -maxdepth 5 -type f | grep -Ei 'animation|anim|rig' | head -200',
            '__game_cinematics__':'find . -maxdepth 5 -type f | grep -Ei 'cutscene|cinematic|dialog' | head -200',
            '__game_vfx__':'find . -maxdepth 5 -type f | grep -Ei 'vfx|particle|effect' | head -200',
            '__game_audio__':'find . -maxdepth 5 -type f | grep -Ei '\\.(wav|ogg|mp3)
          runCommand();
        },
        icon: Icon(icon, size: 16),
        label: Text(label, style: const TextStyle(fontSize: 11)));

  Widget _targetButton(String label, String value, IconData icon) => ElevatedButton.icon(
        onPressed: busy ? null : () => setState(() => target = value),
        icon: Icon(icon, size: 15),
        label: Text(label, style: const TextStyle(fontSize: 10)));

  Widget _explorer() => Container(
        color: const Color(0xFF17181C),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _sectionHeader('EXPLORER', Icons.folder_open),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(children: [
              Expanded(child: Text(treePath.isEmpty ? 'Workspace' : treePath,
                  overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11))),
              IconButton(tooltip: 'Refresh', onPressed: busy ? null : () => _loadTree(),
                  icon: const Icon(Icons.refresh, size: 17)),
            ]),
          ),
          if (treePath.isNotEmpty)
            ListTile(dense: true, leading: const Icon(Icons.arrow_upward, size: 16),
              title: const Text('..', style: TextStyle(fontSize: 12)),
              onTap: () { final parts = treePath.split('/')..removeLast(); _loadTree(parts.join('/')); }),
          Expanded(
            child: ListView.builder(
              itemCount: treeEntries.length,
              itemBuilder: (_, i) {
                final e = treeEntries[i];
                final isDir = e['type'] == 'directory';
                return ListTile(
                  dense: true,
                  leading: Icon(isDir ? Icons.folder : Icons.code, size: 16),
                  title: Text(e['name']?.toString() ?? '', overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12)),
                  onTap: () {
                    final p = e['path']?.toString() ?? '';
                    if (isDir) { _loadTree(p); } else { path.text = p; openFile(); }
                  },
                );
              },
            ),
          ),
        ]),
      );

  Widget _tree(String label, int indent, IconData icon, bool selected) =>
      Container(
        color: selected ? const Color(0xFF263248) : null,
        padding: EdgeInsets.only(left: 10 + indent * 13.0, top: 6, bottom: 6),
        child: Row(children: [
          Icon(icon, size: 16),
          const SizedBox(width: 7),
          Expanded(
              child: Text(label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12))),
          if (icon == Icons.folder)
            const Icon(Icons.chevron_right, size: 14),
        ]),
      );

  Widget _editorTabs() => Container(
        height: 38,
        color: const Color(0xFF1D1F24),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: const BoxDecoration(
              color: Color(0xFF101114),
              border: Border(top: BorderSide(color: Color(0xFF64B5F6))),
            ),
            child: const Row(children: [
              Icon(Icons.code, size: 15),
              SizedBox(width: 7),
              Text('main.dart', style: TextStyle(fontSize: 12)),
              SizedBox(width: 10),
              Text('×', style: TextStyle(color: Colors.grey)),
            ]),
          ),
          const Spacer(),
          IconButton(
              tooltip: 'Open',
              onPressed: busy ? null : openFile,
              icon: const Icon(Icons.folder_open, size: 17)),
          IconButton(
              tooltip: 'Save',
              onPressed: busy ? null : saveFile,
              icon: const Icon(Icons.save_outlined, size: 17)),
        ]),
      );

  Widget _editor() => Container(
        color: const Color(0xFF101114),
        child: Stack(
          children: [
            Positioned.fill(
              child: TextField(
                controller: code,
                expands: true,
                maxLines: null,
                minLines: null,
                keyboardType: TextInputType.multiline,
                textAlignVertical: TextAlignVertical.top,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  height: 1.45,
                  color: Color(0xFFE6E6E6),
                ),
                decoration: const InputDecoration(
                  hintText: "// اكتب كود Flutter / Dart هنا...\\n\\nimport 'package:flutter/material.dart';",
                  hintStyle: TextStyle(fontFamily: 'monospace', fontSize: 13, color: Color(0xFF666A73)),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.fromLTRB(54, 14, 14, 24),
                ),
              ),
            ),
            Positioned(
              left: 0, top: 0, bottom: 0, width: 44,
              child: IgnorePointer(
                child: Container(
                  color: const Color(0xFF15161A),
                  alignment: Alignment.topRight,
                  padding: const EdgeInsets.only(right: 8, top: 14),
                  child: ValueListenableBuilder<TextEditingValue>(
                    valueListenable: code,
                    builder: (_, value, __) {
                      final lines = (value.text.isEmpty ? 1 : '\\n'.allMatches(value.text).length + 1);
                      return SingleChildScrollView(
                        physics: const NeverScrollableScrollPhysics(),
                        child: Text(
                          List.generate(lines, (i) => (i + 1).toString()).join('\\n'),
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.45, color: Color(0xFF555963)),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
            Positioned(
              right: 10, top: 8,
              child: DecoratedBox(
                decoration: BoxDecoration(color: const Color(0xFF25272D), borderRadius: BorderRadius.circular(6)),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  child: Text('Dart • Flutter', style: TextStyle(fontSize: 10)),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _artifactPanel() => Container(
        color: const Color(0xFF17181C),
        padding: const EdgeInsets.all(10),
        child: Row(children: [
          const Icon(Icons.android, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(
            artifacts.isEmpty ? 'APK: بعد نجاح Build راح يظهر الـArtifact هنا' :
              'APK جاهز: ' + artifacts.map((a) => a['name']?.toString() ?? 'artifact').join(', '),
            style: const TextStyle(fontSize: 11),
          )),
          if (artifacts.isNotEmpty)
            IconButton(
              tooltip: 'فتح Artifact',
              icon: const Icon(Icons.open_in_new, size: 18),
              onPressed: () async {
                final url = artifacts.first['downloadUrl']?.toString();
                if (url != null && await canLaunchUrl(Uri.parse(url))) {
                  await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                }
              },
            ),
        ]),
      );

  Widget _preview() => Container(
        color: const Color(0xFF17181C),
        child: Column(children: [
          _sectionHeader('FLUTTER PREVIEW', Icons.phone_android),
          _artifactPanel(),
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(26, 8, 26, 18),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: const Color(0xFF0B0C0E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF3A3D44)),
              ),
              child: previewController == null
                  ? const Center(child: Text('Press Run to start the real Flutter debug preview'))
                  : WebViewWidget(controller: previewController!),
            ),
          ),
        ]),
      );

  Widget _bottomPanel() => SizedBox(
        height: 185,
        child: Column(children: [
          Row(children: [
            _panelTab('TERMINAL', 'terminal'),
            _panelTab('PROBLEMS', 'problems'),
            _panelTab('OUTPUT', 'output'),
            _panelTab('DEBUG CONSOLE', 'debug'),
            _panelTab('DEVTOOLS', 'devtools'),
            const Spacer(),
          ]),
          Expanded(child: panel == 'devtools' ? _devtools() : _terminalPanel()),
        ]),
      );

  Widget _devtools() => Container(
        color: const Color(0xFF0D0E10),
        child: devtoolsController == null
            ? const Center(child: Text('Start Debug to connect Flutter DevTools'))
            : WebViewWidget(controller: devtoolsController!),
      );

  Widget _panelTab(String label, String id) => TextButton(
        onPressed: () => setState(() => panel = id),
        child: Text(label,
            style: TextStyle(
                fontSize: 10,
                color: panel == id
                    ? Colors.white
                    : const Color(0xFF8D919A))),
      );

  Widget _terminalPanel() => Container(
        color: const Color(0xFF0D0E10),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Column(children: [
          Expanded(
            child: SingleChildScrollView(
              reverse: true,
              child: Align(
                alignment: Alignment.topLeft,
                child: Text(status,
                    style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: Color(0xFFB8BDC7))),
              ),
            ),
          ),
          Row(children: [
            const Text(r'$ ', style: TextStyle(fontFamily: 'monospace')),
            Expanded(
              child: TextField(
                controller: terminal,
                onSubmitted: (_) => runCommand(),
                style:
                    const TextStyle(fontFamily: 'monospace', fontSize: 12),
                decoration: const InputDecoration(
                    hintText: 'flutter analyze',
                    border: InputBorder.none,
                    isDense: true),
              ),
            ),
            IconButton(
                onPressed: busy ? null : runCommand,
                icon: const Icon(Icons.play_arrow, size: 18)),
          ]),
        ]),
      );

  Widget _mobileNavigation() => Container(
        height: 54,
        color: const Color(0xFF18191D),
        child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _nav(Icons.code, 'Code', 'editor'),
              _nav(Icons.phone_android, 'Preview', 'preview'),
              _nav(Icons.terminal, 'Terminal', 'terminal'),
              _nav(Icons.build_circle, 'Flutter', 'tools'),
              _nav(Icons.account_tree, 'Inspector', 'devtools'),
              IconButton(
                  tooltip: 'Computer mode',
                  onPressed: () => setState(() => computerMode = true),
                  icon: const Icon(Icons.desktop_windows)),
            ]),
      );

  Widget _nav(IconData icon, String label, String id) => TextButton(
        onPressed: () => setState(() => panel = id),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 18),
          Text(label, style: const TextStyle(fontSize: 9)),
        ]),
      );

  Widget _sectionHeader(String label, IconData icon) => SizedBox(
        height: 38,
        child: Row(children: [
          const SizedBox(width: 12),
          Icon(icon, size: 16),
          const SizedBox(width: 7),
          Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: .6)),
        ]),
      );

  Widget _statusBar() => Container(
        height: 26,
        color: const Color(0xFF24262B),
        child: Row(children: [
          const SizedBox(width: 10),
          Icon(busy ? Icons.sync : Icons.check_circle_outline, size: 13),
          const SizedBox(width: 6),
          Expanded(
              child: Text(busy ? 'Working...' : status,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10))),
          Text(target.toUpperCase(), style: const TextStyle(fontSize: 10)),
          const SizedBox(width: 10),
        ]),
      );
}
 | head -200',
            '__game_multiplayer__':'git status --short',
            '__server_studio__':'node --version && python3 --version',
            '__server_status__':'node --version',
            '__server_matchmaking__':'find . -maxdepth 5 -type f | grep -Ei 'match|lobby|server' | head -200',
            '__server_lobby__':'find . -maxdepth 5 -type f | grep -Ei 'lobby|room|match' | head -200',
            '__server_replication__':'find . -maxdepth 5 -type f | grep -Ei 'replic|network|rpc' | head -200',
            '__server_network__':'find . -maxdepth 5 -type f | grep -Ei 'network|latency|ping' | head -200',
            '__server_reconnect__':'find . -maxdepth 5 -type f | grep -Ei 'reconnect|session' | head -200',
            '__server_anticheat__':'find . -maxdepth 5 -type f | grep -Ei 'anti.?cheat|security' | head -200',
            '__server_data__':'find . -maxdepth 5 -type f | grep -Ei 'database|postgres|redis|player' | head -200',
            '__server_leaderboard__':'find . -maxdepth 5 -type f | grep -Ei 'leaderboard|ranking|score' | head -200',
            '__server_logs__':'find . -maxdepth 5 -type f | grep -Ei 'log|logger' | head -200',
            '__server_metrics__':'find . -maxdepth 5 -type f | grep -Ei 'metric|telemetry|analytics' | head -200',
            '__server_scale__':'find . -maxdepth 5 -type f | grep -Ei 'docker|kubernetes|railway|terraform' | head -200',
            '__backend_accounts__':'find . -maxdepth 5 -type f | grep -Ei 'auth|account|user' | head -200',
            '__backend_inventory__':'find . -maxdepth 5 -type f | grep -Ei 'inventory|item|skin' | head -200',
            '__backend_progression__':'find . -maxdepth 5 -type f | grep -Ei 'xp|level|progress' | head -200',
            '__backend_friends__':'find . -maxdepth 5 -type f | grep -Ei 'friend|party' | head -200',
            '__backend_save__':'find . -maxdepth 5 -type f | grep -Ei 'save|storage|database' | head -200',
            '__backend_history__':'find . -maxdepth 5 -type f | grep -Ei 'history|match' | head -200',
            '__backend_chat__':'find . -maxdepth 5 -type f | grep -Ei 'chat|message' | head -200',
            '__backend_analytics__':'find . -maxdepth 5 -type f | grep -Ei 'analytics|event|metric' | head -200',
          };
          if (gameCommands[command]) {
            terminal.text = gameCommands[command]!;
          } else {
            terminal.text = command == '__toolchain_check__' ? 'toolchain status' : command;
          }
          runCommand();
        },
        icon: Icon(icon, size: 16),
        label: Text(label, style: const TextStyle(fontSize: 11)));

  Widget _targetButton(String label, String value, IconData icon) => ElevatedButton.icon(
        onPressed: busy ? null : () => setState(() => target = value),
        icon: Icon(icon, size: 15),
        label: Text(label, style: const TextStyle(fontSize: 10)));

  Widget _explorer() => Container(
        color: const Color(0xFF17181C),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _sectionHeader('EXPLORER', Icons.folder_open),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(children: [
              Expanded(child: Text(treePath.isEmpty ? 'Workspace' : treePath,
                  overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11))),
              IconButton(tooltip: 'Refresh', onPressed: busy ? null : () => _loadTree(),
                  icon: const Icon(Icons.refresh, size: 17)),
            ]),
          ),
          if (treePath.isNotEmpty)
            ListTile(dense: true, leading: const Icon(Icons.arrow_upward, size: 16),
              title: const Text('..', style: TextStyle(fontSize: 12)),
              onTap: () { final parts = treePath.split('/')..removeLast(); _loadTree(parts.join('/')); }),
          Expanded(
            child: ListView.builder(
              itemCount: treeEntries.length,
              itemBuilder: (_, i) {
                final e = treeEntries[i];
                final isDir = e['type'] == 'directory';
                return ListTile(
                  dense: true,
                  leading: Icon(isDir ? Icons.folder : Icons.code, size: 16),
                  title: Text(e['name']?.toString() ?? '', overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12)),
                  onTap: () {
                    final p = e['path']?.toString() ?? '';
                    if (isDir) { _loadTree(p); } else { path.text = p; openFile(); }
                  },
                );
              },
            ),
          ),
        ]),
      );

  Widget _tree(String label, int indent, IconData icon, bool selected) =>
      Container(
        color: selected ? const Color(0xFF263248) : null,
        padding: EdgeInsets.only(left: 10 + indent * 13.0, top: 6, bottom: 6),
        child: Row(children: [
          Icon(icon, size: 16),
          const SizedBox(width: 7),
          Expanded(
              child: Text(label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12))),
          if (icon == Icons.folder)
            const Icon(Icons.chevron_right, size: 14),
        ]),
      );

  Widget _editorTabs() => Container(
        height: 38,
        color: const Color(0xFF1D1F24),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: const BoxDecoration(
              color: Color(0xFF101114),
              border: Border(top: BorderSide(color: Color(0xFF64B5F6))),
            ),
            child: const Row(children: [
              Icon(Icons.code, size: 15),
              SizedBox(width: 7),
              Text('main.dart', style: TextStyle(fontSize: 12)),
              SizedBox(width: 10),
              Text('×', style: TextStyle(color: Colors.grey)),
            ]),
          ),
          const Spacer(),
          IconButton(
              tooltip: 'Open',
              onPressed: busy ? null : openFile,
              icon: const Icon(Icons.folder_open, size: 17)),
          IconButton(
              tooltip: 'Save',
              onPressed: busy ? null : saveFile,
              icon: const Icon(Icons.save_outlined, size: 17)),
        ]),
      );

  Widget _editor() => Container(
        color: const Color(0xFF101114),
        child: Stack(
          children: [
            Positioned.fill(
              child: TextField(
                controller: code,
                expands: true,
                maxLines: null,
                minLines: null,
                keyboardType: TextInputType.multiline,
                textAlignVertical: TextAlignVertical.top,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  height: 1.45,
                  color: Color(0xFFE6E6E6),
                ),
                decoration: const InputDecoration(
                  hintText: "// اكتب كود Flutter / Dart هنا...\\n\\nimport 'package:flutter/material.dart';",
                  hintStyle: TextStyle(fontFamily: 'monospace', fontSize: 13, color: Color(0xFF666A73)),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.fromLTRB(54, 14, 14, 24),
                ),
              ),
            ),
            Positioned(
              left: 0, top: 0, bottom: 0, width: 44,
              child: IgnorePointer(
                child: Container(
                  color: const Color(0xFF15161A),
                  alignment: Alignment.topRight,
                  padding: const EdgeInsets.only(right: 8, top: 14),
                  child: ValueListenableBuilder<TextEditingValue>(
                    valueListenable: code,
                    builder: (_, value, __) {
                      final lines = (value.text.isEmpty ? 1 : '\\n'.allMatches(value.text).length + 1);
                      return SingleChildScrollView(
                        physics: const NeverScrollableScrollPhysics(),
                        child: Text(
                          List.generate(lines, (i) => (i + 1).toString()).join('\\n'),
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.45, color: Color(0xFF555963)),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
            Positioned(
              right: 10, top: 8,
              child: DecoratedBox(
                decoration: BoxDecoration(color: const Color(0xFF25272D), borderRadius: BorderRadius.circular(6)),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  child: Text('Dart • Flutter', style: TextStyle(fontSize: 10)),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _artifactPanel() => Container(
        color: const Color(0xFF17181C),
        padding: const EdgeInsets.all(10),
        child: Row(children: [
          const Icon(Icons.android, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(
            artifacts.isEmpty ? 'APK: بعد نجاح Build راح يظهر الـArtifact هنا' :
              'APK جاهز: ' + artifacts.map((a) => a['name']?.toString() ?? 'artifact').join(', '),
            style: const TextStyle(fontSize: 11),
          )),
          if (artifacts.isNotEmpty)
            IconButton(
              tooltip: 'فتح Artifact',
              icon: const Icon(Icons.open_in_new, size: 18),
              onPressed: () async {
                final url = artifacts.first['downloadUrl']?.toString();
                if (url != null && await canLaunchUrl(Uri.parse(url))) {
                  await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                }
              },
            ),
        ]),
      );

  Widget _preview() => Container(
        color: const Color(0xFF17181C),
        child: Column(children: [
          _sectionHeader('FLUTTER PREVIEW', Icons.phone_android),
          _artifactPanel(),
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(26, 8, 26, 18),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: const Color(0xFF0B0C0E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF3A3D44)),
              ),
              child: previewController == null
                  ? const Center(child: Text('Press Run to start the real Flutter debug preview'))
                  : WebViewWidget(controller: previewController!),
            ),
          ),
        ]),
      );

  Widget _bottomPanel() => SizedBox(
        height: 185,
        child: Column(children: [
          Row(children: [
            _panelTab('TERMINAL', 'terminal'),
            _panelTab('PROBLEMS', 'problems'),
            _panelTab('OUTPUT', 'output'),
            _panelTab('DEBUG CONSOLE', 'debug'),
            _panelTab('DEVTOOLS', 'devtools'),
            const Spacer(),
          ]),
          Expanded(child: panel == 'devtools' ? _devtools() : _terminalPanel()),
        ]),
      );

  Widget _devtools() => Container(
        color: const Color(0xFF0D0E10),
        child: devtoolsController == null
            ? const Center(child: Text('Start Debug to connect Flutter DevTools'))
            : WebViewWidget(controller: devtoolsController!),
      );

  Widget _panelTab(String label, String id) => TextButton(
        onPressed: () => setState(() => panel = id),
        child: Text(label,
            style: TextStyle(
                fontSize: 10,
                color: panel == id
                    ? Colors.white
                    : const Color(0xFF8D919A))),
      );

  Widget _terminalPanel() => Container(
        color: const Color(0xFF0D0E10),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Column(children: [
          Expanded(
            child: SingleChildScrollView(
              reverse: true,
              child: Align(
                alignment: Alignment.topLeft,
                child: Text(status,
                    style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: Color(0xFFB8BDC7))),
              ),
            ),
          ),
          Row(children: [
            const Text(r'$ ', style: TextStyle(fontFamily: 'monospace')),
            Expanded(
              child: TextField(
                controller: terminal,
                onSubmitted: (_) => runCommand(),
                style:
                    const TextStyle(fontFamily: 'monospace', fontSize: 12),
                decoration: const InputDecoration(
                    hintText: 'flutter analyze',
                    border: InputBorder.none,
                    isDense: true),
              ),
            ),
            IconButton(
                onPressed: busy ? null : runCommand,
                icon: const Icon(Icons.play_arrow, size: 18)),
          ]),
        ]),
      );

  Widget _mobileNavigation() => Container(
        height: 54,
        color: const Color(0xFF18191D),
        child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _nav(Icons.code, 'Code', 'editor'),
              _nav(Icons.phone_android, 'Preview', 'preview'),
              _nav(Icons.terminal, 'Terminal', 'terminal'),
              _nav(Icons.build_circle, 'Flutter', 'tools'),
              _nav(Icons.account_tree, 'Inspector', 'devtools'),
              IconButton(
                  tooltip: 'Computer mode',
                  onPressed: () => setState(() => computerMode = true),
                  icon: const Icon(Icons.desktop_windows)),
            ]),
      );

  Widget _nav(IconData icon, String label, String id) => TextButton(
        onPressed: () => setState(() => panel = id),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 18),
          Text(label, style: const TextStyle(fontSize: 9)),
        ]),
      );

  Widget _sectionHeader(String label, IconData icon) => SizedBox(
        height: 38,
        child: Row(children: [
          const SizedBox(width: 12),
          Icon(icon, size: 16),
          const SizedBox(width: 7),
          Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: .6)),
        ]),
      );

  Widget _statusBar() => Container(
        height: 26,
        color: const Color(0xFF24262B),
        child: Row(children: [
          const SizedBox(width: 10),
          Icon(busy ? Icons.sync : Icons.check_circle_outline, size: 13),
          const SizedBox(width: 6),
          Expanded(
              child: Text(busy ? 'Working...' : status,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10))),
          Text(target.toUpperCase(), style: const TextStyle(fontSize: 10)),
          const SizedBox(width: 10),
        ]),
      );
}
