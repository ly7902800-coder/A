import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

class FlutterFeatureLab extends StatefulWidget {
  const FlutterFeatureLab({super.key});
  @override
  State<FlutterFeatureLab> createState() => _FlutterFeatureLabState();
}

class _FlutterFeatureLabState extends State<FlutterFeatureLab>
    with SingleTickerProviderStateMixin {
  final formKey = GlobalKey<FormState>();
  final textController = TextEditingController();
  final animatedListKey = GlobalKey<AnimatedListState>();
  final notifications = FlutterLocalNotificationsPlugin();
  late final AnimationController animationController;

  bool checked = false;
  bool switched = true;
  double slider = .45;
  RangeValues range = const RangeValues(.2, .8);
  int radio = 1;
  int segment = 0;
  int tab = 0;
  double opacity = 1;
  int animatedCount = 0;

  @override
  void initState() {
    super.initState();
    animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    animationController.dispose();
    textController.dispose();
    super.dispose();
  }

  Widget section(String title, Widget child) => Card(
        margin: const EdgeInsets.all(10),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              child,
            ],
          ),
        ),
      );

  Future<void> savePreference() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('genesis_feature_lab_enabled', switched);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Saved with shared_preferences')),
    );
  }

  Future<void> pickImage() async {
    await ImagePicker().pickImage(source: ImageSource.gallery);
  }

  Future<void> getLocation() async {
    if (!await Geolocator.isLocationServiceEnabled()) return;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) return;
    await Geolocator.getCurrentPosition();
  }

  Future<void> openFlutter() async {
    await launchUrl(
      Uri.parse('https://flutter.dev'),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> initNotifications() async {
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    );
    await notifications.initialize(settings);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Flutter Feature Lab'),
          actions: [
            IconButton(
              onPressed: savePreference,
              icon: const Icon(Icons.save),
              tooltip: 'Save',
            ),
          ],
        ),
        body: Directionality(
          textDirection: TextDirection.rtl,
          child: DefaultTabController(
            length: 3,
            child: Column(
              children: [
                const TabBar(
                  tabs: [
                    Tab(text: 'Widgets'),
                    Tab(text: 'Layout'),
                    Tab(text: 'Device'),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      widgetsTab(),
                      layoutTab(),
                      deviceTab(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: tab,
          onDestinationSelected: (value) => setState(() => tab = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.widgets), label: 'Widgets'),
            NavigationDestination(icon: Icon(Icons.dashboard), label: 'Layout'),
            NavigationDestination(icon: Icon(Icons.phone_android), label: 'Device'),
          ],
        ),
      );

  Widget widgetsTab() => ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          section(
            'Buttons',
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton(onPressed: () {}, child: const Text('ElevatedButton')),
                FilledButton(onPressed: () {}, child: const Text('FilledButton')),
                OutlinedButton(onPressed: () {}, child: const Text('OutlinedButton')),
                TextButton(onPressed: () {}, child: const Text('TextButton')),
                IconButton(onPressed: () {}, icon: const Icon(Icons.star)),
                FloatingActionButton.small(onPressed: () {}, child: const Icon(Icons.add)),
                SegmentedButton<int>(
                  segments: const [
                    ButtonSegment(value: 0, label: Text('A')),
                    ButtonSegment(value: 1, label: Text('B')),
                  ],
                  selected: {segment},
                  onSelectionChanged: (v) => setState(() => segment = v.first),
                ),
                ToggleButtons(
                  isSelected: [segment == 0, segment == 1],
                  onPressed: (v) => setState(() => segment = v),
                  children: const [Icon(Icons.home), Icon(Icons.settings)],
                ),
                PopupMenuButton<String>(
                  onSelected: (_) {},
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'one', child: Text('Popup menu')),
                  ],
                ),
                DropdownButton<String>(
                  value: 'One',
                  items: const [
                    DropdownMenuItem(value: 'One', child: Text('One')),
                    DropdownMenuItem(value: 'Two', child: Text('Two')),
                  ],
                  onChanged: (_) {},
                ),
                InkWell(onTap: () {}, child: const Padding(
                  padding: EdgeInsets.all(8), child: Text('InkWell'),
                )),
                GestureDetector(onTap: () {}, child: const Padding(
                  padding: EdgeInsets.all(8), child: Text('GestureDetector'),
                )),
              ],
            ),
          ),
          section(
            'Text / Inputs / Forms',
            Form(
              key: formKey,
              child: Column(
                children: [
                  const Text('Text'),
                  const Text.rich(TextSpan(
                    text: 'RichText: ',
                    children: [TextSpan(text: 'styled text')],
                  )),
                  const SelectableText('SelectableText'),
                  TextFormField(
                    controller: textController,
                    decoration: const InputDecoration(labelText: 'TextFormField'),
                    validator: (v) => (v ?? '').isEmpty ? 'Enter text' : null,
                  ),
                  const TextField(decoration: InputDecoration(labelText: 'TextField')),
                  CheckboxListTile(
                    value: checked,
                    onChanged: (v) => setState(() => checked = v ?? false),
                    title: const Text('Checkbox'),
                  ),
                  RadioListTile<int>(
                    value: 1,
                    groupValue: radio,
                    onChanged: (v) => setState(() => radio = v ?? 1),
                    title: const Text('Radio'),
                  ),
                  SwitchListTile(
                    value: switched,
                    onChanged: (v) => setState(() => switched = v),
                    title: const Text('Switch'),
                  ),
                  Slider(value: slider, onChanged: (v) => setState(() => slider = v)),
                  RangeSlider(values: range, onChanged: (v) => setState(() => range = v)),
                  Wrap(
                    spacing: 8,
                    children: [
                      OutlinedButton(
                        onPressed: () => showDatePicker(
                          context: context,
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2035),
                          initialDate: DateTime.now(),
                        ),
                        child: const Text('DatePicker'),
                      ),
                      OutlinedButton(
                        onPressed: () => showTimePicker(
                          context: context,
                          initialTime: TimeOfDay.now(),
                        ),
                        child: const Text('TimePicker'),
                      ),
                    ],
                  ),
                  Autocomplete<String>(
                    optionsBuilder: (value) => ['Genesis', 'Flutter', 'Dart']
                        .where((x) => x.contains(value.text)),
                  ),
                ],
              ),
            ),
          ),
          section(
            'Ready-made components',
            Column(
              children: [
                const ListTile(
                  leading: CircleAvatar(child: Icon(Icons.person)),
                  title: Text('ListTile'),
                  subtitle: Text('Card / Avatar / Badge / Tooltip'),
                  trailing: Badge(label: Text('3'), child: Icon(Icons.mail)),
                ),
                const ExpansionTile(
                  title: Text('ExpansionTile'),
                  children: [ListTile(title: Text('Expanded content'))],
                ),
                const Wrap(
                  spacing: 8,
                  children: [
                    Chip(label: Text('Chip')),
                    Tooltip(message: 'Tooltip', child: Icon(Icons.info)),
                    CircleAvatar(child: Text('G')),
                  ],
                ),
                const Divider(),
                const LinearProgressIndicator(value: .65),
                const SizedBox(height: 8),
                const CircularProgressIndicator(),
                const SizedBox(height: 8),
                const DataTable(
                  columns: [
                    DataColumn(label: Text('Name')),
                    DataColumn(label: Text('Value')),
                  ],
                  rows: [
                    DataRow(cells: [DataCell(Text('Flutter')), DataCell(Text('SDK'))]),
                    DataRow(cells: [DataCell(Text('Dart')), DataCell(Text('Language'))]),
                  ],
                ),
                const Table(
                  children: [
                    TableRow(children: [Text('Table 1'), Text('Value 1')]),
                    TableRow(children: [Text('Table 2'), Text('Value 2')]),
                  ],
                ),
              ],
            ),
          ),
          section(
            'Dialogs / Menus / Navigation',
            Wrap(
              spacing: 8,
              children: [
                FilledButton(
                  onPressed: () => showDialog<void>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('AlertDialog'),
                      content: const Text('Genesis dialog'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Close'),
                        ),
                      ],
                    ),
                  ),
                  child: const Text('AlertDialog'),
                ),
                OutlinedButton(
                  onPressed: () => showDialog<void>(
                    context: context,
                    builder: (_) => const SimpleDialog(
                      title: Text('SimpleDialog'),
                      children: [SimpleDialogOption(child: Text('Option'))],
                    ),
                  ),
                  child: const Text('SimpleDialog'),
                ),
                OutlinedButton(
                  onPressed: () => showModalBottomSheet<void>(
                    context: context,
                    builder: (_) => const Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('showModalBottomSheet'),
                    ),
                  ),
                  child: const Text('BottomSheet'),
                ),
                OutlinedButton(
                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('SnackBar')),
                  ),
                  child: const Text('SnackBar'),
                ),
                OutlinedButton(
                  onPressed: () => ScaffoldMessenger.of(context).showMaterialBanner(
                    MaterialBanner(
                      content: const Text('MaterialBanner'),
                      actions: [
                        TextButton(
                          onPressed: () => ScaffoldMessenger.of(context).hideCurrentMaterialBanner(),
                          child: const Text('Close'),
                        ),
                      ],
                    ),
                  ),
                  child: const Text('MaterialBanner'),
                ),
                OutlinedButton(
                  onPressed: () => Navigator.push(
                    context,
                    PageRouteBuilder(
                      pageBuilder: (_, __, ___) => const SecondPage(),
                      transitionsBuilder: (_, a, __, child) =>
                          FadeTransition(opacity: a, child: child),
                    ),
                  ),
                  child: const Text('Navigator.push / PageRouteBuilder'),
                ),
              ],
            ),
          ),
          section(
            'Animations',
            Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 400),
                  width: switched ? 120 : 220,
                  height: 60,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(switched ? 12 : 30)),
                  child: const Text('AnimatedContainer'),
                ),
                AnimatedOpacity(
                  opacity: opacity,
                  duration: const Duration(milliseconds: 300),
                  child: const Text('AnimatedOpacity'),
                ),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: Text(
                    switched ? 'AnimatedSwitcher A' : 'AnimatedSwitcher B',
                    key: ValueKey(switched),
                  ),
                ),
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: const Duration(seconds: 1),
                  builder: (_, value, child) => Transform.rotate(
                    angle: value * math.pi,
                    child: child,
                  ),
                  child: const Icon(Icons.refresh),
                ),
                AnimatedBuilder(
                  animation: animationController,
                  builder: (_, child) => Transform.scale(
                    scale: .8 + animationController.value * .2,
                    child: child,
                  ),
                  child: const Icon(Icons.auto_awesome),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    FilledButton(
                      onPressed: () => setState(() => switched = !switched),
                      child: const Text('Animate'),
                    ),
                    OutlinedButton(
                      onPressed: () => setState(() => opacity = opacity == 1 ? .25 : 1),
                      child: const Text('Opacity'),
                    ),
                  ],
                ),
                const Text('Hero is demonstrated on the second page. Lottie/Rive are installed for project assets.'),
              ],
            ),
          ),
        ],
      );

  Widget layoutTab() => CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 140,
            flexibleSpace: const FlexibleSpaceBar(
              title: Text('SliverAppBar'),
            ),
          ),
          SliverToBoxAdapter(
            child: section(
              'Layout primitives',
              Column(
                children: [
                  Row(children: [
                    Expanded(child: Container(height: 50, alignment: Alignment.center, child: const Text('Expanded'))),
                    Flexible(child: Container(height: 50, alignment: Alignment.center, child: const Text('Flexible'))),
                  ]),
                  const SizedBox(height: 10),
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(height: 100),
                      const Positioned(top: 8, right: 8, child: Badge(label: Text('1'))),
                      const Text('Stack + Positioned'),
                    ],
                  ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: List.generate(
                      6,
                      (i) => SizedBox(width: 90, child: Card(child: Padding(
                        padding: const EdgeInsets.all(12), child: Text('Wrap $i'),
                      ))),
                    ),
                  ),
                  const SizedBox(height: 10),
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Container(alignment: Alignment.center, child: const Text('AspectRatio')),
                  ),
                  FittedBox(child: Text('FittedBox', style: Theme.of(context).textTheme.titleLarge)),
                  LayoutBuilder(
                    builder: (_, c) => Text('LayoutBuilder width: ' + c.maxWidth.toStringAsFixed(0)),
                  ),
                  Text('MediaQuery width: ' + MediaQuery.sizeOf(context).width.toStringAsFixed(0)),
                  const SafeArea(child: Center(child: SizedBox(height: 45, child: Text('SafeArea + Center + SizedBox')))),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 320),
                    child: const Text('ConstrainedBox'),
                  ),
                  const Padding(padding: EdgeInsets.all(8), child: Text('Container / Padding / Align / Spacer')),
                ],
              ),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (_, index) => ListTile(
                leading: CircleAvatar(child: Text('$index')),
                title: Text('SliverList item $index'),
              ),
              childCount: 5,
            ),
          ),
          SliverGrid(
            delegate: SliverChildBuilderDelegate(
              (_, index) => Card(child: Center(child: Text('SliverGrid $index'))),
              childCount: 6,
            ),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2),
          ),
        ],
      );

  Widget deviceTab() => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          section(
            'Camera / Image Picker / Permissions',
            Wrap(
              spacing: 8,
              children: [
                FilledButton(
                  onPressed: () => Permission.camera.request(),
                  child: const Text('Camera permission'),
                ),
                OutlinedButton(
                  onPressed: pickImage,
                  child: const Text('Pick image'),
                ),
                OutlinedButton(
                  onPressed: () => Permission.notification.request(),
                  child: const Text('Notification permission'),
                ),
                OutlinedButton(
                  onPressed: openAppSettings,
                  child: const Text('Open app settings'),
                ),
              ],
            ),
          ),
          section(
            'Location / URL',
            Wrap(
              spacing: 8,
              children: [
                FilledButton(onPressed: getLocation, child: const Text('Get location')),
                OutlinedButton(onPressed: openFlutter, child: const Text('Open flutter.dev')),
              ],
            ),
          ),
          section(
            'WebView',
            SizedBox(
              height: 180,
              child: WebViewWidget(
                controller: WebViewController()
                  ..setJavaScriptMode(JavaScriptMode.unrestricted)
                  ..loadRequest(Uri.parse('https://flutter.dev')),
              ),
            ),
          ),
          section(
            'Google Maps',
            Column(
              children: [
                const Text('Google Maps is wired. A Maps API key is required by the platform configuration.'),
                SizedBox(
                  height: 180,
                  child: GoogleMap(
                    initialCameraPosition: const CameraPosition(
                      target: LatLng(0, 0),
                      zoom: 1,
                    ),
                    zoomControlsEnabled: false,
                    myLocationButtonEnabled: false,
                  ),
                ),
              ],
            ),
          ),
          section(
            'Firebase Messaging / Local Notifications',
            Wrap(
              spacing: 8,
              children: [
                OutlinedButton(
                  onPressed: initNotifications,
                  child: const Text('Init local notifications'),
                ),
                const Chip(label: Text('firebase_messaging installed')),
              ],
            ),
          ),
          section(
            'Platform Channels / Isolates',
            Column(
              children: [
                FilledButton(
                  onPressed: () async {
                    const channel = MethodChannel('genesis/platform');
                    try {
                      await channel.invokeMethod('ping');
                    } on PlatformException {
                      // Native handler can be registered by the Android/iOS host.
                    }
                  },
                  child: const Text('Platform Channel ping'),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () async {
                    final result = await Future<int>.microtask(() {
                      var total = 0;
                      for (var i = 0; i < 100000; i++) total += i;
                      return total;
                    });
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Computation: $result')),
                    );
                  },
                  child: const Text('Background computation'),
                ),
              ],
            ),
          ),
          section(
            'Packages ready',
            const Wrap(
              spacing: 8,
              children: [
                Chip(label: Text('camera')),
                Chip(label: Text('image_picker')),
                Chip(label: Text('geolocator')),
                Chip(label: Text('google_maps_flutter')),
                Chip(label: Text('url_launcher')),
                Chip(label: Text('permission_handler')),
                Chip(label: Text('firebase_messaging')),
                Chip(label: Text('flutter_local_notifications')),
                Chip(label: Text('webview_flutter')),
              ],
            ),
          ),
        ],
      );
}

class SecondPage extends StatelessWidget {
  const SecondPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Hero / Navigator')),
        body: Center(
          child: Hero(
            tag: 'genesis-hero',
            child: const CircleAvatar(
              radius: 56,
              child: Icon(Icons.auto_awesome, size: 40),
            ),
          ),
        ),
      );
}
