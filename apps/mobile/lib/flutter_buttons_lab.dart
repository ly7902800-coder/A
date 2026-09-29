import 'package:flutter/material.dart';

class ButtonsPage extends StatefulWidget {
  const ButtonsPage({super.key});

  @override
  State<ButtonsPage> createState() => _ButtonsPageState();
}

class _ButtonsPageState extends State<ButtonsPage> {
  String _segment = 'يوم';
  final List<bool> _toggles = [true, false, false];
  String? _dropdownValue = 'الخيار 1';
  bool _liked = false;

  void _msg(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Widget _title(String t) => Padding(
        padding: const EdgeInsets.only(top: 20, bottom: 8),
        child: Text(
          t,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('أزرار Flutter')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _title('ElevatedButton'),
            ElevatedButton(
              onPressed: () => _msg('Elevated'),
              child: const Text('اضغط'),
            ),
            ElevatedButton.icon(
              onPressed: () => _msg('Elevated icon'),
              icon: const Icon(Icons.send),
              label: const Text('إرسال'),
            ),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 14,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
                elevation: 6,
              ),
              child: const Text('زر مخصص'),
            ),
            const ElevatedButton(
              onPressed: null,
              child: Text('معطل'),
            ),

            _title('FilledButton'),
            FilledButton(
              onPressed: () => _msg('Filled'),
              child: const Text('Filled'),
            ),
            FilledButton.tonal(
              onPressed: () => _msg('Tonal'),
              child: const Text('Filled Tonal'),
            ),

            _title('OutlinedButton'),
            OutlinedButton(
              onPressed: () => _msg('Outlined'),
              child: const Text('Outlined'),
            ),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.download),
              label: const Text('تحميل'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(
                  color: Colors.indigo,
                  width: 2,
                ),
              ),
            ),

            _title('TextButton'),
            TextButton(
              onPressed: () => _msg('Text'),
              child: const Text('Text Button'),
            ),
            TextButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.link),
              label: const Text('رابط'),
            ),

            _title('IconButton'),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.home),
                  onPressed: () => _msg('Home'),
                ),
                IconButton.filled(
                  icon: const Icon(Icons.add),
                  onPressed: () {},
                ),
                IconButton.outlined(
                  icon: const Icon(Icons.edit),
                  onPressed: () {},
                ),
                IconButton(
                  icon: Icon(
                    _liked ? Icons.favorite : Icons.favorite_border,
                  ),
                  color: _liked ? Colors.red : null,
                  onPressed: () => setState(() => _liked = !_liked),
                ),
              ],
            ),

            _title('FloatingActionButton'),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                FloatingActionButton(
                  heroTag: 'buttons_f1',
                  onPressed: () {},
                  child: const Icon(Icons.add),
                ),
                FloatingActionButton.small(
                  heroTag: 'buttons_f2',
                  onPressed: () {},
                  child: const Icon(Icons.add),
                ),
                FloatingActionButton.large(
                  heroTag: 'buttons_f3',
                  onPressed: () {},
                  child: const Icon(Icons.add),
                ),
                FloatingActionButton.extended(
                  heroTag: 'buttons_f4',
                  onPressed: () {},
                  icon: const Icon(Icons.add),
                  label: const Text('جديد'),
                ),
              ],
            ),

            _title('SegmentedButton'),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'يوم', label: Text('يوم')),
                ButtonSegment(value: 'اسبوع', label: Text('اسبوع')),
                ButtonSegment(value: 'شهر', label: Text('شهر')),
              ],
              selected: {_segment},
              onSelectionChanged: (s) {
                setState(() => _segment = s.first);
              },
            ),

            _title('ToggleButtons'),
            ToggleButtons(
              isSelected: _toggles,
              onPressed: (i) {
                setState(() => _toggles[i] = !_toggles[i]);
              },
              borderRadius: BorderRadius.circular(8),
              children: const [
                Icon(Icons.format_bold),
                Icon(Icons.format_italic),
                Icon(Icons.format_underline),
              ],
            ),

            _title('PopupMenuButton'),
            PopupMenuButton<String>(
              onSelected: (v) => _msg('اخترت $v'),
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'تعديل', child: Text('تعديل')),
                PopupMenuItem(value: 'حذف', child: Text('حذف')),
                PopupMenuDivider(),
                PopupMenuItem(value: 'مشاركة', child: Text('مشاركة')),
              ],
            ),

            _title('DropdownButton'),
            DropdownButton<String>(
              value: _dropdownValue,
              items: ['الخيار 1', 'الخيار 2', 'الخيار 3']
                  .map(
                    (e) => DropdownMenuItem(
                      value: e,
                      child: Text(e),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => _dropdownValue = v),
            ),

            _title('InkWell'),
            Material(
              color: Colors.indigo.shade50,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => _msg('InkWell tap'),
                onLongPress: () => _msg('InkWell long press'),
                child: const Padding(
                  padding: EdgeInsets.all(20),
                  child: Center(
                    child: Text('اضغط أو اضغط مطولاً'),
                  ),
                ),
              ),
            ),

            _title('GestureDetector'),
            GestureDetector(
              onTap: () => _msg('tap'),
              onDoubleTap: () => _msg('double tap'),
              onLongPress: () => _msg('long press'),
              onPanUpdate: (d) {},
              child: Container(
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.amber,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text('ضغطة / ضغطتين / مطولة'),
                ),
              ),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
