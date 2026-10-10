import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/call_models.dart';

class ApiService {
  static const String baseUrl = 'http://127.0.0.1:8000/api';
  static const String wsUrl = 'ws://127.0.0.1:8000/ws/broker';

  WebSocketChannel? _channel;
  StreamController<Map<String, dynamic>>? _wsStreamController;

  Stream<Map<String, dynamic>> get wsStream {
    _wsStreamController ??= StreamController<Map<String, dynamic>>.broadcast();
    _connectWebSocket();
    return _wsStreamController!.stream;
  }

  void _connectWebSocket() {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _channel!.stream.listen(
        (data) {
          try {
            final parsed = jsonDecode(data);
            if (parsed is Map<String, dynamic>) {
              _wsStreamController?.add(parsed);
            }
          } catch (e) {
            if (kDebugMode) print('WS parse error: $e');
          }
        },
        onError: (err) {
          if (kDebugMode) print('WS Error: $err');
          _reconnectWsDelayed();
        },
        onDone: () {
          _reconnectWsDelayed();
        },
      );
    } catch (e) {
      if (kDebugMode) print('WS connect failed: $e');
      _reconnectWsDelayed();
    }
  }

  Timer? _reconnectTimer;
  bool _isDisposed = false;

  void _reconnectWsDelayed() {
    if (_isDisposed) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 4), () {
      if (!_isDisposed && _wsStreamController != null && !_wsStreamController!.isClosed) {
        _connectWebSocket();
      }
    });
  }

  Future<List<CallRecord>> fetchCalls() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/calls')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(utf8.decode(res.bodyBytes));
        return data.map((json) => CallRecord.fromJson(json)).toList();
      }
    } catch (e) {
      if (kDebugMode) print('Fetch calls error: $e');
    }
    return [];
  }

  Future<List<EGXTickerInfo>> fetchTickers() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/egx/tickers')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(utf8.decode(res.bodyBytes));
        return data.map((json) => EGXTickerInfo.fromJson(json)).toList();
      }
    } catch (e) {
      if (kDebugMode) print('Fetch tickers error: $e');
    }
    return [];
  }

  Future<CallRecord?> ingestCall({
    required String clientCode,
    required String clientName,
    required String phoneNumber,
    required String transcript,
    int durationSeconds = 25,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/calls/ingest'),
        body: {
          'client_code': clientCode,
          'client_name': clientName,
          'phone_number': phoneNumber,
          'transcript': transcript,
          'duration_seconds': durationSeconds.toString(),
        },
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        return CallRecord.fromJson(data);
      }
    } catch (e) {
      if (kDebugMode) print('Ingest call error: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>?> approveOrder({
    required String orderId,
    required String brokerId,
    String? brokerNotes,
    ExtractedOrder? editedOrder,
  }) async {
    try {
      final body = {
        'broker_id': brokerId,
        'broker_notes': brokerNotes,
        'edited_order': editedOrder?.toJson(),
      };

      final res = await http.post(
        Uri.parse('$baseUrl/orders/$orderId/approve'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes));
      }
    } catch (e) {
      if (kDebugMode) print('Approve order error: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>?> rejectOrder({
    required String orderId,
    required String brokerId,
    required String rejectionReason,
  }) async {
    try {
      final body = {
        'broker_id': brokerId,
        'rejection_reason': rejectionReason,
      };

      final res = await http.post(
        Uri.parse('$baseUrl/orders/$orderId/reject'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes));
      }
    } catch (e) {
      if (kDebugMode) print('Reject order error: $e');
    }
    return null;
  }

  Future<ExtractedOrder?> editOrder({
    required String orderId,
    required ExtractedOrder edited,
  }) async {
    try {
      final res = await http.put(
        Uri.parse('$baseUrl/orders/$orderId/edit'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(edited.toJson()),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        return ExtractedOrder.fromJson(data['order']);
      }
    } catch (e) {
      if (kDebugMode) print('Edit order error: $e');
    }
    return null;
  }

  Future<List<AuditRecord>> fetchAuditTrail() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/audit')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(utf8.decode(res.bodyBytes));
        return data.map((json) => AuditRecord.fromJson(json)).toList();
      }
    } catch (e) {
      if (kDebugMode) print('Fetch audit error: $e');
    }
    return [];
  }

  void dispose() {
    _isDisposed = true;
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _wsStreamController?.close();
  }
}
