
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:shared_preferences/shared_preferences.dart';

class CloudFlutterIdePage extends StatefulWidget {
  const CloudFlutterIdePage({super.key});
  @override ConsumerState<CloudFlutterIdePage> createState()=>_CloudFlutterIdePageState();
}

class _CloudFlutterIdePageState extends State<CloudFlutterIdePage> {
  final repo=TextEditingController(text:'ly7902800-coder/A');
  final baseBranch=TextEditingController(text:'main');
  final branch=TextEditingController(text:'genesis-cloud-flutter');
  final path=TextEditingController(text:'apps/mobile/lib/main.dart');
  final code=TextEditingController();
  final dio=Dio();
  bool busy=false;
  String status='Cloud Flutter جاهز';
  String target='apk';
  Timer? pollTimer;

  String? get apiBase {
    const value=String.fromEnvironment('GENESIS_API_URL',defaultValue:'');
    return value.isEmpty?null:value;
  }

  Future<Map<String,dynamic>> request(String method,String endpoint,{Map<String,dynamic>? data,Map<String,String>? query}) async {
    final base=apiBase;
    if(base==null)throw Exception('GENESIS_API_URL غير مضبوط');
    final prefs=await SharedPreferences.getInstance();
    final token=prefs.getString('genesis_auth_token');
    final response=await dio.request<Map<String,dynamic>>(
      base+endpoint,
      data:data,
      queryParameters:query,
      options:Options(method:method,headers:{'Content-Type':'application/json',if(token!=null&&token.isNotEmpty)'Authorization':'Bearer '+token}),
    );
    return response.data??<String,dynamic>{};
  }

  Future<void> loadFile() async {
    setState(()=>busy=true);
    try {
      final r=await request('GET','/v1/flutter/workspace/file',query:{
        'repo':repo.text.trim(),'branch':branch.text.trim(),'path':path.text.trim(),
      });
      code.text=r['content']?.toString()??'';
      setState(()=>status='تم جلب الملف من GitHub: '+path.text.trim());
    }catch(e){setState(()=>status='خطأ: '+e.toString());}
    finally{if(mounted)setState(()=>busy=false);}
  }

  Future<void> ensureBranch() async {
    setState(()=>busy=true);
    try {
      final r=await request('POST','/v1/flutter/workspace/branch',data:{
        'repo':repo.text.trim(),'baseBranch':baseBranch.text.trim(),'branch':branch.text.trim(),
      });
      setState(()=>status='Branch جاهز: '+jsonEncode(r['branch']));
    }catch(e){setState(()=>status='Branch error: '+e.toString());}
    finally{if(mounted)setState(()=>busy=false);}
  }

  Future<void> saveFile() async {
    setState(()=>busy=true);
    try {
      await ensureBranch();
      await request('PUT','/v1/flutter/workspace/file',data:{
        'repo':repo.text.trim(),'branch':branch.text.trim(),'path':path.text.trim(),
        'content':code.text,'message':'Genesis Cloud Flutter: edit '+path.text.trim(),
      });
      setState(()=>status='تم حفظ الكود في Flutter workspace على GitHub');
    }catch(e){setState(()=>status='Save error: '+e.toString());}
    finally{if(mounted)setState(()=>busy=false);}
  }

  Future<void> pollBuild() async {
    try {
      final r=await request('GET','/v1/flutter/build/status',query:{'repo':repo.text.trim(),'branch':branch.text.trim()});
      if(r['found']!=true)return;
      final s=r['status']?.toString()??'';
      final conclusion=r['conclusion']?.toString();
      if(s=='completed') {
        pollTimer?.cancel();
        setState(()=>status='Build '+(conclusion??'completed')+' | '+(r['htmlUrl']?.toString()??''));
      } else {
        setState(()=>status='Build running: '+s);
      }
    } catch(e) {}
  }

  Future<void> build() async {
    setState(()=>busy=true);
    try {
      await ensureBranch();
      await request('POST','/v1/flutter/build',data:{
        'repo':repo.text.trim(),'branch':branch.text.trim(),'target':target,
      });
      setState(()=>status='تم إرسال '+target.toUpperCase()+' إلى Flutter Build Factory. البناء يعمل على GitHub Actions.');
      pollTimer?.cancel();
      pollTimer=Timer.periodic(const Duration(seconds:8),(_)=>pollBuild());
    }catch(e){setState(()=>status='Build error: '+e.toString());}
    finally{if(mounted)setState(()=>busy=false);}
  }

  @override void dispose(){pollTimer?.cancel();repo.dispose();baseBranch.dispose();branch.dispose();path.dispose();code.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(
      title:const Text('Genesis Cloud Flutter IDE'),
      leading:IconButton(onPressed:()=>context.pop(),icon:const Icon(Icons.arrow_back)),
      actions:[IconButton(onPressed:busy?null:loadFile,icon:const Icon(Icons.download))],
    ),
    body:Column(children:[
      Padding(padding:const EdgeInsets.all(8),child:Wrap(spacing:8,runSpacing:8,children:[
        SizedBox(width:180,child:TextField(controller:repo,decoration:const InputDecoration(labelText:'GitHub repo'))),
        SizedBox(width:120,child:TextField(controller:baseBranch,decoration:const InputDecoration(labelText:'Base'))),
        SizedBox(width:180,child:TextField(controller:branch,decoration:const InputDecoration(labelText:'Workspace branch'))),
        SizedBox(width:280,child:TextField(controller:path,decoration:const InputDecoration(labelText:'Flutter file path'))),
      ])),
      Row(children:[
        const SizedBox(width:8),
        FilledButton.icon(onPressed:busy?null:loadFile,icon:const Icon(Icons.folder_open),label:const Text('Open')),
        const SizedBox(width:8),
        FilledButton.icon(onPressed:busy?null:saveFile,icon:const Icon(Icons.save),label:const Text('Save to Flutter')),
        const SizedBox(width:8),
        DropdownButton<String>(value:target,items:const[
          DropdownMenuItem(value:'apk',child:Text('APK')),
          DropdownMenuItem(value:'aab',child:Text('AAB')),
          DropdownMenuItem(value:'web',child:Text('Web')),
        ],onChanged:(v){if(v!=null)setState(()=>target=v);}),
        const SizedBox(width:8),
        FilledButton.icon(onPressed:busy?null:build,icon:const Icon(Icons.build),label:const Text('Build')),
      ]),
      Expanded(child:Padding(
        padding:const EdgeInsets.all(8),
        child:TextField(
          controller:code,
          expands:true,
          maxLines:null,
          minLines:null,
          textAlignVertical:TextAlignVertical.top,
          style:const TextStyle(fontFamily:'monospace',fontSize:13),
          decoration:const InputDecoration(
            border:OutlineInputBorder(),
            labelText:'Dart / Flutter source code',
            alignLabelWithHint:true,
          ),
        ),
      )),
      Container(width:double.infinity,padding:const EdgeInsets.all(10),child:Text(status)),
    ]),
  );
}
