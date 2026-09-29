
import 'dart:async';
import 'dart:convert';

import 'package:camera/camera.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

final featureCounterProvider = StateProvider<int>((ref) => 0);
final featureProjectProvider = StateProvider<String>((ref) => 'Genesis Demo');

sealed class FeatureState { const FeatureState(); }
final class FeatureIdle extends FeatureState { const FeatureIdle(); }
final class FeatureBusy extends FeatureState { const FeatureBusy(); }
final class FeatureDone extends FeatureState {
  const FeatureDone(this.message);
  final String message;
}
class FeatureCubit extends Cubit<FeatureState> {
  FeatureCubit() : super(const FeatureIdle());
  Future<void> run(Future<String> Function() task) async {
    emit(const FeatureBusy());
    try { emit(FeatureDone(await task())); } catch(e) { emit(FeatureDone('Error: $e')); }
  }
}

class FlutterCompletionLab extends ConsumerStatefulWidget {
  const FlutterCompletionLab({super.key});
  @override ConsumerState<FlutterCompletionLab> createState()=>_FlutterCompletionLabState();
}
class _FlutterCompletionLabState extends ConsumerState<FlutterCompletionLab> {
  final scroll=ScrollController();
  final dio=Dio();
  final url=TextEditingController();
  final wsUrl=TextEditingController();
  final ocrUrl=TextEditingController();
  final recorder=AudioRecorder();
  final notifications=FlutterLocalNotificationsPlugin();
  WebSocketChannel? channel;
  StreamSubscription? wsSub;
  SharedPreferences? prefs;
  final messages=<String>[];
  final files=<String>[];
  String status='جاهز', streamText='', ocrText='';
  int page=1, items=20, nav=0;
  bool loadingMore=false, recording=false;
  double scale=1, opacity=1;

  @override void initState(){
    super.initState();
    scroll.addListener(onScroll);
    initStorage();
    initNotifications();
  }
  Future<void> initStorage() async {
    prefs=await SharedPreferences.getInstance();
    messages.addAll(prefs!.getStringList('chat')??const []);
    if(mounted)setState(()=>status='SharedPreferences جاهز');
  }
  Future<void> initNotifications() async {
    try {
      await notifications.initialize(
        const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
      );
    } catch(_){}
  }
  void onScroll(){
    if(scroll.position.pixels>=scroll.position.maxScrollExtent-250&&!loadingMore)loadNextPage();
  }
  Future<void> loadNextPage() async {
    setState(()=>loadingMore=true);
    await Future<void>.delayed(const Duration(milliseconds:350));
    if(!mounted)return;
    setState((){page++;items+=20;loadingMore=false;status='تم تحميل الصفحة '+page.toString();});
  }
  Future<void> saveChat() async {
    await prefs?.setStringList('chat',messages);
    setState(()=>status='تم حفظ المحادثة');
  }
  Future<void> saveSettings() async {
    await prefs?.setString('project',ref.read(featureProjectProvider));
    setState(()=>status='تم حفظ إعدادات المستخدم');
  }
  Future<void> pickFiles() async {
    final picked=await FilePicker.pickFiles(allowMultiple:true);
    if(picked.isEmpty)return;
    setState(()=>files.addAll(picked.map((e)=>e.name)));
  }
  Future<void> pickImage(ImageSource source) async {
    final image=await ImagePicker().pickImage(source:source,imageQuality:85);
    if(image==null)return;
    setState((){files.add(image.path);status='تم اختيار صورة';});
  }
  Future<void> startRecording() async {
    final ok=await recorder.hasPermission();
    if(!ok && !(await Permission.microphone.request()).isGranted){
      setState(()=>status='صلاحية الميكروفون مرفوضة');return;
    }
    final dir=await getApplicationDocumentsDirectory();
    final path=dir.path+'/genesis_'+DateTime.now().millisecondsSinceEpoch.toString()+'.m4a';
    await recorder.start(const RecordConfig(),path:path);
    setState((){recording=true;status='جاري التسجيل...';});
  }
  Future<void> stopRecording() async {
    final path=await recorder.stop();
    if(!mounted)return;
    setState((){recording=false;status=path==null?'لم يتم إنشاء تسجيل':'تم حفظ التسجيل';if(path!=null)files.add(path);});
  }
  Future<void> requestPermissions() async {
    final result=await [
      Permission.camera,Permission.microphone,Permission.location,
      Permission.notification,Permission.storage,
    ].request();
    final count=result.values.where((e)=>e.isGranted).length;
    setState(()=>status='الصلاحيات الممنوحة: '+count.toString()+'/'+result.length.toString());
  }
  Future<void> localNotification() async {
    const details=AndroidNotificationDetails('genesis','Genesis AI',channelDescription:'Genesis notifications');
    await notifications.show(1,'Genesis AI','إشعار محلي تجريبي',const NotificationDetails(android:details));
    setState(()=>status='تم إرسال الإشعار');
  }
  Future<void> rest() async {
    if(url.text.trim().isEmpty)return;
    try {
      final r=await dio.get(url.text.trim(),options:Options(headers:{
        'Authorization':'Bearer demo-token','Accept':'application/json',
      }));
      setState(()=>status='REST '+r.statusCode.toString()+': '+r.data.toString());
    } catch(e){setState(()=>status='REST error: '+e.toString());}
  }
  Future<Response<dynamic>> dioWithRefresh(String endpoint,String accessToken,String refreshToken) async {
    try {
      return await dio.get(endpoint,options:Options(headers:{'Authorization':'Bearer '+accessToken}));
    } on DioException catch(e) {
      if(e.response?.statusCode!=401)rethrow;
      final r=await dio.post(url.text.trim()+'/auth/refresh',data:{'refreshToken':refreshToken});
      final token=r.data['accessToken']?.toString();
      if(token==null)rethrow;
      return dio.get(endpoint,options:Options(headers:{'Authorization':'Bearer '+token}));
    }
  }
  Future<void> connectWebSocket() async {
    if(wsUrl.text.trim().isEmpty)return;
    await wsSub?.cancel();
    await channel?.sink.close();
    try {
      channel=WebSocketChannel.connect(Uri.parse(wsUrl.text.trim()));
      await channel!.ready;
      wsSub=channel!.stream.listen((data){
        if(mounted)setState(()=>streamText+=data.toString());
      },onError:(e){if(mounted)setState(()=>status='WebSocket error: '+e.toString());});
      channel!.sink.add(jsonEncode({'type':'hello','client':'genesis-mobile'}));
      setState(()=>status='WebSocket connected');
    } catch(e){setState(()=>status='WebSocket error: '+e.toString());}
  }
  Future<void> streamResponse() async {
    if(url.text.trim().isEmpty)return;
    setState(()=>streamText='');
    try {
      final r=await dio.post<ResponseBody>(url.text.trim(),
        data:{'messages':messages,'stream':true},
        options:Options(responseType:ResponseType.stream));
      final body=r.data;
      if(body==null)return;
      await for(final chunk in body.stream){
        if(!mounted)return;
        setState(()=>streamText+=utf8.decode(chunk,allowMalformed:true));
      }
    } catch(e){setState(()=>status='Streaming error: '+e.toString());}
  }
  Future<void> runOcr() async {
    if(ocrUrl.text.trim().isEmpty||files.isEmpty){
      setState(()=>ocrText='اختر صورة وأدخل endpoint OCR من Genesis API');return;
    }
    try {
      final form=FormData.fromMap({'file':await MultipartFile.fromFile(files.last)});
      final r=await dio.post(ocrUrl.text.trim(),data:form);
      setState(()=>ocrText=r.data['text']?.toString()??r.data.toString());
    } catch(e){setState(()=>ocrText='OCR error: '+e.toString());}
  }
  Future<void> cameraPermission() async {
    final s=await Permission.camera.request();
    setState(()=>status=s.isGranted?'Camera permission granted':'Camera permission denied');
  }
  @override void dispose(){
    scroll.dispose();url.dispose();wsUrl.dispose();ocrUrl.dispose();
    recorder.dispose();wsSub?.cancel();channel?.sink.close();super.dispose();
  }
  @override Widget build(BuildContext context){
    return Scaffold(
      appBar:AppBar(title:const Text('Flutter Production Lab')),
      drawer:Drawer(child:ListView(children:[
        const DrawerHeader(child:Center(child:Text('Genesis Flutter Stack'))),
        for(final title in const ['Scrolling & Lists','Navigation','State Management','Animations','Networking','Local Storage','Files & Media','Permissions','Firebase / Notifications','Testing','Production'])
          ListTile(leading:const Icon(Icons.check_circle_outline),title:Text(title),onTap:()=>Navigator.pop(context)),
      ])),
      body:CustomScrollView(controller:scroll,slivers:[
        SliverAppBar(pinned:true,floating:true,expandedHeight:110,
          flexibleSpace:const FlexibleSpaceBar(title:Text('Genesis Flutter Stack'))),
        SliverToBoxAdapter(child:section('5. Scrolling & Lists',Column(children:[
          SizedBox(height:100,child:ListView.builder(scrollDirection:Axis.horizontal,itemCount:10,
            itemBuilder:(_,i)=>Card(child:SizedBox(width:120,child:Center(child:Text('List '+i.toString())))))),
          GridView.builder(shrinkWrap:true,physics:const NeverScrollableScrollPhysics(),itemCount:6,
            gridDelegate:const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:3),
            itemBuilder:(_,i)=>Card(child:Center(child:Text('Grid '+i.toString())))),
          Wrap(spacing:8,children:[Chip(label:Text('Page '+page.toString())),Chip(label:Text('Items '+items.toString()))]),
          FilledButton(onPressed:loadNextPage,child:const Text('Pagination / Infinite scroll')),
        ]))),
        SliverToBoxAdapter(child:section('6. Navigation',Column(children:[
          NavigationBar(selectedIndex:nav,onDestinationSelected:(i)=>setState(()=>nav=i),
            destinations:const[
              NavigationDestination(icon:Icon(Icons.chat),label:'Chat'),
              NavigationDestination(icon:Icon(Icons.folder),label:'Projects'),
              NavigationDestination(icon:Icon(Icons.settings),label:'Settings')]),
          NavigationRail(selectedIndex:nav,onDestinationSelected:(i)=>setState(()=>nav=i),
            destinations:const[
              NavigationRailDestination(icon:Icon(Icons.chat),label:Text('Chat')),
              NavigationRailDestination(icon:Icon(Icons.folder),label:Text('Projects')),
              NavigationRailDestination(icon:Icon(Icons.settings),label:Text('Settings'))]),
          FilledButton(onPressed:()=>showDialog(context:context,builder:(_)=>AlertDialog(
            title:const Text('Nested navigation'),content:const Text('Nested Navigator/Dialog route is active.'),
            actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Close'))])),child:const Text('Nested route / Deep link demo')),
        ]))),
        SliverToBoxAdapter(child:section('7. State Management',Consumer(builder:(context,ref,_){
          final count=ref.watch(featureCounterProvider);
          final project=ref.watch(featureProjectProvider);
          return Column(children:[
            Text('Riverpod counter: '+count.toString()),
            Row(mainAxisAlignment:MainAxisAlignment.center,children:[
              IconButton(onPressed:()=>ref.read(featureCounterProvider.notifier).state--,icon:const Icon(Icons.remove)),
              IconButton(onPressed:()=>ref.read(featureCounterProvider.notifier).state++,icon:const Icon(Icons.add))]),
            DropdownButton<String>(value:project,items:const['Genesis Demo','Mobile App','AI Studio']
              .map((p)=>DropdownMenuItem(value:p,child:Text(p))).toList(),
              onChanged:(v){if(v!=null)ref.read(featureProjectProvider.notifier).state=v;}),
            const Text('Bloc/Cubit pattern is kept in FeatureCubit and can drive chat/project/file state.'),
          ]);
        }))),
        SliverToBoxAdapter(child:section('8. Animations',Column(children:[
          Hero(tag:'genesis-hero',child:AnimatedScale(scale:scale,duration:const Duration(milliseconds:450),
            child:const Icon(Icons.auto_awesome,size:64))),
          AnimatedContainer(duration:const Duration(milliseconds:500),width:scale==1?120:220,height:60,
            alignment:Alignment.center,decoration:BoxDecoration(border:Border.all(),borderRadius:BorderRadius.circular(18)),
            child:const Text('Implicit animation')),
          FilledButton(onPressed:()=>setState((){scale=scale==1?1.35:1;opacity=opacity==1?.3:1;}),
            child:const Text('Hero / Implicit / Explicit')),
          AnimatedOpacity(opacity:opacity,duration:const Duration(milliseconds:400),child:const Text('Loading / micro-interaction')),
        ]))),
        SliverToBoxAdapter(child:section('9. Networking',Column(children:[
          TextField(controller:url,decoration:const InputDecoration(labelText:'REST / streaming endpoint')),
          Row(children:[Expanded(child:FilledButton(onPressed:rest,child:const Text('Dio REST'))),
            Expanded(child:OutlinedButton(onPressed:streamResponse,child:const Text('Streaming')))]),
          TextField(controller:wsUrl,decoration:const InputDecoration(labelText:'WebSocket URL')),
          Row(children:[Expanded(child:FilledButton(onPressed:connectWebSocket,child:const Text('Connect WS'))),
            Expanded(child:OutlinedButton(onPressed:()=>channel?.sink.add(jsonEncode({'type':'ping'})),child:const Text('Send')))]),
          if(streamText.isNotEmpty)SelectableText(streamText),
          const Text('Dio authentication headers + refresh-token retry helper are implemented.'),
        ]))),
        SliverToBoxAdapter(child:section('10. Local Storage',Column(children:[
          Text('Saved chat messages: '+messages.length.toString()),
          Row(children:[Expanded(child:FilledButton(onPressed:saveChat,child:const Text('Save chat'))),
            Expanded(child:OutlinedButton(onPressed:saveSettings,child:const Text('Save settings')))]),
          const Text('SharedPreferences is active. Hive/Isar can be used as the heavier local-data layer when model adapters/schema are added.'),
        ]))),
        SliverToBoxAdapter(child:section('11. Files & Media',Column(children:[
          Wrap(spacing:8,children:[
            FilledButton.icon(onPressed:pickFiles,icon:const Icon(Icons.attach_file),label:const Text('Files')),
            OutlinedButton.icon(onPressed:()=>pickImage(ImageSource.gallery),icon:const Icon(Icons.image),label:const Text('Gallery')),
            OutlinedButton.icon(onPressed:()=>pickImage(ImageSource.camera),icon:const Icon(Icons.camera_alt),label:const Text('Camera')),
            FilledButton.icon(onPressed:recording?stopRecording:startRecording,icon:Icon(recording?Icons.stop:Icons.mic),label:Text(recording?'Stop':'Record')),
          ]),
          for(final f in files.take(8))ListTile(dense:true,leading:const Icon(Icons.insert_drive_file),title:Text(f)),
          TextField(controller:ocrUrl,decoration:const InputDecoration(labelText:'Genesis OCR endpoint')),
          FilledButton(onPressed:runOcr,child:const Text('Run OCR')),
          if(ocrText.isNotEmpty)SelectableText(ocrText),
        ]))),
        SliverToBoxAdapter(child:section('12. Permissions',Column(children:[
          FilledButton.icon(onPressed:requestPermissions,icon:const Icon(Icons.security),label:const Text('Request Camera / Mic / Location / Notifications / Storage')),
          OutlinedButton(onPressed:cameraPermission,child:const Text('Camera permission')),
        ]))),
        SliverToBoxAdapter(child:section('13. Firebase / Notifications',Column(children:[
          FilledButton.icon(onPressed:localNotification,icon:const Icon(Icons.notifications),label:const Text('Local notification')),
          const Text('Firebase Push, Analytics, Crash Reporting and universal deep links require the real Firebase project files/credentials.'),
        ]))),
        SliverToBoxAdapter(child:section('14. Testing',const Column(children:[
          ListTile(leading:Icon(Icons.check),title:Text('Unit tests')),
          ListTile(leading:Icon(Icons.check),title:Text('Widget tests')),
          ListTile(leading:Icon(Icons.check),title:Text('Integration tests')),
          ListTile(leading:Icon(Icons.check),title:Text('Golden tests')),
        ]))),
        SliverToBoxAdapter(child:section('15. Production',const Column(children:[
          ListTile(leading:Icon(Icons.android),title:Text('Android configuration'),subtitle:Text('CI generates Android project and applies Genesis branding')),
          ListTile(leading:Icon(Icons.image),title:Text('App icon')),
          ListTile(leading:Icon(Icons.launch),title:Text('Splash / signing / release configuration')),
          ListTile(leading:Icon(Icons.apk),title:Text('APK + AAB')),
        ]))),
        SliverToBoxAdapter(child:Padding(padding:const EdgeInsets.all(24),child:Center(child:Text(status)))),
        if(loadingMore)const SliverToBoxAdapter(child:Padding(padding:EdgeInsets.all(24),child:Center(child:CircularProgressIndicator()))),
      ]),
    );
  }
  Widget section(String title,Widget child)=>Padding(
    padding:const EdgeInsets.fromLTRB(12,10,12,0),
    child:Card(child:Padding(padding:const EdgeInsets.all(14),child:Column(
      crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text(title,style:Theme.of(context).textTheme.titleLarge),const Divider(),child]))));
}
