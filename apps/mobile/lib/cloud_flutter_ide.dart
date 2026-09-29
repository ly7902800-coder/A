import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';
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
            await _startDebug();
      setState(() => status = 'Cloud Flutter debug workspace is running');
    } catch (e) {
      setState(() => status = 'Workspace error: ' + e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
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
            _tool(Icons.refresh, 'Hot Reload', () => _debugAction('/v1/flutter/debug/hot-reload', 'Hot Reload')),
            _tool(Icons.restart_alt, 'Hot Restart', () => _debugAction('/v1/flutter/debug/hot-restart', 'Hot Restart')),
            _tool(Icons.build_outlined, 'Build', buildProject),
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
                      : _editor(),
        ),
        _mobileNavigation(),
      ]);

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
              onPressed: () => setState(() => status = 'APK Artifact جاهز داخل GitHub Actions'),
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
