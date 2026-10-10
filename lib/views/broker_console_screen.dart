import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/broker_provider.dart';
import '../widgets/waveform_visualizer.dart';
import '../widgets/order_draft_card.dart';
import '../widgets/edit_order_dialog.dart';
import '../widgets/reject_order_dialog.dart';
import '../widgets/ingest_simulation_dialog.dart';
import '../widgets/compliance_vault_sheet.dart';

class BrokerConsoleScreen extends StatelessWidget {
  const BrokerConsoleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFF131722),
        appBar: _buildAppBar(context),
        body: Consumer<BrokerProvider>(
          builder: (context, provider, _) {
            if (provider.isLoading && provider.calls.isEmpty) {
              return const Center(child: CircularProgressIndicator(color: Color(0xFF00E676)));
            }

            return Row(
              children: [
                // 1. Left Feed: Calls List
                SizedBox(
                  width: 330,
                  child: _CallsFeedPanel(provider: provider),
                ),
                const VerticalDivider(color: Color(0xFF2A2E39), width: 1),

                // 2. Center: Active Call & Order Drafts Console
                Expanded(
                  flex: 3,
                  child: _ActiveCallConsole(provider: provider),
                ),
                const VerticalDivider(color: Color(0xFF2A2E39), width: 1),

                // 3. Right: EGX Market Watch & FIX Monitor
                SizedBox(
                  width: 320,
                  child: _MarketWatchPanel(provider: provider),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    final provider = context.watch<BrokerProvider>();

    return AppBar(
      backgroundColor: const Color(0xFF1E222D),
      elevation: 0,
      titleSpacing: 12,
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFF00E676).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.record_voice_over, color: Color(0xFF00E676), size: 20),
          ),
          const SizedBox(width: 8),
          const Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'CFI Record | EGX HITL',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                Text(
                  'FRA Copilot',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Colors.white54, fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        // Pending Review Badge
        Container(
          margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: Colors.amber.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.pending_actions, size: 14, color: Colors.amber),
              const SizedBox(width: 4),
              Text(
                'معلق: ${provider.pendingReviewCount}',
                style: const TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),

        // Compliance Vault Button
        IconButton(
          tooltip: 'أرشيف الرقابة FRA (WORM 5-Year Vault)',
          icon: const Icon(Icons.shield_outlined, color: Color(0xFF00E676), size: 20),
          onPressed: () {
            showDialog(
              context: context,
              builder: (ctx) => ComplianceVaultSheet(
                records: provider.auditRecords,
                activeAuditReferenceId: provider.selectedCall?.auditReferenceId,
                latestFixMessage: provider.latestFixMessage,
                latestSha256Hash: provider.latestAuditHash,
              ),
            );
          },
        ),

        // Ingest Call Simulation Button
        ElevatedButton.icon(
          onPressed: () {
            showDialog(
              context: context,
              builder: (ctx) => IngestSimulationDialog(
                onIngest: ({required clientCode, required clientName, required phone, required transcript}) =>
                    provider.simulateIngest(
                  clientCode: clientCode,
                  clientName: clientName,
                  phone: phone,
                  transcript: transcript,
                ),
              ),
            );
          },
          icon: const Icon(Icons.add_call, size: 14, color: Colors.black),
          label: const Text('مكالمة جديدة', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF00E676),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
          ),
        ),
        const SizedBox(width: 4),

        // Refresh Button
        IconButton(
          icon: const Icon(Icons.refresh, color: Colors.white70, size: 20),
          tooltip: 'تحديث البيانات اللحظية',
          onPressed: () => provider.refreshAll(),
        ),
        const SizedBox(width: 8),
      ],
    );
  }
}

// ---------------- LEFT CALLS FEED PANEL ----------------

class _CallsFeedPanel extends StatelessWidget {
  final BrokerProvider provider;

  const _CallsFeedPanel({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF181C27),
      child: Column(
        children: [
          // Filter Tabs
          Container(
            padding: const EdgeInsets.all(8),
            color: const Color(0xFF1E222D),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(label: 'الكل', value: 'ALL', current: provider.filterStatus, onSelect: provider.setFilterStatus),
                  const SizedBox(width: 6),
                  _FilterChip(label: 'بانتظار الاعتماد', value: 'PENDING', current: provider.filterStatus, onSelect: provider.setFilterStatus),
                  const SizedBox(width: 6),
                  _FilterChip(label: 'معتمد', value: 'APPROVED', current: provider.filterStatus, onSelect: provider.setFilterStatus),
                  const SizedBox(width: 6),
                  _FilterChip(label: 'استفسارات', value: 'INQUIRY', current: provider.filterStatus, onSelect: provider.setFilterStatus),
                ],
              ),
            ),
          ),
          const Divider(color: Color(0xFF2A2E39), height: 1),

          // Calls List
          Expanded(
            child: provider.calls.isEmpty
                ? const Center(
                    child: Text('لا توجد مكالمات مطابقة', style: TextStyle(color: Colors.white38, fontSize: 12)),
                  )
                : ListView.separated(
                    itemCount: provider.calls.length,
                    separatorBuilder: (context, index) => const Divider(color: Color(0xFF2A2E39), height: 1),
                    itemBuilder: (context, index) {
                      final call = provider.calls[index];
                      final isSelected = provider.selectedCall?.callId == call.callId;

                      return ListTile(
                        selected: isSelected,
                        selectedTileColor: const Color(0xFF2A2E39),
                        onTap: () => provider.selectCall(call),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        leading: CircleAvatar(
                          radius: 18,
                          backgroundColor: call.extraction.hasActionableOrders
                              ? (call.status == 'APPROVED' ? const Color(0xFF00E676) : Colors.amber).withValues(alpha: 0.2)
                              : Colors.blueGrey.withValues(alpha: 0.2),
                          child: Icon(
                            call.extraction.hasActionableOrders ? Icons.phone_callback : Icons.help_outline,
                            color: call.extraction.hasActionableOrders
                                ? (call.status == 'APPROVED' ? const Color(0xFF00E676) : Colors.amber)
                                : Colors.blueGrey,
                            size: 18,
                          ),
                        ),
                        title: Row(
                          children: [
                            Text(
                              call.clientName,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const Spacer(),
                            Text(
                              '${call.durationSeconds}s',
                              style: const TextStyle(color: Colors.white38, fontSize: 11),
                            ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 3),
                            Row(
                              children: [
                                Text(
                                  'كود: ${call.clientCode}',
                                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                                ),
                                const SizedBox(width: 8),
                                if (call.extraction.hasActionableOrders)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF00E676).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '${call.extraction.orders.length} أوامر',
                                      style: const TextStyle(color: Color(0xFF00E676), fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: Colors.blueGrey.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'استفسار فقط',
                                      style: TextStyle(color: Colors.blueGrey, fontSize: 10),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              call.transcript.replaceAll('\n', ' '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white38, fontSize: 10),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final String value;
  final String current;
  final ValueChanged<String> onSelect;

  const _FilterChip({
    required this.label,
    required this.value,
    required this.current,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = current == value;
    return InkWell(
      onTap: () => onSelect(value),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF00E676) : const Color(0xFF131722),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.black : Colors.white70,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

// ---------------- CENTER ACTIVE CALL & ORDER DRAFTS CONSOLE ----------------

class _ActiveCallConsole extends StatelessWidget {
  final BrokerProvider provider;

  const _ActiveCallConsole({required this.provider});

  @override
  Widget build(BuildContext context) {
    final call = provider.selectedCall;

    if (call == null) {
      return const Center(
        child: Text('اختر مكالمة مسجلة من القائمة للبدء في المراجعة', style: TextStyle(color: Colors.white38)),
      );
    }

    final hasOrders = call.extraction.hasActionableOrders;

    return Container(
      color: const Color(0xFF131722),
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // 1. Call Meta Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E222D),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF2A2E39)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: const Color(0xFF00E676).withValues(alpha: 0.15),
                  child: const Icon(Icons.person, color: Color(0xFF00E676), size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            call.clientName,
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2A2E39),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'كود: ${call.clientCode}',
                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            call.phoneNumber,
                            style: const TextStyle(color: Colors.white54, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'مرجع الرقابة FRA: ${call.auditReferenceId} | التاريخ: ${call.createdAt}',
                        style: const TextStyle(color: Colors.white38, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                // AI Confidence Meter
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131722),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF00E676).withValues(alpha: 0.4)),
                  ),
                  child: Column(
                    children: [
                      const Text('دقة الاستخراج AI', style: TextStyle(color: Colors.white54, fontSize: 10)),
                      const SizedBox(height: 2),
                      Text(
                        '${(call.extraction.confidenceScore * 100).toInt()}%',
                        style: const TextStyle(
                          color: Color(0xFF00E676),
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Audio Waveform Player
          Row(
            children: [
              IconButton(
                iconSize: 42,
                icon: Icon(
                  provider.isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
                  color: const Color(0xFF00E676),
                ),
                onPressed: provider.togglePlayPause,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: WaveformVisualizer(
                  peaks: call.waveformPeaks,
                  currentSeconds: provider.currentPlaybackSeconds,
                  totalSeconds: call.durationSeconds,
                  onSeek: provider.seekToSeconds,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 3. Transcript Viewer
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF181C27),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF2A2E39)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.notes, size: 16, color: Colors.white70),
                    SizedBox(width: 6),
                    Text(
                      'التفريغ الصوتي الذكي (Voice Transcript & Dialect Processing)',
                      style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SelectableText(
                  call.transcript,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131722),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'ملخص الاتفاق العربي: ${call.extraction.conversationSummaryAr}',
                    style: const TextStyle(color: Color(0xFF29B6F6), fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 4. Extracted Order Drafts Section
          Row(
            children: [
              const Icon(Icons.receipt_long, color: Color(0xFF00E676), size: 20),
              const SizedBox(width: 8),
              const Text(
                'مسودات أوامر التداول المستخرجة (Order Drafts للوسيط)',
                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              if (hasOrders)
                Text(
                  'عدد الأوامر: ${call.extraction.orders.length}',
                  style: const TextStyle(color: Colors.white54, fontSize: 12),
                ),
            ],
          ),
          const SizedBox(height: 12),

          if (!hasOrders)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF1E222D),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF2A2E39)),
              ),
              child: const Column(
                children: [
                  Icon(Icons.info_outline, size: 36, color: Colors.blueGrey),
                  SizedBox(height: 10),
                  Text(
                    'تم تصنيف هذه المكالمة كـ "استفسار ومتابعة سوق" فقط (INQUIRY_ONLY)',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'وفقاً لمعايير الهيئة والتحليل الصوتي (FR-01)، لم يطلب العميل تنفيذ أوامر تداول مباشرة.',
                    style: TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ],
              ),
            )
          else
            ...call.extraction.orders.map((order) {
              return OrderDraftCard(
                order: order,
                onJumpToAudio: () => provider.jumpToTimestamp(order.audioTimestampStart),
                onApprove: () => provider.approveOrder(order),
                onReject: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => RejectOrderDialog(
                      order: order,
                      onConfirmReject: (reason) => provider.rejectOrder(order, reason),
                    ),
                  );
                },
                onEdit: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => EditOrderDialog(
                      order: order,
                      onSave: (edited) => provider.editOrderDraft(edited),
                    ),
                  );
                },
              );
            }),
        ],
      ),
    );
  }
}

// ---------------- RIGHT MARKET WATCH PANEL ----------------

class _MarketWatchPanel extends StatelessWidget {
  final BrokerProvider provider;

  const _MarketWatchPanel({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF181C27),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Market Watch Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            color: const Color(0xFF1E222D),
            child: const Row(
              children: [
                Icon(Icons.show_chart, color: Color(0xFF00E676), size: 18),
                SizedBox(width: 8),
                Text(
                  'أسعار البورصة المصرية اللحظية (EGX30)',
                  style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          const Divider(color: Color(0xFF2A2E39), height: 1),

          // Tickers List
          Expanded(
            child: provider.tickers.isEmpty
                ? const Center(child: Text('جاري جلب أسعار السوق...', style: TextStyle(color: Colors.white38, fontSize: 11)))
                : ListView.separated(
                    itemCount: provider.tickers.length,
                    separatorBuilder: (context, index) => const Divider(color: Color(0xFF2A2E39), height: 1),
                    itemBuilder: (context, index) {
                      final item = provider.tickers[index];
                      final isUp = item.changePct >= 0;

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.ticker,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                Text(
                                  item.nameAr,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Colors.white38, fontSize: 10),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${item.lastPrice.toStringAsFixed(2)} ج.م',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                Text(
                                  '${isUp ? "+" : ""}${item.changePct.toStringAsFixed(2)}%',
                                  style: TextStyle(
                                    color: isUp ? const Color(0xFF00E676) : Colors.redAccent,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),

          // Bottom OMS FIX Status Widget
          Container(
            padding: const EdgeInsets.all(12),
            color: const Color(0xFF1E222D),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.router, size: 14, color: Color(0xFF00E676)),
                    SizedBox(width: 6),
                    Text(
                      'بوابة OMS FIX Gateway: متصلة (PORT 9800)',
                      style: TextStyle(color: Color(0xFF00E676), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'جلسة التداول الرسمية: 09:30 - 14:30 بتوقيت القاهرة',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
