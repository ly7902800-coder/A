import 'package:flutter/material.dart';

void main()=>runApp(const GenesisApp());

class GenesisApp extends StatelessWidget{
 const GenesisApp({super.key});
 @override Widget build(BuildContext c)=>MaterialApp(debugShowCheckedModeBanner:false,theme:ThemeData.dark(useMaterial3:true),home:const GenesisHome());
}

class GenesisHome extends StatelessWidget{
 const GenesisHome({super.key});
 final modules=const ["Chat","Projects","AI Studio","Files","Source Code","UI Designer","Integrations","Build","Testing","Logs","Releases","Credentials","Settings"];
 @override Widget build(BuildContext c)=>Scaffold(
  appBar:AppBar(title:const Text("✦ Genesis AI"),actions:[IconButton(onPressed:()=>showModalBottomSheet(context:c,builder:(_)=>const GooglePanel()),icon:const Icon(Icons.account_circle))]),
  drawer:Drawer(child:ListView(children:[const DrawerHeader(child:Text("Genesis AI",style:TextStyle(fontSize:28))),...modules.map((x)=>ListTile(title:Text(x)))])),
  body:Center(child:Padding(padding:const EdgeInsets.all(20),child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[
   const Text("ماذا تريد أن أبني؟",style:TextStyle(fontSize:30,fontWeight:FontWeight.bold),textAlign:TextAlign.center),
   const SizedBox(height:14),const Text("Genesis يخطط للمهمة ويطلب الموافقة قبل أي إجراء خارجي.",textAlign:TextAlign.center),
   const SizedBox(height:24),TextField(maxLines:4,decoration:InputDecoration(hintText:"مثال: ابنِ تطبيقًا على FlutterFlow...",border:OutlineInputBorder(borderRadius:BorderRadius.circular(18))))
  ]))
 );
}

class GooglePanel extends StatelessWidget{
 const GooglePanel({super.key});
 @override Widget build(BuildContext c)=>Padding(padding:const EdgeInsets.all(20),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[
  const Text("Google Account",style:TextStyle(fontSize:24,fontWeight:FontWeight.bold)),
  const SizedBox(height:10),const Text("غير متصل"),
  const SizedBox(height:10),FilledButton(onPressed:(){},child:const Text("Connect Google")),
  const Text("سيتم تحويلك إلى Google للموافقة على الصلاحيات.")
 ]));
}
