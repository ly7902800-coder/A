import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'cloud_flutter_ide.dart';
import 'package:http/http.dart' as http;

// -----------------------------------------------------------------------------
// Riverpod
// -----------------------------------------------------------------------------

final apiBaseUrlProvider = Provider<String>(
  (ref) => const String.fromEnvironment('GENESIS_API_URL', defaultValue: 'https://genesis-api-production-f3e0.up.railway.app'),
);

final selectedModelProvider = StateProvider<String>((ref) => 'auto');

// -----------------------------------------------------------------------------
// Bloc example
// -----------------------------------------------------------------------------

sealed class AppStatusState {
  const AppStatusState();
}

final class AppReady extends AppStatusState {
  const AppReady();
}

final class AppLoading extends AppStatusState {
  const AppLoading();
}

final class AppCubit extends Cubit<AppStatusState> {
  AppCubit() : super(const AppReady());

  void setLoading(bool value) {
    emit(value ? const AppLoading() : const AppReady());
  }
}

// -----------------------------------------------------------------------------
// GoRouter
// -----------------------------------------------------------------------------

final router = GoRouter(
  initialLocation: '/home',
  routes: [
    GoRoute(
      path: '/home',
      builder: (context, state) => const GenesisHome(),
    ),
    GoRoute(
      path: '/cloud-flutter',
      builder: (context, state) => const CloudFlutterIdePage(),
    ),
  ],
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(
    const ProviderScope(
      child: GenesisApp(),
    ),
  );
}

class GenesisApp extends ConsumerWidget {
  const GenesisApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Riverpod: provider is intentionally consumed with ref.watch.
    final apiBaseUrl = ref.watch(apiBaseUrlProvider);

    return BlocProvider(
      create: (_) => AppCubit(),
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        title: 'Genesis AI',
        routerConfig: router,
        theme: ThemeData(
          brightness: Brightness.light,
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        ),
        darkTheme: ThemeData.dark(useMaterial3: true),
        themeMode: ThemeMode.system,
      ),
    );
  }
}

class GenesisHome extends ConsumerStatefulWidget {
  const GenesisHome({super.key});

  @override
  ConsumerState<GenesisHome> createState() => _GenesisHomeState();
}

class _GenesisHomeState extends ConsumerState<GenesisHome> {
  final input = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  final messages = <Map<String, String>>[];

  String token = '';
  String conversationId = '';
  int _tabIndex = 0;
  List<dynamic> models = [];
  List<dynamic> chats = [];
  String chatSearch = '';

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString('genesis_auth_token');
      if (saved != null && saved.isNotEmpty) {
        setState(() => token = saved);
        await api('/v1/auth/me');
      } else {
        final data = await api('/v1/auth/guest', method: 'POST');
        final newToken = data['token']?.toString() ?? '';
        if (newToken.isEmpty) throw Exception('Guest session was not created');
        await prefs.setString('genesis_auth_token', newToken);
        setState(() => token = newToken);
      }
      await Future.wait([loadModels(), loadChats()]);
    } catch (e) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('genesis_auth_token');
      try {
        final data = await api('/v1/auth/guest', method: 'POST');
        final newToken = data['token']?.toString() ?? '';
        if (newToken.isNotEmpty) {
          await prefs.setString('genesis_auth_token', newToken);
          if (mounted) setState(() => token = newToken);
          await Future.wait([loadModels(), loadChats()]);
        }
      } catch (fallbackError) {
        if (mounted) _snack(fallbackError.toString());
      }
    }
  }

  Future<void> loadChats() async {
    if (token.isEmpty) return;
    try {
      final data = await api('/v1/chats');
      setState(() => chats = data['chats'] ?? []);
    } catch (_) {}
  }


  Dio get _dio => Dio(
        BaseOptions(
          baseUrl: ref.read(apiBaseUrlProvider),
          headers: {
            'Content-Type': 'application/json',
            if (token.isNotEmpty) 'Authorization': 'Bearer $token',
          },
        ),
      );

  // Dio interceptor example.
  void configureDio() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  Future<dynamic> api(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final base = ref.read(apiBaseUrlProvider);
    if (base.isEmpty) throw Exception('GENESIS_API_URL is not configured');

    final request = http.Request(method, Uri.parse(base + path));
    request.headers['Content-Type'] = 'application/json';
    if (token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    if (body != null) request.body = jsonEncode(body);

    final response = await http.Client().send(request);
    final result = await http.Response.fromStream(response);
    final data = result.body.isEmpty ? <String, dynamic>{} : jsonDecode(result.body);

    if (result.statusCode >= 400) {
      throw Exception(data['error'] ?? 'Request failed');
    }
    return data;
  }

  Future<void> login() async {
    context.read<AppCubit>().setLoading(true);
    try {
      final data = await api(
        '/v1/auth/login',
        method: 'POST',
        body: {
          'email': email.text,
          'password': password.text,
        },
      );

      setState(() => token = data['token'] ?? '');
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('genesis_auth_token', token);
      await loadModels();
      if (mounted) context.go('/home');
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) context.read<AppCubit>().setLoading(false);
    }
  }

  Future<void> loadModels() async {
    if (token.isEmpty) return;
    try {
      final data = await api('/v1/models/catalog');
      setState(() => models = data['models'] ?? []);
    } catch (e) {
      _snack(e.toString());
    }
  }

  Future<void> send() async {
    final text = input.text.trim();
    if (text.isEmpty || token.isEmpty) return;

    context.read<AppCubit>().setLoading(true);
    setState(() {
      messages.add({'role': 'user', 'content': text});
      input.clear();
    });

    try {
      final selectedModel = ref.read(selectedModelProvider);
      final data = await api(
        '/v1/chat/completions',
        method: 'POST',
        body: {
          'model': selectedModel,
          'messages': [
            {'role': 'user', 'content': text},
          ],
          'conversationId':
              conversationId.isEmpty ? null : conversationId,
        },
      );

      setState(() {
        conversationId = data['conversationId'] ?? conversationId;
        messages.add({
          'role': 'assistant',
          'content': data['text'] ?? '',
        });
      });
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) context.read<AppCubit>().setLoading(false);
    }
  }

  void _showApiKeyDialog() {
    final provider = TextEditingController();
    final key = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('إضافة API Key'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: provider, decoration: const InputDecoration(labelText: 'Provider (OpenAI / Anthropic / Gemini / xAI...)')),
          const SizedBox(height: 10),
          TextField(controller: key, obscureText: true, decoration: const InputDecoration(labelText: 'API Key')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
          FilledButton(onPressed: () async {
            try {
              await api('/v1/credentials/api-key', method: 'POST', body: {
                'provider': provider.text.trim(), 'apiKey': key.text.trim(),
              });
              if (mounted) {
                Navigator.pop(context);
                _snack('تم حفظ المفتاح بشكل مشفر وربطه بحسابك');
              }
            } catch (e) { if (mounted) _snack(e.toString()); }
          }, child: const Text('اتصال')),
        ],
      ),
    );
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: BlocBuilder<AppCubit, AppStatusState>(
        builder: (context, status) {
        final loading = status is AppLoading;
        final selectedModel = ref.watch(selectedModelProvider);

        return Scaffold(
          appBar: AppBar(
            title: const Text('Genesis AI'),
            actions: [
              if (loading)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              DropdownButton<String>(
                value: models.any(
                  (m) => m['id']?.toString() == selectedModel,
                )
                    ? selectedModel
                    : 'auto',
                items: [
                  const DropdownMenuItem(
                    value: 'auto',
                    child: Text('Auto'),
                  ),
                  ...models.map(
                    (m) => DropdownMenuItem(
                      value: m['id'].toString(),
                      child: Text(
                        m['name']?.toString() ?? m['id'].toString(),
                      ),
                    ),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    ref.read(selectedModelProvider.notifier).state = value;
                  }
                },
              ),
            ],
          ),
          drawer: Drawer(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                const UserAccountsDrawerHeader(
                  accountName: Text('Genesis AI'),
                  accountEmail: Text('Cloud AI Assistant'),
                  currentAccountPicture: CircleAvatar(
                    child: Icon(Icons.auto_awesome),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.key),
                  title: const Text('API Keys'),
                  subtitle: const Text('اربط API مباشرة بالمشروع بشكل آمن'),
                  onTap: () { Navigator.pop(context); _showApiKeyDialog(); },
                ),
                ListTile(
                  leading: const Icon(Icons.code),
                  title: const Text('Cloud Flutter IDE'),
                  subtitle: const Text('اكتب Dart ثم احفظه وابنه على Flutter عبر GitHub Actions'),
                  onTap: () => context.go('/cloud-flutter'),
                ),
                const Divider(),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: TextField(
                    decoration: const InputDecoration(
                      labelText: 'بحث بالمحادثات',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (value) => setState(() => chatSearch = value.trim().toLowerCase()),
                  ),
                ),
                for (final chat in chats.where((c) => chatSearch.isEmpty || c['title']?.toString().toLowerCase().contains(chatSearch) == true))
                  ListTile(
                    leading: const Icon(Icons.chat_bubble_outline),
                    title: Text(chat['title']?.toString() ?? 'محادثة'),
                    onTap: () async {
                      Navigator.pop(context);
                      try {
                        final data = await api('/v1/chats/${chat['id']}');
                        final loaded = (data['messages'] as List<dynamic>? ?? []);
                        setState(() {
                          conversationId = chat['id']?.toString() ?? '';
                          messages
                            ..clear()
                            ..addAll(loaded.map((m) => <String, String>{
                              'role': m['role']?.toString() ?? 'assistant',
                              'content': m['content']?.toString() ?? '',
                            }));
                        });
                      } catch (e) { _snack(e.toString()); }
                    },
                  ),
                const Divider(),
                for (final item in [
                  'Chat',
                  'Projects',
                  'AI Studio',
                  'Files',
                  'Source Code',
                  'UI Designer',
                  'Integrations',
                  'Build',
                  'Testing',
                  'Logs',
                  'Releases',
                  'Credentials',
                  'Settings',
                ])
                  ListTile(
                    title: Text(item),
                    onTap: () => Navigator.pop(context),
                  ),
              ],
            ),
          ),
          body: SafeArea(
            child: Column(
              children: [
                if (token.isEmpty)
                  const Expanded(
                    child: Center(child: CircularProgressIndicator()),
                  )
                else ...[
                  Expanded(
                    child: ListView(
                      children: messages
                          .map(
                            (m) => ListTile(
                              title: Text(m['role'] == 'user' ? 'أنت' : 'Genesis AI'),
                              subtitle: Text(m['content'] ?? ''),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: input,
                            enabled: !loading,
                            onSubmitted: (_) => send(),
                            decoration: const InputDecoration(
                              hintText: 'اكتب طلبك...',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: loading ? null : send,
                          icon: const Icon(Icons.send),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
  @override
  void dispose() {
    input.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }
}
