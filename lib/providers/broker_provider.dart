import 'dart:async';
import 'package:flutter/material.dart';
import '../models/call_models.dart';
import '../services/api_service.dart';

class BrokerProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<CallRecord> _calls = [];
  List<EGXTickerInfo> _tickers = [];
  List<AuditRecord> _auditRecords = [];
  CallRecord? _selectedCall;

  bool _isLoading = false;
  String _filterStatus = 'ALL';
  final String _brokerId = 'BROKER_SHERIF_102';

  // Audio Playback simulation state
  bool _isPlaying = false;
  double _currentPlaybackSeconds = 0.0;
  Timer? _playbackTimer;
  String? _highlightedOrderTimestamp;

  // Last FIX message generated for compliance inspection modal
  String? _latestFixMessage;
  String? _latestAuditHash;

  // Getters
  List<CallRecord> get calls {
    if (_filterStatus == 'ALL') return _calls;
    if (_filterStatus == 'PENDING') {
      return _calls.where((c) => c.status == 'PENDING_REVIEW').toList();
    }
    if (_filterStatus == 'APPROVED') {
      return _calls.where((c) => c.status == 'APPROVED').toList();
    }
    if (_filterStatus == 'REJECTED') {
      return _calls.where((c) => c.status == 'REJECTED').toList();
    }
    if (_filterStatus == 'INQUIRY') {
      return _calls.where((c) => c.status == 'INQUIRY').toList();
    }
    return _calls;
  }

  List<EGXTickerInfo> get tickers => _tickers;
  List<AuditRecord> get auditRecords => _auditRecords;
  CallRecord? get selectedCall => _selectedCall;
  bool get isLoading => _isLoading;
  String get filterStatus => _filterStatus;
  String get brokerId => _brokerId;
  bool get isPlaying => _isPlaying;
  double get currentPlaybackSeconds => _currentPlaybackSeconds;
  String? get highlightedOrderTimestamp => _highlightedOrderTimestamp;
  String? get latestFixMessage => _latestFixMessage;
  String? get latestAuditHash => _latestAuditHash;

  int get pendingReviewCount =>
      _calls.where((c) => c.status == 'PENDING_REVIEW').length;

  BrokerProvider() {
    _init();
  }

  Future<void> _init() async {
    await refreshAll();
    _listenToWebSocket();
  }

  void _listenToWebSocket() {
    _apiService.wsStream.listen((event) {
      // Refresh on real-time backend updates
      refreshAll();
    });
  }

  void setFilterStatus(String filter) {
    _filterStatus = filter;
    notifyListeners();
  }

  void selectCall(CallRecord call) {
    _selectedCall = call;
    pauseAudio();
    _currentPlaybackSeconds = 0.0;
    _highlightedOrderTimestamp = null;
    notifyListeners();
  }

  Future<void> refreshAll() async {
    _isLoading = true;
    notifyListeners();

    try {
      final fetchedCalls = await _apiService.fetchCalls();
      final fetchedTickers = await _apiService.fetchTickers();
      final fetchedAudit = await _apiService.fetchAuditTrail();

      _calls = fetchedCalls;
      _tickers = fetchedTickers;
      _auditRecords = fetchedAudit;

      if (_calls.isNotEmpty) {
        if (_selectedCall == null) {
          _selectedCall = _calls.first;
        } else {
          // Keep selection synchronized with latest data
          final updated = _calls.firstWhere(
            (c) => c.callId == _selectedCall!.callId,
            orElse: () => _calls.first,
          );
          _selectedCall = updated;
        }
      }
    } catch (e) {
      debugPrint('Refresh error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Audio Playback Controls
  void togglePlayPause() {
    if (_isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }

  void playAudio() {
    if (_selectedCall == null) return;
    _isPlaying = true;
    notifyListeners();

    _playbackTimer?.cancel();
    _playbackTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (_currentPlaybackSeconds >= _selectedCall!.durationSeconds) {
        pauseAudio();
        _currentPlaybackSeconds = 0.0;
      } else {
        _currentPlaybackSeconds += 0.1;
      }
      notifyListeners();
    });
  }

  void pauseAudio() {
    _isPlaying = false;
    _playbackTimer?.cancel();
    notifyListeners();
  }

  void seekToSeconds(double seconds) {
    if (_selectedCall == null) return;
    _currentPlaybackSeconds = seconds.clamp(0.0, _selectedCall!.durationSeconds.toDouble());
    notifyListeners();
  }

  void jumpToTimestamp(String mmss) {
    // Parse "00:03" or "01:12" into seconds
    final parts = mmss.split(':');
    if (parts.length == 2) {
      final minutes = int.tryParse(parts[0]) ?? 0;
      final seconds = int.tryParse(parts[1]) ?? 0;
      final totalSeconds = (minutes * 60 + seconds).toDouble();
      seekToSeconds(totalSeconds);
      _highlightedOrderTimestamp = mmss;
      playAudio();
    }
  }

  // 1-Click Approval
  Future<bool> approveOrder(
    ExtractedOrder order, {
    String? notes,
    ExtractedOrder? editedOrder,
  }) async {
    if (_selectedCall == null) return false;

    final res = await _apiService.approveOrder(
      orderId: order.orderId,
      brokerId: _brokerId,
      brokerNotes: notes,
      editedOrder: editedOrder,
    );

    if (res != null) {
      _latestFixMessage = res['fix_message'];
      _latestAuditHash = res['audit_vault_hash'];
      await refreshAll();
      return true;
    }
    return false;
  }

  // Reject Order
  Future<bool> rejectOrder(ExtractedOrder order, String reason) async {
    if (_selectedCall == null) return false;

    final res = await _apiService.rejectOrder(
      orderId: order.orderId,
      brokerId: _brokerId,
      rejectionReason: reason,
    );

    if (res != null) {
      _latestAuditHash = res['audit_vault_hash'];
      await refreshAll();
      return true;
    }
    return false;
  }

  // Edit Order Draft
  Future<bool> editOrderDraft(ExtractedOrder edited) async {
    final res = await _apiService.editOrder(
      orderId: edited.orderId,
      edited: edited,
    );
    if (res != null) {
      await refreshAll();
      return true;
    }
    return false;
  }

  // Ingest New Call Simulation
  Future<CallRecord?> simulateIngest({
    required String clientCode,
    required String clientName,
    required String phone,
    required String transcript,
  }) async {
    final newCall = await _apiService.ingestCall(
      clientCode: clientCode,
      clientName: clientName,
      phoneNumber: phone,
      transcript: transcript,
    );
    if (newCall != null) {
      await refreshAll();
      selectCall(newCall);
    }
    return newCall;
  }

  @override
  void dispose() {
    _playbackTimer?.cancel();
    _apiService.dispose();
    super.dispose();
  }
}
