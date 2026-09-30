import 'package:flutter/material.dart';

void main() {
  runApp(const GenesisApp());
}

class GenesisApp extends StatelessWidget {
  const GenesisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Genesis AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Text(
            'Genesis AI',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}
