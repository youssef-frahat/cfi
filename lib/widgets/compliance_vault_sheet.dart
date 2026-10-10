import 'package:flutter/material.dart';
import '../models/call_models.dart';

class ComplianceVaultSheet extends StatelessWidget {
  final List<AuditRecord> records;
  final String? activeAuditReferenceId;
  final String? latestFixMessage;
  final String? latestSha256Hash;

  const ComplianceVaultSheet({
    super.key,
    required this.records,
    this.activeAuditReferenceId,
    this.latestFixMessage,
    this.latestSha256Hash,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1E222D),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 780,
        height: 600,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.shield_outlined, color: Color(0xFF00E676), size: 28),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'أرشيف الرقابة والتسجيل الإلزامي (FRA Compliance Vault)',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'المادة (268) اللائحة التنفيذية للقانون 95 لسنة 1992 - تخزين غير قابل للتعديل (WORM 5-Year Storage)',
                      style: TextStyle(color: Colors.white54, fontSize: 11),
                    ),
                  ],
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white54),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(color: Color(0xFF2A2E39), height: 24),

            // Mandate & Integrity Summary Box
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF131722),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF00E676).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.verified, color: Color(0xFF00E676), size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'معرّف التدقيق الرقابي الحالي: ${activeAuditReferenceId ?? "FRA-AUDIT-ACTIVE"}',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        if (latestSha256Hash != null)
                          Text(
                            'SHA-256 Seal: $latestSha256Hash',
                            style: const TextStyle(color: Color(0xFF00E676), fontFamily: 'monospace', fontSize: 10),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text(
              'سجل الحركات المعتمدة والتدقيق المحفوظ في الأرشيف:',
              style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),

            // Audit Records Table
            Expanded(
              child: records.isEmpty
                  ? Center(
                      child: Text(
                        'لا توجد عمليات معتمدة بعد في جلسة اليوم.\nسيتم تسجيل وتشفير كل أمر بمجرد اعتماده من قبل الوسيط.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 13),
                      ),
                    )
                  : ListView.separated(
                      itemCount: records.length,
                      separatorBuilder: (context, index) => const Divider(color: Color(0xFF2A2E39), height: 1),
                      itemBuilder: (context, index) {
                        final rec = records[index];
                        final isApproved = rec.brokerAction.contains('APPROVED');

                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          leading: CircleAvatar(
                            backgroundColor: isApproved
                                ? const Color(0xFF00E676).withValues(alpha: 0.2)
                                : Colors.redAccent.withValues(alpha: 0.2),
                            child: Icon(
                              isApproved ? Icons.check : Icons.close,
                              color: isApproved ? const Color(0xFF00E676) : Colors.redAccent,
                              size: 18,
                            ),
                          ),
                          title: Row(
                            children: [
                              Text(
                                '${rec.action} ${rec.quantity} ${rec.ticker}',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '@ ${rec.price != null ? "${rec.price} ج.م" : "سعر السوق"}',
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                              const Spacer(),
                              Text(
                                rec.timestamp.substring(11, 19),
                                style: const TextStyle(color: Colors.white38, fontFamily: 'monospace', fontSize: 11),
                              ),
                            ],
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 2),
                              Text(
                                'الوسيط: ${rec.brokerId} | العميل: ${rec.clientCode} | المرجع: ${rec.auditReferenceId}',
                                style: const TextStyle(color: Colors.white54, fontSize: 11),
                              ),
                              Text(
                                'التوقيع المشفر: ${rec.sha256Hash.substring(0, 24)}...',
                                style: const TextStyle(color: Color(0xFF00E676), fontFamily: 'monospace', fontSize: 10),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),

            if (latestFixMessage != null) ...[
              const Divider(color: Color(0xFF2A2E39)),
              const Text(
                'رسالة FIX 4.4 المرسلة للـ OMS:',
                style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF131722),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: SelectableText(
                  latestFixMessage!,
                  style: const TextStyle(color: Colors.white70, fontFamily: 'monospace', fontSize: 10),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
