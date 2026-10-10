import 'package:flutter/material.dart';

class IngestSimulationDialog extends StatefulWidget {
  final Future<void> Function({
    required String clientCode,
    required String clientName,
    required String phone,
    required String transcript,
  }) onIngest;

  const IngestSimulationDialog({
    super.key,
    required this.onIngest,
  });

  @override
  State<IngestSimulationDialog> createState() => _IngestSimulationDialogState();
}

class _IngestSimulationDialogState extends State<IngestSimulationDialog> {
  final TextEditingController _clientCodeController = TextEditingController(text: '10542');
  final TextEditingController _clientNameController = TextEditingController(text: 'أحمد ممدوح عبد العزيز');
  final TextEditingController _phoneController = TextEditingController(text: '+20 100 123 4567');
  final TextEditingController _transcriptController = TextEditingController(
    text: 'اشتري لي عشر تلاف ورقة في التجاري الدولي على 85 جنيه وخمسين قرش',
  );

  bool _isSubmitting = false;

  final List<Map<String, String>> _presets = [
    {
      'title': 'سيناريو معايير القبول (COMI شراء محدد)',
      'code': '10542',
      'name': 'أحمد ممدوح عبد العزيز',
      'phone': '+20 100 123 4567',
      'transcript': 'اشتري لي عشر تلاف ورقة في التجاري الدولي على 85 جنيه وخمسين قرش',
    },
    {
      'title': 'أمر مركب (بيع طلعت مصطفى ماركت + شراء فوري)',
      'code': '10988',
      'name': 'محمد محمود الشناوي',
      'phone': '+20 112 345 6789',
      'transcript': 'بيع خمس تلاف ورقة في طلعت مصطفى ماركت واشتري بالفلوس فوري على 7 جنيه و45 قرش',
    },
    {
      'title': 'ألفاظ عامية وأرقام مركبة (نص مليون ورقة بلتون)',
      'code': '11420',
      'name': 'كريم السعدني',
      'phone': '+20 120 987 6543',
      'transcript': 'عايز نص مليون ورقة بلتون ليميت على 3 جنيه و15 قرش في جلسة النهارده',
    },
    {
      'title': 'مكالمة استفسار فقط (تصفية الأوامر غير التنفيذية)',
      'code': '12055',
      'name': 'طارق الشريف',
      'phone': '+20 101 987 1122',
      'transcript': 'هو السهم بتاع السويدي بكام النهارده؟ وشايف السهم رايح فين؟ لو نزل لـ 45 هبقى اشتري',
    },
  ];

  void _applyPreset(Map<String, String> p) {
    setState(() {
      _clientCodeController.text = p['code']!;
      _clientNameController.text = p['name']!;
      _phoneController.text = p['phone']!;
      _transcriptController.text = p['transcript']!;
    });
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    await widget.onIngest(
      clientCode: _clientCodeController.text.trim(),
      clientName: _clientNameController.text.trim(),
      phone: _phoneController.text.trim(),
      transcript: _transcriptController.text.trim(),
    );
    if (mounted) {
      setState(() => _isSubmitting = false);
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1E222D),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 600,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.phone_in_talk, color: Color(0xFF00E676)),
                const SizedBox(width: 8),
                const Text(
                  'محاكاة استلام مكالمة مسجلة جديدة (PBX Ingestion Webhook)',
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
            const Text(
              'اختر من السيناريوهات الجاهزة أو اكتب نص مكالمة صوتية عامية لتحليلها بنموذج الذكاء الاصطناعي واستخراج مسودة الأمر فوراً:',
              style: TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 12),

            // Preset Buttons
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _presets.map((p) {
                return ActionChip(
                  label: Text(p['title']!, style: const TextStyle(fontSize: 11)),
                  backgroundColor: const Color(0xFF2A2E39),
                  labelStyle: const TextStyle(color: Colors.white),
                  onPressed: () => _applyPreset(p),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _clientCodeController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'كود العميل',
                      labelStyle: const TextStyle(color: Colors.white54),
                      filled: true,
                      fillColor: const Color(0xFF131722),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _clientNameController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'اسم العميل',
                      labelStyle: const TextStyle(color: Colors.white54),
                      filled: true,
                      fillColor: const Color(0xFF131722),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _transcriptController,
              maxLines: 4,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'تفريغ المكالمة الصوتية (المصدر الصوتي)',
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
                ElevatedButton.icon(
                  onPressed: _isSubmitting ? null : _submit,
                  icon: _isSubmitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : const Icon(Icons.cloud_upload_outlined, size: 18, color: Colors.black),
                  label: Text(
                    _isSubmitting ? 'جاري التحليل والاستخراج...' : 'رفع ومعالجة المكالمة في الـ Engine',
                    style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E676),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
