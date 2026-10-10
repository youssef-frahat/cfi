import 'package:flutter/material.dart';
import '../models/call_models.dart';

class RejectOrderDialog extends StatefulWidget {
  final ExtractedOrder order;
  final ValueChanged<String> onConfirmReject;

  const RejectOrderDialog({
    super.key,
    required this.order,
    required this.onConfirmReject,
  });

  @override
  State<RejectOrderDialog> createState() => _RejectOrderDialogState();
}

class _RejectOrderDialogState extends State<RejectOrderDialog> {
  final TextEditingController _reasonController = TextEditingController();
  String _selectedPreset = 'العميل تراجع عن قراره أثناء التأكيد';

  final List<String> _presets = [
    'العميل تراجع عن قراره أثناء التأكيد',
    'الرصيد النقدي / القوة الشرائية للعميل لا تكفي',
    'سعر الأمر خارج النطاق السعري المقبول للجلسة',
    'عدم وضوح الصوت والاسم في تسجيل المكالمة',
    'سبب آخر (تحديد يدوي)',
  ];

  @override
  void initState() {
    super.initState();
    _reasonController.text = _selectedPreset;
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1E222D),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 480,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.redAccent),
                const SizedBox(width: 8),
                const Text(
                  'رفض مسودة الأمر (سجل الرقابة المالية FRA)',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white54),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(color: Color(0xFF2A2E39)),
            const SizedBox(height: 8),
            Text(
              'وفقاً لتعليمات الهيئة العامة للرقابة المالية (المادة 268)، يجب توثيق سبب رفض الأمر في سجل التدقيق غير القابل للتعديل.',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _selectedPreset,
              dropdownColor: const Color(0xFF1E222D),
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'أسباب الرفض الشائعة',
                labelStyle: const TextStyle(color: Colors.white54),
                filled: true,
                fillColor: const Color(0xFF131722),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
              items: _presets
                  .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                  .toList(),
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _selectedPreset = val;
                    if (val != 'سبب آخر (تحديد يدوي)') {
                      _reasonController.text = val;
                    } else {
                      _reasonController.clear();
                    }
                  });
                }
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _reasonController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'سبب الرفض المعتمد',
                labelStyle: const TextStyle(color: Colors.white54),
                filled: true,
                fillColor: const Color(0xFF131722),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('إلغاء', style: TextStyle(color: Colors.white54)),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final reason = _reasonController.text.trim();
                    if (reason.isNotEmpty) {
                      widget.onConfirmReject(reason);
                      Navigator.of(context).pop();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                  child: const Text('تأكيد الرفض والتوثيق في الـ Vault', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
