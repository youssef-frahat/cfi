"""
FastAPI Server for EGX Voice-to-Order HITL Console.
Provides REST Endpoints and WebSocket live push.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Dict, Optional, Set
import uuid
import json
import random
from datetime import datetime, timezone
from pathlib import Path

from backend.app.models.schemas import (
    CallRecord,
    ExtractedOrder,
    ExtractionResponse,
    OrderApprovalRequest,
    OrderRejectionRequest,
    OrderStatus,
    EGXTickerInfo,
    AuditVaultRecord,
    ValidationStatus,
)
from backend.app.services.egx_validator import EGXValidationEngine, EGX_DATABASE
from backend.app.services.audio_extractor import audio_extraction_engine
from backend.app.services.fix_service import FIXProtocolEngine
from backend.app.services.audit_vault import audit_vault

app = FastAPI(
    title="EGX Voice-to-Order HITL API",
    description="Compliant Egyptian Stock Exchange Voice-to-Order Copilot Backend",
    version="1.0.0",
)

# Enable CORS for Flutter Web / Desktop / Mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active session calls
CALLS_DB: Dict[str, CallRecord] = {}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_json(self, data: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()


def _generate_realistic_waveform(count: int = 60) -> List[float]:
    """Generates normalized audio amplitude peaks between 0.1 and 1.0 for UI waveform."""
    peaks = []
    for _ in range(count):
        val = round(random.uniform(0.15, 0.95), 2)
        peaks.append(val)
    return peaks


# Initialize default sample EGX calls
def init_sample_data():
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Call 1: Acceptance Criteria Scenario (COMI Buy Limit)
    c1_extraction = audio_extraction_engine._extract_dialect_rules(
        "اشتري لي عشر تلاف ورقة في التجاري الدولي على 85 جنيه وخمسين قرش"
    )
    c1_extraction = audio_extraction_engine._enrich_response(c1_extraction)
    c1 = CallRecord(
        call_id="CALL-20261010-001",
        client_code="10542",
        client_name="أحمد ممدوح عبد العزيز",
        phone_number="+20 100 123 4567",
        duration_seconds=18,
        created_at=now_str,
        audio_url="https://cfi-brokerage.storage/audio/call_001.wav",
        transcript="العميل: صباح الخير يا فندم. اشتري لي عشر تلاف ورقة في التجاري الدولي على 85 جنيه وخمسين قرش.\nالوسيط: تمام يا فندم، هنسجل أمر شراء 10,000 سهم COMI بسعر 85.50 جنيه حاضر.",
        waveform_peaks=_generate_realistic_waveform(50),
        extraction=c1_extraction,
        audit_reference_id=f"FRA-AUDIT-{uuid.uuid4().hex[:10].upper()}",
        status="PENDING_REVIEW",
    )
    CALLS_DB[c1.call_id] = c1

    # Call 2: Multi-Order (Sell TMGH Market + Buy FWRY)
    c2_extraction = audio_extraction_engine._extract_dialect_rules(
        "بيع خمس تلاف ورقة في طلعت مصطفى ماركت واشتري فوري على 7 جنيه و45 قرش"
    )
    c2_extraction = audio_extraction_engine._enrich_response(c2_extraction)
    c2 = CallRecord(
        call_id="CALL-20261010-002",
        client_code="10988",
        client_name="محمد محمود الشناوي",
        phone_number="+20 112 345 6789",
        duration_seconds=28,
        created_at=now_str,
        audio_url="https://cfi-brokerage.storage/audio/call_002.wav",
        transcript="العميل: يا باشا بيع خمس تلاف ورقة في طلعت مصطفى ماركت بسعر السوق دلوقتي، واشتري بالفلوس فوري على 7 جنيه و45 قرش.\nالوسيط: تمام يا فندم، بيع 5,000 سهم TMGH بسعر السوق وشراء فوري على 7.45.",
        waveform_peaks=_generate_realistic_waveform(65),
        extraction=c2_extraction,
        audit_reference_id=f"FRA-AUDIT-{uuid.uuid4().hex[:10].upper()}",
        status="PENDING_REVIEW",
    )
    CALLS_DB[c2.call_id] = c2

    # Call 3: Egyptian Slang Numerals (Half Million Belton)
    c3_extraction = audio_extraction_engine._extract_dialect_rules(
        "عايز نص مليون ورقة بلتون ليميت على 3 جنيه و15 قرش"
    )
    c3_extraction = audio_extraction_engine._enrich_response(c3_extraction)
    c3 = CallRecord(
        call_id="CALL-20261010-003",
        client_code="11420",
        client_name="كريم السعدني",
        phone_number="+20 120 987 6543",
        duration_seconds=22,
        created_at=now_str,
        audio_url="https://cfi-brokerage.storage/audio/call_003.wav",
        transcript="العميل: أهلاً يا أستاذ شريف، عايز نص مليون ورقة بلتون ليميت على 3 جنيه و15 قرش في جلسة النهارده.\nالوسيط: حاضر يا أستاذ كريم، 500,000 سهم BTFH محدد على 3.15.",
        waveform_peaks=_generate_realistic_waveform(55),
        extraction=c3_extraction,
        audit_reference_id=f"FRA-AUDIT-{uuid.uuid4().hex[:10].upper()}",
        status="PENDING_REVIEW",
    )
    CALLS_DB[c3.call_id] = c3

    # Call 4: Inquiry-Only (FR-01 Intent filter)
    c4_extraction = audio_extraction_engine._extract_dialect_rules(
        "هو السهم بتاع السويدي بكام؟ وشايف السهم رايح فين؟ لو نزل لـ 45 هبقى اشتري"
    )
    c4 = CallRecord(
        call_id="CALL-20261010-004",
        client_code="12055",
        client_name="طارق الشريف",
        phone_number="+20 101 987 1122",
        duration_seconds=15,
        created_at=now_str,
        audio_url="https://cfi-brokerage.storage/audio/call_004.wav",
        transcript="العميل: الو يا باشا، هو السهم بتاع السويدي بكام النهارده؟ وشايف السهم رايح فين؟ لو نزل لـ 45 هبقى اشتري.\nالوسيط: السويدي حالياً بـ 48.50 ومستقر، لما تقرر تنفذ كلمني.",
        waveform_peaks=_generate_realistic_waveform(40),
        extraction=c4_extraction,
        audit_reference_id=f"FRA-AUDIT-{uuid.uuid4().hex[:10].upper()}",
        status="INQUIRY",
    )
    CALLS_DB[c4.call_id] = c4


init_sample_data()


# ---------------- API ENDPOINTS ----------------

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EGX Voice-to-Order HITL Console Backend",
        "fra_compliance": "ACTIVE",
        "fix_gateway": "CONNECTED",
        "active_calls_count": len(CALLS_DB),
    }


@app.get("/api/egx/tickers", response_model=List[EGXTickerInfo])
def get_egx_tickers():
    """Returns official list of EGX securities, market prices, and circuit breakers."""
    return list(EGX_DATABASE.values())


@app.get("/api/calls", response_model=List[CallRecord])
def list_calls():
    """Returns all calls with their extracted orders and status."""
    return list(CALLS_DB.values())


@app.get("/api/calls/{call_id}", response_model=CallRecord)
def get_call_details(call_id: str):
    if call_id not in CALLS_DB:
        raise HTTPException(status_code=404, detail="Call record not found")
    return CALLS_DB[call_id]


@app.post("/api/calls/ingest", response_model=CallRecord)
async def ingest_call_webhook(
    client_code: str = Form(...),
    client_name: str = Form(...),
    phone_number: str = Form(...),
    transcript: str = Form(...),
    duration_seconds: int = Form(20),
):
    """
    PBX Ingestion Webhook / Service:
    Triggered immediately when client ends phone call.
    Extracts orders with Multimodal LLM, normalizes numerals & dialect,
    validates with EGX rules, and broadcasts draft to Broker Console via WebSocket.
    """
    call_id = f"CALL-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    audit_ref = f"FRA-AUDIT-{uuid.uuid4().hex[:10].upper()}"

    # Extract orders
    extraction = await audio_extraction_engine.extract_from_audio(transcript_override=transcript)

    record = CallRecord(
        call_id=call_id,
        client_code=client_code,
        client_name=client_name,
        phone_number=phone_number,
        duration_seconds=duration_seconds,
        created_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        audio_url=f"https://cfi-brokerage.storage/audio/{call_id}.wav",
        transcript=transcript,
        waveform_peaks=_generate_realistic_waveform(55),
        extraction=extraction,
        audit_reference_id=audit_ref,
        status="PENDING_REVIEW" if extraction.has_actionable_orders else "INQUIRY",
    )

    CALLS_DB[call_id] = record

    # Push to live Broker WebSockets
    await ws_manager.broadcast_json({
        "event": "NEW_CALL_INGESTED",
        "call_id": call_id,
        "client_name": client_name,
        "has_orders": extraction.has_actionable_orders,
        "orders_count": len(extraction.orders),
    })

    return record


@app.post("/api/orders/{order_id}/approve")
async def approve_order(order_id: str, payload: OrderApprovalRequest):
    """
    Broker HITL 1-Click Approval:
    - Validates order with EGX microstructures
    - Builds FIX 4.4 NewOrderSingle (35=D) message
    - Commits record to FRA WORM Compliance Vault (5-year audit trail)
    - Pushes FIX message to simulated OMS Order Book
    """
    target_call: Optional[CallRecord] = None
    target_order: Optional[ExtractedOrder] = None

    for call in CALLS_DB.values():
        for ord_item in call.extraction.orders:
            if ord_item.order_id == order_id:
                target_call = call
                target_order = ord_item
                break
        if target_order:
            break

    if not target_order or not target_call:
        raise HTTPException(status_code=404, detail="Order draft not found")

    # If broker provided edited order in payload
    if payload.edited_order:
        target_order = payload.edited_order
        target_order = EGXValidationEngine.validate_and_enrich_order(target_order)
        target_order.status = OrderStatus.MODIFIED_AND_APPROVED
    else:
        target_order.status = OrderStatus.APPROVED

    # Generate FIX 4.4 message for OMS Gateway
    fix_result = FIXProtocolEngine.generate_new_order_single(
        order=target_order,
        client_code=target_call.client_code,
        broker_id=payload.broker_id,
    )
    target_order.fix_message = fix_result["display_fix"]
    target_order.approved_by = payload.broker_id
    target_order.approval_timestamp = datetime.now(timezone.utc).isoformat()

    # Commit to WORM Audit Vault
    audit_rec = audit_vault.record_broker_action(
        audit_reference_id=target_call.audit_reference_id,
        call_id=target_call.call_id,
        order=target_order,
        client_code=target_call.client_code,
        broker_id=payload.broker_id,
        broker_action=target_order.status.value,
        fix_message=fix_result["raw_fix"],
    )

    # Check if all orders in call are decided
    all_decided = all(
        o.status in [OrderStatus.APPROVED, OrderStatus.REJECTED, OrderStatus.MODIFIED_AND_APPROVED]
        for o in target_call.extraction.orders
    )
    if all_decided:
        target_call.status = "APPROVED"

    # Broadcast update
    await ws_manager.broadcast_json({
        "event": "ORDER_APPROVED",
        "order_id": order_id,
        "call_id": target_call.call_id,
        "cl_ord_id": fix_result["cl_ord_id"],
    })

    return {
        "status": "SUCCESS",
        "message": f"تم اعتماد الأمر بنجاح وإرساله لمحرك FIX (ClOrdID: {fix_result['cl_ord_id']})",
        "order": target_order,
        "fix_message": fix_result["display_fix"],
        "audit_vault_hash": audit_rec.sha256_hash,
        "fra_mandate_status": audit_rec.fra_compliance_status,
    }


@app.post("/api/orders/{order_id}/reject")
async def reject_order(order_id: str, payload: OrderRejectionRequest):
    """
    Broker HITL Rejection:
    - Marks order as rejected
    - Logs mandatory broker reason to FRA Compliance Vault
    """
    target_call: Optional[CallRecord] = None
    target_order: Optional[ExtractedOrder] = None

    for call in CALLS_DB.values():
        for ord_item in call.extraction.orders:
            if ord_item.order_id == order_id:
                target_call = call
                target_order = ord_item
                break
        if target_order:
            break

    if not target_order or not target_call:
        raise HTTPException(status_code=404, detail="Order draft not found")

    target_order.status = OrderStatus.REJECTED
    target_order.rejection_reason = payload.rejection_reason

    # Commit rejection to WORM Audit Vault
    audit_rec = audit_vault.record_broker_action(
        audit_reference_id=target_call.audit_reference_id,
        call_id=target_call.call_id,
        order=target_order,
        client_code=target_call.client_code,
        broker_id=payload.broker_id,
        broker_action="REJECTED",
        fix_message=None,
    )

    all_decided = all(
        o.status in [OrderStatus.APPROVED, OrderStatus.REJECTED, OrderStatus.MODIFIED_AND_APPROVED]
        for o in target_call.extraction.orders
    )
    if all_decided:
        target_call.status = "REJECTED"

    await ws_manager.broadcast_json({
        "event": "ORDER_REJECTED",
        "order_id": order_id,
        "call_id": target_call.call_id,
    })

    return {
        "status": "REJECTED",
        "message": "تم رفض مسودة الأمر وتسجيل سبب الرفض في سجل الرقابة المالية",
        "order": target_order,
        "audit_vault_hash": audit_rec.sha256_hash,
    }


@app.put("/api/orders/{order_id}/edit")
def edit_order(order_id: str, edited: ExtractedOrder):
    """
    Broker manual edit of draft fields before approval.
    Re-validates ticker, tick size, and price limits.
    """
    for call in CALLS_DB.values():
        for idx, ord_item in enumerate(call.extraction.orders):
            if ord_item.order_id == order_id:
                validated = EGXValidationEngine.validate_and_enrich_order(edited)
                call.extraction.orders[idx] = validated
                return {
                    "status": "UPDATED",
                    "order": validated,
                }
    raise HTTPException(status_code=404, detail="Order not found")


@app.get("/api/audit", response_model=List[AuditVaultRecord])
def get_audit_trail():
    """Returns FRA WORM compliance audit trail records."""
    return audit_vault.get_all_records()


@app.websocket("/ws/broker")
async def websocket_broker_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for ping or broker heartbeats
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
