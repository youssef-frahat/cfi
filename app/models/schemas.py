"""
Pydantic Models and Schemas for EGX Voice-to-Order HITL & Post-Trade Reconciliation System.
Compliant with FRA Regulations & EGX Trading Rules.
"""
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

class CallClassification(str, Enum):
    ACTIONABLE_ORDER = "ACTIONABLE_ORDER"
    INQUIRY_ONLY = "INQUIRY_ONLY"
    CANCEL_REQUEST = "CANCEL_REQUEST"
    COMPLAINT = "COMPLAINT"

class ActionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    UNKNOWN = "UNKNOWN"

class TimeInForce(str, Enum):
    DAY = "DAY"
    GTC = "GTC"

class OrderStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MODIFIED_AND_APPROVED = "MODIFIED_AND_APPROVED"

class ValidationStatus(str, Enum):
    VALID = "VALID"
    WARNING = "WARNING"
    INVALID = "INVALID"

class ExtractedOrder(BaseModel):
    order_id: str
    action: ActionType
    ticker: str
    company_name_raw: str
    quantity: int
    order_type: OrderType
    price: Optional[float] = None
    time_in_force: TimeInForce = TimeInForce.DAY
    audio_timestamp_start: str = "00:00"
    audio_timestamp_end: str = "00:00"
    requires_human_clarification: bool = False
    ambiguity_reason: Optional[str] = None
    notes: Optional[str] = None
    
    # Enrichment fields added by validation engine
    status: OrderStatus = OrderStatus.PENDING_APPROVAL
    validation_status: ValidationStatus = ValidationStatus.VALID
    validation_issues: List[str] = Field(default_factory=list)
    current_market_price: Optional[float] = None
    price_band_lower: Optional[float] = None
    price_band_upper: Optional[float] = None
    tick_size: Optional[float] = None
    estimated_total_egp: Optional[float] = None
    fix_message: Optional[str] = None
    rejection_reason: Optional[str] = None
    approved_by: Optional[str] = None
    approval_timestamp: Optional[str] = None

class ExtractionResponse(BaseModel):
    call_classification: CallClassification
    has_actionable_orders: bool
    confidence_score: float = Field(ge=0.0, le=1.0)
    client_mood_or_dispute_flag: bool = False
    orders: List[ExtractedOrder] = Field(default_factory=list)
    conversation_summary_ar: str

class CallRecord(BaseModel):
    call_id: str
    client_code: str
    client_name: str
    phone_number: str
    duration_seconds: int
    created_at: str
    audio_url: str
    transcript: str
    waveform_peaks: List[float] = Field(default_factory=list)
    extraction: ExtractionResponse
    audit_reference_id: str
    status: str = "PENDING_REVIEW"

class OrderApprovalRequest(BaseModel):
    broker_id: str
    broker_notes: Optional[str] = None
    edited_order: Optional[ExtractedOrder] = None

class OrderRejectionRequest(BaseModel):
    broker_id: str
    rejection_reason: str

class EGXTickerInfo(BaseModel):
    ticker: str
    isin: str
    name_ar: str
    name_en: str
    last_price: float
    previous_close: float
    change_pct: float
    high_limit: float
    low_limit: float
    tick_size: float
    currency: str = "EGP"
    market: str = "EGX30"

class AuditVaultRecord(BaseModel):
    audit_reference_id: str
    call_id: str
    order_id: str
    timestamp: str
    broker_id: str
    broker_action: str
    client_code: str
    ticker: str
    action: str
    quantity: int
    price: Optional[float]
    sha256_hash: str
    fra_compliance_status: str
    fix_message: Optional[str] = None

# ==============================================================
# POST-TRADE RECONCILIATION & AUDIT SCHEMAS
# ==============================================================

class ExecutedTrade(BaseModel):
    trade_id: str
    ticker: str
    action: str
    executed_quantity: int
    executed_price: float
    execution_time: str
    executing_broker: str
    trade_value_egp: float
    oms_status: str = "FILLED"

class ReconciliationStatus(str, Enum):
    MATCHED = "MATCHED"
    PRICE_MISMATCH = "PRICE_MISMATCH"
    QUANTITY_MISMATCH = "QUANTITY_MISMATCH"
    TICKER_MISMATCH = "TICKER_MISMATCH"
    SIDE_MISMATCH = "SIDE_MISMATCH"
    UNEXECUTED = "UNEXECUTED"
    UNAUTHORIZED = "UNAUTHORIZED"

class TradeReconciliationCase(BaseModel):
    case_id: str
    client_code: str
    client_name: str
    phone_number: str
    call_id: str
    call_duration_seconds: int
    call_created_at: str
    audio_url: str
    transcript: str
    waveform_peaks: List[float] = Field(default_factory=list)
    audit_reference_id: str
    voice_ticker: str
    voice_action: str
    voice_quantity: int
    voice_order_type: str
    voice_price: Optional[float] = None
    voice_timestamp_range: str = "00:05 - 00:20"
    executed_trade: Optional[ExecutedTrade] = None
    reconciliation_status: str = "MATCHED"
    is_compliant: bool = True
    status_title_ar: str
    status_badge_color: str = "emerald"
    discrepancy_reasons: List[str] = Field(default_factory=list)
    financial_variance_egp: float = 0.0
    compliance_verdict_ar: str
    certified_by: Optional[str] = None
    certified_at: Optional[str] = None
    sha256_audit_hash: str
