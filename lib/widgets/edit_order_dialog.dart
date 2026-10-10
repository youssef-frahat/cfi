import 'package:flutter/material.dart';
import '../models/call_models.dart';

class EditOrderDialog extends StatefulWidget {
  final ExtractedOrder order;
  final ValueChanged<ExtractedOrder> onSave;

  const EditOrderDialog({
    super.key,
    required this.order,
    required this.onSave,
  });

  @override
  State<EditOrderDialog> createState() => _EditOrderDialogState();
}

class _EditOrderDialogState extends State<EditOrderDialog> {
  late TextEditingController _tickerController;
  late TextEditingController _quantityController;
  late TextEditingController _priceController;
  late ActionType _action;
  late OrderType _orderType;
  late TimeInForce _timeInForce;

  @override
  void initState() {
    super.initState();
    _tickerController = TextEditingController(text: widget.order.ticker);
    _quantityController = TextEditingController(text: widget.order.quantity.toString());
    _priceController = TextEditingController(text: widget.order.price?.toString() ?? '');
    _action = widget.order.action;
    _orderType = widget.order.orderType;
    _timeInForce = widget.order.timeInForce;
  }

  @override
  void dispose() {
    _tickerController.dispose();
    _quantityController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  void _submit() {
    final qty = int.tryParse(_quantityController.text) ?? widget.order.quantity;
    final price = _orderType == OrderType.LIMIT ? double.tryParse(_priceController.text) : null;

    final updated = widget.order.copyWith(
      ticker: _tickerController.text.trim().toUpperCase(),
      action: _action,
      quantity: qty,
      orderType: _orderType,
      price: price,
      timeInForce: _timeInForce,
    );

    widget.onSave(updated);
    Navigator.of(context).pop();
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
                const Icon(Icons.edit_note, color: Color(0xFF00E676)),
                const SizedBox(width: 8),
                const Text(
                  'تعديل مسودة أمر التداول',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white54),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(color: Color(0xFF2A2E39)),
            const SizedBox(height: 12),

            // Action Selector (BUY / SELL)
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('شراء BUY', style: TextStyle(fontWeight: FontWeight.bold))),
                    selected: _action == ActionType.BUY,
                    selectedColor: const Color(0xFF00E676).withValues(alpha: 0.3),
                    onSelected: (val) {
                      if (val) setState(() => _action = ActionType.BUY);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('بيع SELL', style: TextStyle(fontWeight: FontWeight.bold))),
                    selected: _action == ActionType.SELL,
                    selectedColor: Colors.redAccent.withValues(alpha: 0.3),
                    onSelected: (val) {
                      if (val) setState(() => _action = ActionType.SELL);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Ticker & Quantity
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _tickerController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'رمز السهم (Ticker)',
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
                    controller: _quantityController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'الكمية (ورقة)',
                      labelStyle: const TextStyle(color: Colors.white54),
                      filled: true,
                      fillColor: const Color(0xFF131722),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Order Type Selector
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<OrderType>(
                    initialValue: _orderType,
                    dropdownColor: const Color(0xFF1E222D),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'نوع السعر',
                      labelStyle: const TextStyle(color: Colors.white54),
                      filled: true,
                      fillColor: const Color(0xFF131722),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    items: const [
                      DropdownMenuItem(value: OrderType.LIMIT, child: Text('محدد بسعر (LIMIT)')),
                      DropdownMenuItem(value: OrderType.MARKET, child: Text('سعر السوق (MARKET)')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _orderType = val);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                if (_orderType == OrderType.LIMIT)
                  Expanded(
                    child: TextField(
                      controller: _priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'السعر (ج.م)',
                        labelStyle: const TextStyle(color: Colors.white54),
                        filled: true,
                        fillColor: const Color(0xFF131722),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 24),

            // Submit Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('إلغاء', style: TextStyle(color: Colors.white54)),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E676),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                  child: const Text('حفظ التعديلات وإعادة التحقق', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
