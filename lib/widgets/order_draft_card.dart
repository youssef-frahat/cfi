import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/call_models.dart';

class OrderDraftCard extends StatelessWidget {
  final ExtractedOrder order;
  final VoidCallback onJumpToAudio;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback onEdit;

  const OrderDraftCard({
    super.key,
    required this.order,
    required this.onJumpToAudio,
    required this.onApprove,
    required this.onReject,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat('#,##0.00', 'en_US');
    final qtyFormatter = NumberFormat('#,##0', 'en_US');
    final isBuy = order.action == ActionType.BUY;
    final isApproved = order.status == OrderStatus.APPROVED ||
        order.status == OrderStatus.MODIFIED_AND_APPROVED;
    final isRejected = order.status == OrderStatus.REJECTED;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E222D),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isApproved
              ? const Color(0xFF00E676).withValues(alpha: 0.6)
              : isRejected
                  ? Colors.redAccent.withValues(alpha: 0.6)
                  : order.validationStatus == ValidationStatus.WARNING
                      ? Colors.amber.withValues(alpha: 0.5)
                      : const Color(0xFF2A2E39),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Row: Side badge, Ticker, Company Name, Status Chip
            Row(
              children: [
                // Side Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isBuy
                        ? const Color(0xFF00E676).withValues(alpha: 0.15)
                        : Colors.redAccent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: isBuy ? const Color(0xFF00E676) : Colors.redAccent,
                    ),
                  ),
                  child: Text(
                    isBuy ? 'شراء BUY' : 'بيع SELL',
                    style: TextStyle(
                      color: isBuy ? const Color(0xFF00E676) : Colors.redAccent,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                // Ticker Symbol
                Text(
                  order.ticker,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    order.companyNameRaw,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                    ),
                  ),
                ),
                // Status Badge
                if (isApproved)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00E676).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle, size: 14, color: Color(0xFF00E676)),
                        SizedBox(width: 4),
                        Text(
                          'معتمد ومُرسل للـ OMS',
                          style: TextStyle(color: Color(0xFF00E676), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  )
                else if (isRejected)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.redAccent.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.cancel, size: 14, color: Colors.redAccent),
                        SizedBox(width: 4),
                        Text(
                          'مرفوض من الوسيط',
                          style: TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.hourglass_top, size: 14, color: Colors.amber),
                        SizedBox(width: 4),
                        Text(
                          'بانتظار اعتماد الوسيط (HITL)',
                          style: TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const Divider(color: Color(0xFF2A2E39), height: 24),

            // Order Metrics Grid
            Row(
              children: [
                // Quantity
                Expanded(
                  child: _MetricTile(
                    label: 'الكمية (ورقة/سهم)',
                    value: qtyFormatter.format(order.quantity),
                    subValue: 'سهم معتمد',
                    highlightColor: Colors.white,
                  ),
                ),
                // Order Type & Price
                Expanded(
                  child: _MetricTile(
                    label: 'نوع الأمر والسعر',
                    value: order.orderType == OrderType.MARKET
                        ? 'سعر السوق (MARKET)'
                        : '${currencyFormatter.format(order.price ?? 0)} ج.م',
                    subValue: order.orderType == OrderType.LIMIT ? 'أمر محدد (LIMIT)' : 'تنفيذ فوري',
                    highlightColor: const Color(0xFF29B6F6),
                  ),
                ),
                // Market Comparison & Circuit Breaker
                Expanded(
                  child: _MetricTile(
                    label: 'سعر السوق والحدود السعرية',
                    value: '${currencyFormatter.format(order.currentMarketPrice ?? 0)} ج.م',
                    subValue: 'الحدود: ${order.priceBandLower?.toStringAsFixed(1) ?? "--"} - ${order.priceBandUpper?.toStringAsFixed(1) ?? "--"}',
                    highlightColor: Colors.white70,
                  ),
                ),
                // Total Estimated Value
                Expanded(
                  child: _MetricTile(
                    label: 'القيمة التقديرية',
                    value: '${currencyFormatter.format(order.estimatedTotalEgp ?? 0)} ج.م',
                    subValue: 'صالح لجلسة اليوم (DAY)',
                    highlightColor: const Color(0xFFFFD54F),
                  ),
                ),
              ],
            ),

            // Audio Seeking & Ambiguity Warnings
            const SizedBox(height: 12),
            Row(
              children: [
                // Jump to Audio Button
                InkWell(
                  onTap: onJumpToAudio,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2A2E39),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.play_circle_fill, size: 16, color: Color(0xFF00E676)),
                        const SizedBox(width: 6),
                        Text(
                          'استمع لتفصيل الأمر (${order.audioTimestampStart} - ${order.audioTimestampEnd})',
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                // Tick Size confirmation chip
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.blueGrey.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Tick Size: ${order.tickSize ?? 0.01} ج.م',
                    style: const TextStyle(color: Colors.blueGrey, fontSize: 11),
                  ),
                ),
                const Spacer(),
                if (order.notes != null)
                  Expanded(
                    child: Text(
                      order.notes!,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.end,
                      style: const TextStyle(color: Colors.white38, fontSize: 11, fontStyle: FontStyle.italic),
                    ),
                  ),
              ],
            ),

            // Validation Issues Warnings (if any)
            if (order.validationIssues.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: order.validationIssues.map((issue) {
                    return Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, size: 14, color: Colors.amber),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            issue,
                            style: const TextStyle(color: Colors.amber, fontSize: 12),
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ],

            // Approved FIX Message Output
            if (isApproved && order.fixMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF131722),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF00E676).withValues(alpha: 0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.hub_outlined, size: 14, color: Color(0xFF00E676)),
                        SizedBox(width: 6),
                        Text(
                          'FIX 4.4 NewOrderSingle (MsgType=D) - تم الإرسال للـ OMS',
                          style: TextStyle(color: Color(0xFF00E676), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    SelectableText(
                      order.fixMessage!,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontFamily: 'monospace',
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Action Buttons (if still Pending)
            if (!isApproved && !isRejected) ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  // Reject Button
                  OutlinedButton.icon(
                    onPressed: onReject,
                    icon: const Icon(Icons.close, size: 16, color: Colors.redAccent),
                    label: const Text('رفض الأمر', style: TextStyle(color: Colors.redAccent)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.redAccent),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Edit Draft Button
                  ElevatedButton.icon(
                    onPressed: onEdit,
                    icon: const Icon(Icons.edit_outlined, size: 16, color: Colors.white),
                    label: const Text('تعديل المسودة', style: TextStyle(color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF363C4E),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // 1-Click Approve Button
                  ElevatedButton.icon(
                    onPressed: onApprove,
                    icon: const Icon(Icons.check_circle_outline, size: 18, color: Colors.black),
                    label: const Text(
                      'اعتماد وإرسال للـ OMS',
                      style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00E676),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 2,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final String subValue;
  final Color highlightColor;

  const _MetricTile({
    required this.label,
    required this.value,
    required this.subValue,
    required this.highlightColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Colors.white38, fontSize: 11),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            color: highlightColor,
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          subValue,
          style: const TextStyle(color: Colors.white54, fontSize: 10),
        ),
      ],
    );
  }
}
