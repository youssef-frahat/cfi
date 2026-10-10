
// ignore_for_file: constant_identifier_names

enum CallClassification {
  ACTIONABLE_ORDER,
  INQUIRY_ONLY,
  CANCEL_REQUEST,
  COMPLAINT,
}

enum ActionType {
  BUY,
  SELL,
}

enum OrderType {
  MARKET,
  LIMIT,
  UNKNOWN,
}

enum TimeInForce {
  DAY,
  GTC,
}

enum OrderStatus {
  PENDING_APPROVAL,
  APPROVED,
  REJECTED,
  MODIFIED_AND_APPROVED,
}

enum ValidationStatus {
  VALID,
  WARNING,
  INVALID,
}

class ExtractedOrder {
  final String orderId;
  ActionType action;
  String ticker;
  String companyNameRaw;
  int quantity;
  OrderType orderType;
  double? price;
  TimeInForce timeInForce;
  String audioTimestampStart;
  String audioTimestampEnd;
  bool requiresHumanClarification;
  String? ambiguityReason;
  String? notes;
  OrderStatus status;
  ValidationStatus validationStatus;
  List<String> validationIssues;
  double? currentMarketPrice;
  double? priceBandLower;
  double? priceBandUpper;
  double? tickSize;
  double? estimatedTotalEgp;
  String? fixMessage;
  String? rejectionReason;
  String? approvedBy;
  String? approvalTimestamp;

  ExtractedOrder({
    required this.orderId,
    required this.action,
    required this.ticker,
    required this.companyNameRaw,
    required this.quantity,
    required this.orderType,
    this.price,
    this.timeInForce = TimeInForce.DAY,
    this.audioTimestampStart = '00:00',
    this.audioTimestampEnd = '00:00',
    this.requiresHumanClarification = false,
    this.ambiguityReason,
    this.notes,
    this.status = OrderStatus.PENDING_APPROVAL,
    this.validationStatus = ValidationStatus.VALID,
    this.validationIssues = const [],
    this.currentMarketPrice,
    this.priceBandLower,
    this.priceBandUpper,
    this.tickSize,
    this.estimatedTotalEgp,
    this.fixMessage,
    this.rejectionReason,
    this.approvedBy,
    this.approvalTimestamp,
  });

  factory ExtractedOrder.fromJson(Map<String, dynamic> json) {
    ActionType parseAction(String val) =>
        val == 'SELL' ? ActionType.SELL : ActionType.BUY;

    OrderType parseOrderType(String val) {
      if (val == 'MARKET') return OrderType.MARKET;
      if (val == 'UNKNOWN') return OrderType.UNKNOWN;
      return OrderType.LIMIT;
    }

    OrderStatus parseStatus(String? val) {
      if (val == 'APPROVED') return OrderStatus.APPROVED;
      if (val == 'REJECTED') return OrderStatus.REJECTED;
      if (val == 'MODIFIED_AND_APPROVED') return OrderStatus.MODIFIED_AND_APPROVED;
      return OrderStatus.PENDING_APPROVAL;
    }

    ValidationStatus parseValStatus(String? val) {
      if (val == 'INVALID') return ValidationStatus.INVALID;
      if (val == 'WARNING') return ValidationStatus.WARNING;
      return ValidationStatus.VALID;
    }

    return ExtractedOrder(
      orderId: json['order_id'] ?? '',
      action: parseAction(json['action'] ?? 'BUY'),
      ticker: json['ticker'] ?? 'COMI',
      companyNameRaw: json['company_name_raw'] ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      orderType: parseOrderType(json['order_type'] ?? 'LIMIT'),
      price: (json['price'] as num?)?.toDouble(),
      timeInForce: json['time_in_force'] == 'GTC' ? TimeInForce.GTC : TimeInForce.DAY,
      audioTimestampStart: json['audio_timestamp_start'] ?? '00:00',
      audioTimestampEnd: json['audio_timestamp_end'] ?? '00:00',
      requiresHumanClarification: json['requires_human_clarification'] ?? false,
      ambiguityReason: json['ambiguity_reason'],
      notes: json['notes'],
      status: parseStatus(json['status']),
      validationStatus: parseValStatus(json['validation_status']),
      validationIssues: List<String>.from(json['validation_issues'] ?? []),
      currentMarketPrice: (json['current_market_price'] as num?)?.toDouble(),
      priceBandLower: (json['price_band_lower'] as num?)?.toDouble(),
      priceBandUpper: (json['price_band_upper'] as num?)?.toDouble(),
      tickSize: (json['tick_size'] as num?)?.toDouble(),
      estimatedTotalEgp: (json['estimated_total_egp'] as num?)?.toDouble(),
      fixMessage: json['fix_message'],
      rejectionReason: json['rejection_reason'],
      approvedBy: json['approved_by'],
      approvalTimestamp: json['approval_timestamp'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'order_id': orderId,
      'action': action == ActionType.BUY ? 'BUY' : 'SELL',
      'ticker': ticker,
      'company_name_raw': companyNameRaw,
      'quantity': quantity,
      'order_type': orderType == OrderType.MARKET
          ? 'MARKET'
          : orderType == OrderType.UNKNOWN
              ? 'UNKNOWN'
              : 'LIMIT',
      'price': price,
      'time_in_force': timeInForce == TimeInForce.GTC ? 'GTC' : 'DAY',
      'audio_timestamp_start': audioTimestampStart,
      'audio_timestamp_end': audioTimestampEnd,
      'requires_human_clarification': requiresHumanClarification,
      'ambiguity_reason': ambiguityReason,
      'notes': notes,
      'status': status.name,
      'validation_status': validationStatus.name,
      'validation_issues': validationIssues,
      'current_market_price': currentMarketPrice,
      'price_band_lower': priceBandLower,
      'price_band_upper': priceBandUpper,
      'tick_size': tickSize,
      'estimated_total_egp': estimatedTotalEgp,
      'fix_message': fixMessage,
      'rejection_reason': rejectionReason,
      'approved_by': approvedBy,
      'approval_timestamp': approvalTimestamp,
    };
  }

  ExtractedOrder copyWith({
    String? ticker,
    ActionType? action,
    int? quantity,
    OrderType? orderType,
    double? price,
    TimeInForce? timeInForce,
  }) {
    return ExtractedOrder(
      orderId: orderId,
      action: action ?? this.action,
      ticker: ticker ?? this.ticker,
      companyNameRaw: companyNameRaw,
      quantity: quantity ?? this.quantity,
      orderType: orderType ?? this.orderType,
      price: price ?? this.price,
      timeInForce: timeInForce ?? this.timeInForce,
      audioTimestampStart: audioTimestampStart,
      audioTimestampEnd: audioTimestampEnd,
      requiresHumanClarification: requiresHumanClarification,
      ambiguityReason: ambiguityReason,
      notes: notes,
      status: status,
      validationStatus: validationStatus,
      validationIssues: validationIssues,
      currentMarketPrice: currentMarketPrice,
      priceBandLower: priceBandLower,
      priceBandUpper: priceBandUpper,
      tickSize: tickSize,
      estimatedTotalEgp: estimatedTotalEgp,
      fixMessage: fixMessage,
      rejectionReason: rejectionReason,
      approvedBy: approvedBy,
      approvalTimestamp: approvalTimestamp,
    );
  }
}

class ExtractionResponse {
  final CallClassification callClassification;
  final bool hasActionableOrders;
  final double confidenceScore;
  final bool clientMoodOrDisputeFlag;
  final List<ExtractedOrder> orders;
  final String conversationSummaryAr;

  ExtractionResponse({
    required this.callClassification,
    required this.hasActionableOrders,
    required this.confidenceScore,
    required this.clientMoodOrDisputeFlag,
    required this.orders,
    required this.conversationSummaryAr,
  });

  factory ExtractionResponse.fromJson(Map<String, dynamic> json) {
    CallClassification parseClass(String? val) {
      if (val == 'INQUIRY_ONLY') return CallClassification.INQUIRY_ONLY;
      if (val == 'CANCEL_REQUEST') return CallClassification.CANCEL_REQUEST;
      if (val == 'COMPLAINT') return CallClassification.COMPLAINT;
      return CallClassification.ACTIONABLE_ORDER;
    }

    return ExtractionResponse(
      callClassification: parseClass(json['call_classification']),
      hasActionableOrders: json['has_actionable_orders'] ?? false,
      confidenceScore: (json['confidence_score'] as num?)?.toDouble() ?? 0.0,
      clientMoodOrDisputeFlag: json['client_mood_or_dispute_flag'] ?? false,
      orders: (json['orders'] as List<dynamic>? ?? [])
          .map((item) => ExtractedOrder.fromJson(item as Map<String, dynamic>))
          .toList(),
      conversationSummaryAr: json['conversation_summary_ar'] ?? '',
    );
  }
}

class CallRecord {
  final String callId;
  final String clientCode;
  final String clientName;
  final String phoneNumber;
  final int durationSeconds;
  final String createdAt;
  final String audioUrl;
  final String transcript;
  final List<double> waveformPeaks;
  final ExtractionResponse extraction;
  final String auditReferenceId;
  String status;

  CallRecord({
    required this.callId,
    required this.clientCode,
    required this.clientName,
    required this.phoneNumber,
    required this.durationSeconds,
    required this.createdAt,
    required this.audioUrl,
    required this.transcript,
    required this.waveformPeaks,
    required this.extraction,
    required this.auditReferenceId,
    this.status = 'PENDING_REVIEW',
  });

  factory CallRecord.fromJson(Map<String, dynamic> json) {
    return CallRecord(
      callId: json['call_id'] ?? '',
      clientCode: json['client_code'] ?? '',
      clientName: json['client_name'] ?? '',
      phoneNumber: json['phone_number'] ?? '',
      durationSeconds: (json['duration_seconds'] as num?)?.toInt() ?? 0,
      createdAt: json['created_at'] ?? '',
      audioUrl: json['audio_url'] ?? '',
      transcript: json['transcript'] ?? '',
      waveformPeaks: (json['waveform_peaks'] as List<dynamic>? ?? [])
          .map((v) => (v as num).toDouble())
          .toList(),
      extraction: ExtractionResponse.fromJson(json['extraction'] ?? {}),
      auditReferenceId: json['audit_reference_id'] ?? '',
      status: json['status'] ?? 'PENDING_REVIEW',
    );
  }
}

class EGXTickerInfo {
  final String ticker;
  final String isin;
  final String nameAr;
  final String nameEn;
  final double lastPrice;
  final double previousClose;
  final double changePct;
  final double highLimit;
  final double lowLimit;
  final double tickSize;
  final String market;

  EGXTickerInfo({
    required this.ticker,
    required this.isin,
    required this.nameAr,
    required this.nameEn,
    required this.lastPrice,
    required this.previousClose,
    required this.changePct,
    required this.highLimit,
    required this.lowLimit,
    required this.tickSize,
    this.market = 'EGX30',
  });

  factory EGXTickerInfo.fromJson(Map<String, dynamic> json) {
    return EGXTickerInfo(
      ticker: json['ticker'] ?? '',
      isin: json['isin'] ?? '',
      nameAr: json['name_ar'] ?? '',
      nameEn: json['name_en'] ?? '',
      lastPrice: (json['last_price'] as num?)?.toDouble() ?? 0.0,
      previousClose: (json['previous_close'] as num?)?.toDouble() ?? 0.0,
      changePct: (json['change_pct'] as num?)?.toDouble() ?? 0.0,
      highLimit: (json['high_limit'] as num?)?.toDouble() ?? 0.0,
      lowLimit: (json['low_limit'] as num?)?.toDouble() ?? 0.0,
      tickSize: (json['tick_size'] as num?)?.toDouble() ?? 0.01,
      market: json['market'] ?? 'EGX30',
    );
  }
}

class AuditRecord {
  final String auditReferenceId;
  final String callId;
  final String orderId;
  final String timestamp;
  final String brokerId;
  final String brokerAction;
  final String clientCode;
  final String ticker;
  final String action;
  final int quantity;
  final double? price;
  final String sha256Hash;
  final String fraComplianceStatus;
  final String? fixMessage;

  AuditRecord({
    required this.auditReferenceId,
    required this.callId,
    required this.orderId,
    required this.timestamp,
    required this.brokerId,
    required this.brokerAction,
    required this.clientCode,
    required this.ticker,
    required this.action,
    required this.quantity,
    this.price,
    required this.sha256Hash,
    required this.fraComplianceStatus,
    this.fixMessage,
  });

  factory AuditRecord.fromJson(Map<String, dynamic> json) {
    return AuditRecord(
      auditReferenceId: json['audit_reference_id'] ?? '',
      callId: json['call_id'] ?? '',
      orderId: json['order_id'] ?? '',
      timestamp: json['timestamp'] ?? '',
      brokerId: json['broker_id'] ?? '',
      brokerAction: json['broker_action'] ?? '',
      clientCode: json['client_code'] ?? '',
      ticker: json['ticker'] ?? '',
      action: json['action'] ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      price: (json['price'] as num?)?.toDouble(),
      sha256Hash: json['sha256_hash'] ?? '',
      fraComplianceStatus: json['fra_compliance_status'] ?? '',
      fixMessage: json['fix_message'],
    );
  }
}
