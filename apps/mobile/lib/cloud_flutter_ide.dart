import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  String panel = 'editor';
  String target = 'apk';
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
        'sessionId': sessionId,
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
      });
      setState(() => status = 'Workspace started');
    } catch (e) {
      setState(() => status = 'Workspace error: ' + e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> openFile() async {
    setState(() => busy = true);
    try {
      final r = await request('GET', '/v1/flutter/workspace/file', query: {
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
        'path': path.text.trim(),
      });
      code.text = r['content']?.toString() ?? '';
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
        'repo': repo.text.trim(),
        'baseBranch': base.text.trim(),
        'branch': branch.text.trim(),
      });
      await request('PUT', '/v1/flutter/workspace/file', data: {
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
        'path': path.text.trim(),
        'content': code.text,
        'message': 'Genesis Cloud Flutter edit',
      });
      setState(() => status = 'Saved to GitHub workspace');
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
      final r = await request('POST', '/v1/flutter/worker/command', data: {
        'sessionId': sessionId,
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
        'command': c,
      });
      status = (r['stdout']?.toString() ?? '') + (r['stderr']?.toString() ?? '');
      setState(() {});
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

  Future<void> pollBuild() async {
    try {
      final r = await request('GET', '/v1/flutter/build/status', query: {
        'repo': repo.text.trim(),
        'branch': branch.text.trim(),
      });
      if (r['found'] != true) return;
      if (r['status'] == 'completed') {
        timer?.cancel();
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
            _tool(Icons.bug_report_outlined, 'Debug',
                () => _message('Debug worker requested')),
            _tool(Icons.refresh, 'Hot Reload',
                () => _message('Hot Reload needs a running debug worker')),
            _tool(Icons.restart_alt, 'Hot Restart',
                () => _message('Hot Restart needs a running debug worker')),
            _tool(Icons.build_outlined, 'Build', buildProject),
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
            child: TextField(
              controller: repo,
              style: const TextStyle(fontSize: 12),
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search, size: 17),
                  hintText: 'Search files',
                  isDense: true),
            ),
          ),
          _tree('A', 0, Icons.folder, false),
          _tree('apps', 1, Icons.folder, false),
          _tree('mobile', 2, Icons.folder, false),
          _tree('lib', 3, Icons.folder, false),
          _tree('main.dart', 4, Icons.code, true),
          _tree('screens', 4, Icons.folder, false),
          _tree('widgets', 4, Icons.folder, false),
          _tree('services', 4, Icons.folder, false),
          _tree('assets', 2, Icons.folder, false),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.all(8),
            child: OutlinedButton.icon(
              onPressed: () => _message('New file action'),
              icon: const Icon(Icons.add, size: 16),
              label: const Text('New File'),
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
        child: Stack(children: [
          TextField(
            controller: code,
            expands: true,
            maxLines: null,
            minLines: null,
            textAlignVertical: TextAlignVertical.top,
            style: const TextStyle(
                fontFamily: 'monospace', fontSize: 13, height: 1.5),
            decoration: const InputDecoration(
              border: InputBorder.none,
              contentPadding: EdgeInsets.fromLTRB(48, 14, 18, 18),
              hintText: '// Open a Dart / Flutter file',
            ),
          ),
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: 42,
            child: Container(
              color: const Color(0xFF15161A),
              alignment: Alignment.topCenter,
              padding: const EdgeInsets.only(top: 14),
              child: const Text(
                '1\\n2\\n3\\n4\\n5\\n6\\n7\\n8\\n9\\n10\\n11\\n12',
                textAlign: TextAlign.right,
                style: TextStyle(
                    color: Color(0xFF5E626B),
                    fontFamily: 'monospace',
                    fontSize: 11,
                    height: 1.72),
              ),
            ),
          ),
        ]),
      );

  Widget _preview() => Container(
        color: const Color(0xFF17181C),
        child: Column(children: [
          _sectionHeader('FLUTTER PREVIEW', Icons.phone_android),
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(26, 8, 26, 18),
              decoration: BoxDecoration(
                color: const Color(0xFF0B0C0E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF3A3D44)),
              ),
              child: Column(children: [
                Container(
                  height: 32,
                  color: const Color(0xFF202227),
                  child: const Row(children: [
                    SizedBox(width: 12),
                    Icon(Icons.circle, size: 8),
                    SizedBox(width: 5),
                    Icon(Icons.circle, size: 8),
                    SizedBox(width: 5),
                    Icon(Icons.circle, size: 8),
                  ]),
                ),
                const Expanded(
                  child: Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.flutter_dash, size: 52),
                      SizedBox(height: 12),
                      Text('Flutter Preview',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                      SizedBox(height: 6),
                      Text(
                        'Start the cloud debug worker to attach a live preview.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: Color(0xFF969AA4), fontSize: 12),
                      ),
                    ]),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.all(10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.refresh, size: 16),
                      SizedBox(width: 5),
                      Text('Hot Reload'),
                      SizedBox(width: 18),
                      Icon(Icons.restart_alt, size: 16),
                      SizedBox(width: 5),
                      Text('Hot Restart'),
                    ],
                  ),
                ),
              ]),
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
          Expanded(child: _terminalPanel()),
        ]),
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
