import 'package:flutter/material.dart';

class LayoutPage extends StatelessWidget {
  const LayoutPage({super.key});

  Widget box(String text, Color color, {double? w, double? h}) => Container(
    width: w, height: h, alignment: Alignment.center,
    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
    child: Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
  );

  Widget section(String title, String note, Widget child) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      Text(note, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
      const SizedBox(height: 10), child,
    ]),
  );

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final orientation = MediaQuery.orientationOf(context);
    final safe = MediaQuery.paddingOf(context);
    return Scaffold(
      appBar: AppBar(title: const Text('التخطيط Layout'), centerTitle: true),
      body: SafeArea(child: ListView(padding: const EdgeInsets.all(16), children: [
        section('Container','حجم ولون وحدود وظل وتدرج وpadding',
          Container(height:120,width:double.infinity,padding:const EdgeInsets.all(16),alignment:Alignment.centerLeft,
            decoration:BoxDecoration(
              gradient:const LinearGradient(colors:[Color(0xFF5C6BC0),Color(0xFF26C6DA)]),
              borderRadius:BorderRadius.circular(20),
              boxShadow:[BoxShadow(color:Colors.indigo.withValues(alpha:.35),blurRadius:16,offset:const Offset(0,8))]),
            child:const Text('Container مع تدرج وظل',style:TextStyle(color:Colors.white,fontSize:20,fontWeight:FontWeight.bold)))),
        section('Row و Column','المحور الرئيسي والمتعامد',
          Column(children:[
            Container(height:90,color:Colors.grey.shade200,child:Row(mainAxisAlignment:MainAxisAlignment.spaceEvenly,children:[box('1',Colors.indigo,w:50,h:50),box('2',Colors.teal,w:50,h:70),box('3',Colors.orange,w:50,h:40)])),
            const SizedBox(height:8),
            Container(height:150,color:Colors.grey.shade200,child:Column(mainAxisAlignment:MainAxisAlignment.spaceBetween,crossAxisAlignment:CrossAxisAlignment.stretch,children:[box('stretch 1',Colors.indigo,h:40),box('stretch 2',Colors.teal,h:40)])),
          ])),
        section('Expanded و Flexible و Spacer','توزيع المساحة باستخدام flex',
          Column(children:[
            SizedBox(height:50,child:Row(children:[Expanded(flex:2,child:box('flex 2',Colors.indigo)),const SizedBox(width:6),Expanded(child:box('flex 1',Colors.teal)),const SizedBox(width:6),Flexible(child:box('Flexible',Colors.orange,w:60))])),
            const SizedBox(height:10),
            const Row(children:[Icon(Icons.arrow_back),Spacer(),Text('وسط'),Spacer(flex:2),Icon(Icons.arrow_forward)]),
          ])),
        section('Stack و Positioned و Align','وضع العناصر فوق بعضها',
          Container(height:270,decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(20),border:Border.all(color:Colors.grey.shade300)),clipBehavior:Clip.antiAlias,
            child:Stack(children:[
              Container(height:150,decoration:const BoxDecoration(gradient:LinearGradient(colors:[Color(0xFF3949AB),Color(0xFF8E24AA)]))),
              Positioned(top:6,right:6,child:IconButton(icon:const Icon(Icons.more_vert,color:Colors.white),onPressed:(){})),
              const Align(alignment:Alignment(-.9,-.7),child:Text('ملفي الشخصي',style:TextStyle(color:Colors.white70,fontSize:14))),
              Positioned(top:100,left:0,right:0,child:Center(child:Stack(children:[
                Container(padding:const EdgeInsets.all(4),decoration:const BoxDecoration(color:Colors.white,shape:BoxShape.circle),child:const CircleAvatar(radius:46,backgroundColor:Color(0xFFE8EAF6),child:Icon(Icons.person,size:50,color:Colors.indigo))),
                Positioned(right:6,bottom:6,child:Container(width:20,height:20,decoration:BoxDecoration(color:Colors.green,shape:BoxShape.circle,border:Border.all(color:Colors.white,width:3)))),
              ]))),
              const Positioned(top:212,left:0,right:0,child:Column(children:[Text('محمد احمد',style:TextStyle(fontSize:18,fontWeight:FontWeight.bold)),Text('مطور تطبيقات',style:TextStyle(color:Colors.grey))])),
            ])),
        section('Wrap','ينتقل لسطر جديد تلقائيًا',
          Wrap(spacing:8,runSpacing:8,children:[for(final t in ['Flutter','Dart','Firebase','Riverpod','Bloc','REST API','Animations','Clean Architecture'])Chip(label:Text(t),avatar:const Icon(Icons.tag,size:16))])),
        section('SizedBox و Padding و Align و ConstrainedBox','التحكم بالمسافات والحجم والمحاذاة',
          Column(children:[
            Container(height:90,width:double.infinity,color:Colors.grey.shade200,child:Align(alignment:Alignment.bottomRight,child:Padding(padding:const EdgeInsets.all(8),child:box('Align + Padding',Colors.indigo,w:140,h:40)))),
            const SizedBox(height:8),
            Align(alignment:AlignmentDirectional.centerStart,child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:200,minHeight:50),child:box('maxWidth 200',Colors.teal,h:50))),
            const SizedBox(height:8),
            Container(height:24,decoration:BoxDecoration(color:Colors.grey.shade300,borderRadius:BorderRadius.circular(12)),child:FractionallySizedBox(alignment:AlignmentDirectional.centerStart,widthFactor:.65,child:Container(decoration:BoxDecoration(color:Colors.indigo,borderRadius:BorderRadius.circular(12))))),
          ])),
        section('AspectRatio و FittedBox','الحفاظ على النسبة وتصغير المحتوى',
          Row(children:[
            Expanded(child:AspectRatio(aspectRatio:16/9,child:box('16:9',Colors.deepOrange))),
            const SizedBox(width:10),
            SizedBox(width:130,height:50,child:Container(color:Colors.grey.shade200,child:const FittedBox(fit:BoxFit.scaleDown,child:Text('نص كبير جدا يتقلص',style:TextStyle(fontSize:40))))),
          ])),
        section('IntrinsicHeight','توحيد ارتفاع عناصر الصف',
          IntrinsicHeight(child:Row(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
            Expanded(child:Container(padding:const EdgeInsets.all(12),decoration:BoxDecoration(color:Colors.indigo.shade50,borderRadius:BorderRadius.circular(12)),child:const Text('نص قصير'))),
            const SizedBox(width:8),
            Expanded(child:Container(padding:const EdgeInsets.all(12),decoration:BoxDecoration(color:Colors.teal.shade50,borderRadius:BorderRadius.circular(12)),child:const Text('نص طويل جدًا يأخذ عدة اسطر ويجبر البطاقة المجاورة أن تمتد لنفس الارتفاع تلقائيًا'))),
          ]))),
        section('LayoutBuilder و MediaQuery','متجاوب: عمودي للصغير وأفقي للكبير',
          LayoutBuilder(builder:(context,c){
            final wide=c.maxWidth>600;
            final a=box('بطاقة A',Colors.indigo,h:80);
            final b=box('بطاقة B',Colors.teal,h:80);
            return Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
              Text('عرض المساحة: '+c.maxWidth.round().toString()+' | الوضع: '+(wide?'واسع (صف)':'ضيق (عمود)')),
              const SizedBox(height:8),
              if(wide) Row(children:[Expanded(child:a),const SizedBox(width:10),Expanded(child:b)])
              else Column(children:[a,const SizedBox(height:10),b]),
            ]);
          })),
        Container(padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:Colors.indigo.shade50,borderRadius:BorderRadius.circular(14)),
          child:Text('MediaQuery\nالشاشة: '+size.width.round().toString()+' × '+size.height.round().toString()+'\nالاتجاه: '+(orientation==Orientation.portrait?'طولي':'عرضي')+'\nالحافة العلوية الآمنة: '+safe.top.round().toString(),style:const TextStyle(height:1.6))),
        const SizedBox(height:30),
      ])),
    );
  }
}
