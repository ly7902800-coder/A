import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'flutter_feature_lab.dart';
import 'flutter_buttons_lab.dart';
import 'package:http/http.dart' as http;

// -----------------------------------------------------------------------------
// Riverpod
// -----------------------------------------------------------------------------

final apiBaseUrlProvider = Provider<String>(
  (ref) => const String.fromEnvironment('GENESIS_API_URL', defaultValue: ''),
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
      path: '/flutter-lab',
      builder: (context, state) => const FlutterFeatureLab(),
    ),
    GoRoute(
      path: '/buttons-lab',
      builder: (context, state) => const ButtonsPage(),
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
                  leading: const Icon(Icons.widgets),
                  title: const Text('Flutter Feature Lab'),
                  subtitle: const Text('Widgets, layout, animation and device APIs'),
                  onTap: () => context.go('/flutter-lab'),
                ),
                ListTile(
                  leading: const Icon(Icons.smart_button),
                  title: const Text('Buttons Lab'),
                  subtitle: const Text('أزرار وتفاعلات Flutter'),
                  onTap: () => context.go('/buttons-lab'),
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
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      TextField(
                        controller: email,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                        ),
                      ),
                      TextField(
                        controller: password,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                        ),
                      ),
                      FilledButton(
                        onPressed: loading ? null : login,
                        child: const Text('Login'),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: ListView(
                  children: messages
                      .map(
                        (m) => ListTile(
                          title: Text(
                            m['role'] == 'user'
                                ? 'أنت'
                                : 'Genesis AI',
                          ),
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
                        enabled: token.isNotEmpty && !loading,
                        decoration: const InputDecoration(
                          hintText: 'اكتب طلبك...',
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
          ),
        );
        },
      ),
    );
  }

  @override
  void dispose() {
    input.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }
}
