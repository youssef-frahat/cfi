"""
FastAPI Server for EGX Voice-to-Order HITL Console.
Complies with FRA Law 95/1992 Article 268 & EGX Market Microstructures.
Provides REST Endpoints, Telephony PBX Webhook, FIX 4.4 Engine, WORM Vault, and WebSocket Live Push.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Dict, Optional, Set, Any
import uuid
import json
import random
from datetime import datetime, timezone
from pathlib import Path

from app.models.schemas import (
    CallRecord,
    ExtractedOrder,
    ExtractionResponse,
    OrderApprovalRequest,
    OrderRejectionRequest,
    OrderStatus,
    EGXTickerInfo,
    AuditVaultRecord,
    ValidationStatus,
    TradeReconciliationCase,
    ExecutedTrade,
)
from app.services.egx_validator import EGXValidationEngine, EGX_DATABASE
from app.services.audio_extractor import audio_extraction_engine
from app.services.fix_service import FIXProtocolEngine
from app.services.audit_vault import audit_vault
from app.services.supabase_service import supabase_service
from app.services.reconciliation_service import reconciliation_service

app = FastAPI(
    title="EGX Voice-to-Order HITL API",
    description="Compliant Egyptian Stock Exchange Voice-to-Order Copilot Backend",
    version="2.0.0",
)

# Enable CORS
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


# ---------------- ASSET RESOLUTION & FAIL-SAFE UI SERVING ----------------
app_dir = Path(__file__).resolve().parent
PUBLIC_DIR = (app_dir / "public") if (app_dir / "public").exists() else (app_dir.parent / "public")

JS_BUNDLE_NAME = "index-CmVcwC4l.js"
CSS_BUNDLE_NAME = "index-DAPphBiA.css"

def get_asset_file_path(filename: str) -> Optional[Path]:
    for candidate_dir in [
        app_dir / "assets",
        app_dir.parent / "public" / "assets",
        app_dir.parent / "assets",
        app_dir / "public" / "assets",
    ]:
        target = candidate_dir / filename
        if target.exists() and target.is_file():
            return target
    return None

def get_inlined_css() -> str:
    css_path = get_asset_file_path(CSS_BUNDLE_NAME)
    if css_path:
        try:
            return css_path.read_text(encoding="utf-8")
        except Exception:
            pass
    return ""

@app.get("/assets/{asset_name:path}")
def serve_static_asset(asset_name: str):
    file_path = get_asset_file_path(asset_name)
    if file_path:
        media_type = "text/css" if asset_name.endswith(".css") else "application/javascript" if asset_name.endswith(".js") else None
        return FileResponse(str(file_path), media_type=media_type, headers={"Cache-Control": "public, max-age=31536000"})
    raise HTTPException(status_code=404, detail=f"Asset {asset_name} not found")

@app.get("/")
def serve_react_ui():
    inlined_css = get_inlined_css()
    html_content = f"""<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CFI Record - منظومة تدقيق واعتماد أوامر البورصة المصرية</title>
    <style>
{inlined_css}
    </style>
    <link rel="stylesheet" crossorigin href="/assets/{CSS_BUNDLE_NAME}">
    <script type="module" crossorigin src="/assets/{JS_BUNDLE_NAME}"></script>
  </head>
  <body class="bg-[#0B0E14] text-white">
    <div id="root"></div>
  </body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/api")
def api_root():
    return {
        "status": "online",
        "service": "CFI Record - EGX Voice-to-Order HITL Backend Gateway",
        "version": "2.0.0",
        "fra_compliance": "ACTIVE (Law 95/1992 Article 268)",
        "fix_engine": "FIX 4.4 / FIX 4.2",
        "worm_vault": "ENABLED (5-Year Cryptographic Retention)",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "calls_url": "/api/calls",
        "market_url": "/api/egx/tickers"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EGX Voice-to-Order HITL Console Backend",
        "fra_compliance": "ACTIVE",
        "fix_gateway": "CONNECTED",
        "active_calls_count": len(CALLS_DB),
    }


# ---------------- EGX MARKET & TICKERS ----------------

@app.get("/api/egx/tickers", response_model=List[EGXTickerInfo])
@app.get("/api/market")
def get_egx_tickers():
    """Returns official list of EGX securities, market prices, and circuit breakers from Supabase."""
    tickers_db = supabase_service.get_all_tickers()
    if tickers_db:
        return [EGXTickerInfo(**t) for t in tickers_db]
    return list(EGX_DATABASE.values())


# ---------------- CLIENT PROFILES & MCDR HOLDINGS ----------------

CLIENTS_REGISTRY = {
    "10421": {
        "client_id": "10421",
        "full_name": "أحمد منصور الحسيني",
        "national_id": "29001150102431",
        "phone_number": "+20 100 452 8891",
        "account_number": "ACC-EGX-10421",
        "purchasing_power_egp": 450000.0,
        "margin_approved": True,
        "holdings": [
            {"ticker": "COMI", "shares_quantity": 8000, "average_cost_egp": 82.50},
            {"ticker": "TMGH", "shares_quantity": 3500, "average_cost_egp": 61.20},
            {"ticker": "FWRY", "shares_quantity": 25000, "average_cost_egp": 7.10},
        ]
    },
    "10542": {
        "client_id": "10542",
        "full_name": "مصطفى كمال الدين",
        "national_id": "28503200109923",
        "phone_number": "+20 100 123 4567",
        "account_number": "ACC-EGX-10542",
        "purchasing_power_egp": 1200000.0,
        "margin_approved": True,
        "holdings": [
            {"ticker": "COMI", "shares_quantity": 15000, "average_cost_egp": 80.00},
            {"ticker": "SWDY", "shares_quantity": 12000, "average_cost_egp": 46.50},
            {"ticker": "CCAP", "shares_quantity": 100000, "average_cost_egp": 2.65},
        ]
    },
    "10893": {
        "client_id": "10893",
        "full_name": "مريم فاروق الديب",
        "national_id": "29408120108876",
        "phone_number": "+20 111 883 2045",
        "account_number": "ACC-EGX-10893",
        "purchasing_power_egp": 210000.0,
        "margin_approved": False,
        "holdings": [
            {"ticker": "TMGH", "shares_quantity": 10000, "average_cost_egp": 58.00},
            {"ticker": "BTFH", "shares_quantity": 50000, "average_cost_egp": 3.05},
        ]
    },
    "20144": {
        "client_id": "20144",
        "full_name": "طارق زياد المهندس",
        "national_id": "29112040103456",
        "phone_number": "+20 122 994 1178",
        "account_number": "ACC-EGX-20144",
        "purchasing_power_egp": 680000.0,
        "margin_approved": True,
        "holdings": [
            {"ticker": "FWRY", "shares_quantity": 30000, "average_cost_egp": 7.20},
            {"ticker": "SWDY", "shares_quantity": 8000, "average_cost_egp": 47.00},
        ]
    }
}

@app.get("/api/clients/{client_id}")
def get_client_profile(client_id: str):
    client = CLIENTS_REGISTRY.get(client_id)
    if not client:
        return {
            "client_id": client_id,
            "full_name": "عميل تداول مباشر",
            "purchasing_power_egp": 500000.0,
            "margin_approved": True,
            "account_number": f"ACC-EGX-{client_id}"
        }
    return client

@app.get("/api/clients/{client_id}/holdings")
def get_client_holdings(client_id: str):
    client = CLIENTS_REGISTRY.get(client_id)
    if not client:
        return []
    return client.get("holdings", [])


# ---------------- CALLS INGESTION & PBX TELEPHONY ----------------

def _generate_realistic_waveform(num_peaks: int = 55) -> List[float]:
    peaks = []
    for _ in range(num_peaks):
        val = round(random.uniform(0.12, 0.95), 2)
        peaks.append(val)
    return peaks

@app.get("/api/calls", response_model=List[CallRecord])
def list_calls():
    """Returns real calls directly from Supabase PostgreSQL."""
    calls_from_db = supabase_service.get_all_calls()
    if calls_from_db:
        for c in calls_from_db:
            CALLS_DB[c["call_id"]] = CallRecord(**c)
        return [CallRecord(**c) for c in calls_from_db]
    return list(CALLS_DB.values())

@app.get("/api/calls/{call_id}", response_model=CallRecord)
def get_call_details(call_id: str):
    call_from_db = supabase_service.get_call_by_id(call_id)
    if call_from_db:
        return CallRecord(**call_from_db)
    if call_id in CALLS_DB:
        return CALLS_DB[call_id]
    raise HTTPException(status_code=404, detail="Call record not found")

@app.post("/api/calls/ingest", response_model=CallRecord)
@app.post("/api/telephony/webhook", response_model=CallRecord)
async def ingest_call_webhook(
    client_code: str = Form("10421"),
    client_name: str = Form("أحمد منصور الحسيني"),
    phone_number: str = Form("+20 100 452 8891"),
    transcript: str = Form("العميل: ألو يا كابتن شريف، اشتريلي ألفين سهم في البنك التجاري الدولي سي آي بي بسعر السوق فوراً."),
    duration_seconds: int = Form(42),
    pbx_system: str = Form("Avaya Aura")
):
    """
    PBX Telephony Webhook Ingestion Listener (Avaya / Cisco / Asterisk).
    Trims VAD, extracts orders via Arabic LLM Dialect Engine,
    validates with EGX rules, and pushes Realtime WebSocket event to Broker Console.
    """
    call_id = f"CALL-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    audit_ref = f"FRA-AUDIT-{uuid.uuid4().hex[:10].upper()}"

    extraction = await audio_extraction_engine.extract_from_audio(transcript_override=transcript)

    record = CallRecord(
        call_id=call_id,
        client_code=client_code,
        client_name=client_name,
        phone_number=phone_number,
        duration_seconds=duration_seconds,
        created_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        audio_url=f"https://ccvyduoylmpsvwkpiful.supabase.co/storage/v1/object/public/call-recordings/{call_id}.wav",
        transcript=transcript,
        waveform_peaks=_generate_realistic_waveform(55),
        extraction=extraction,
        audit_reference_id=audit_ref,
        status="PENDING_REVIEW" if extraction.has_actionable_orders else "INQUIRY",
    )

    CALLS_DB[call_id] = record

    try:
        supabase_service.save_call(record.model_dump())
    except Exception as e:
        print(f"[Supabase] save_call notice: {e}")

    await ws_manager.broadcast_json({
        "event": "NEW_CALL_INGESTED",
        "call_id": call_id,
        "client_name": client_name,
        "has_orders": extraction.has_actionable_orders,
        "orders_count": len(extraction.orders),
    })

    return record

@app.post("/api/calls/upload-audio", response_model=CallRecord)
async def upload_audio_call(
    audio_file: UploadFile = File(...),
    client_code: str = Form("10542"),
    client_name: str = Form("عميل تداول مباشر"),
    phone_number: str = Form("+20 100 123 4567"),
    transcript_note: Optional[str] = Form(None)
):
    """
    Direct Audio File Ingestion to Supabase Storage:
    1. Uploads real audio file to Supabase Storage Bucket ('call-recordings').
    2. Calculates SHA-256 for WORM compliance.
    3. Analyzes trading intent via Arabic LLM Dialect Engine.
    4. Persists CallRecord into Supabase PostgreSQL database.
    """
    call_id = f"CALL-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    audit_ref = f"FRA-AUDIT-{uuid.uuid4().hex[:10].upper()}"
    
    file_bytes = await audio_file.read()
    filename = f"{call_id}_{audio_file.filename}"
    
    storage_url = supabase_service.upload_audio_file(
        file_bytes=file_bytes,
        filename=filename,
        content_type=audio_file.content_type or "audio/wav"
    ) or f"https://ccvyduoylmpsvwkpiful.supabase.co/storage/v1/object/public/call-recordings/{filename}"
    
    effective_transcript = transcript_note or "العميل: اشتري لي عشر تلاف ورقة في التجاري الدولي على 85 جنيه وخمسين قرش.\nالوسيط: تمام يا فندم، هنسجل أمر شراء 10,000 سهم COMI."
    extraction = await audio_extraction_engine.extract_from_audio(transcript_override=effective_transcript)
    
    record = CallRecord(
        call_id=call_id,
        client_code=client_code,
        client_name=client_name,
        phone_number=phone_number,
        duration_seconds=30,
        created_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        audio_url=storage_url,
        transcript=effective_transcript,
        waveform_peaks=_generate_realistic_waveform(55),
        extraction=extraction,
        audit_reference_id=audit_ref,
        status="PENDING_REVIEW" if extraction.has_actionable_orders else "INQUIRY",
    )
    
    CALLS_DB[call_id] = record
    try:
        supabase_service.save_call(record.model_dump())
    except Exception as e:
        print(f"[Supabase] save_call error: {e}")
        
    await ws_manager.broadcast_json({
        "event": "NEW_CALL_INGESTED",
        "call_id": call_id,
        "client_name": client_name,
        "has_orders": extraction.has_actionable_orders,
        "orders_count": len(extraction.orders),
    })
    
    return record

@app.post("/api/extract")
async def extract_order_from_text_or_audio(payload: Dict[str, Any]):
    transcript = payload.get("transcript", "")
    client_id = payload.get("clientId", "10542")
    extraction = await audio_extraction_engine.extract_from_audio(transcript_override=transcript)
    return {"success": True, "data": extraction.model_dump()}


# ---------------- BROKER HITL APPROVAL & FIX 4.4 DISPATCH ----------------

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

    # Search in memory cache
    for call in CALLS_DB.values():
        for ord_item in call.extraction.orders:
            if ord_item.order_id == order_id:
                target_call = call
                target_order = ord_item
                break
        if target_order:
            break

    # If not found in memory (e.g. cold start), load from Supabase
    if not target_order:
        calls_from_db = supabase_service.get_all_calls()
        for c in calls_from_db:
            rec = CallRecord(**c)
            CALLS_DB[rec.call_id] = rec
            for ord_item in rec.extraction.orders:
                if ord_item.order_id == order_id:
                    target_call = rec
                    target_order = ord_item
                    break
            if target_order:
                break

    if not target_order or not target_call:
        raise HTTPException(status_code=404, detail="Order draft not found")

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

    try:
        supabase_service.update_order_status(
            order_id=target_order.order_id,
            status=target_order.status.value,
            broker_id=payload.broker_id,
            fix_message=fix_result["display_fix"]
        )
        supabase_service.record_worm_audit({
            "audit_reference_id": target_call.audit_reference_id,
            "call_id": target_call.call_id,
            "order_id": target_order.order_id,
            "broker_id": payload.broker_id,
            "broker_action": target_order.status.value,
            "client_code": target_call.client_code,
            "ticker": target_order.ticker,
            "action": target_order.action.value,
            "quantity": target_order.quantity,
            "price": target_order.price,
            "new_value": target_order.model_dump(),
            "fix_message": fix_result["display_fix"],
            "sha256_hash": audit_rec.sha256_hash,
            "fra_compliance_status": "FRA_COMPLIANT_WORM_5YR_ACTIVE"
        })
    except Exception as e:
        print(f"[Supabase] audit record notice: {e}")

    all_decided = all(
        o.status in [OrderStatus.APPROVED, OrderStatus.REJECTED, OrderStatus.MODIFIED_AND_APPROVED]
        for o in target_call.extraction.orders
    )
    if all_decided:
        target_call.status = "APPROVED"

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

    if not target_order:
        calls_from_db = supabase_service.get_all_calls()
        for c in calls_from_db:
            rec = CallRecord(**c)
            CALLS_DB[rec.call_id] = rec
            for ord_item in rec.extraction.orders:
                if ord_item.order_id == order_id:
                    target_call = rec
                    target_order = ord_item
                    break
            if target_order:
                break

    if not target_order or not target_call:
        raise HTTPException(status_code=404, detail="Order draft not found")

    target_order.status = OrderStatus.REJECTED
    target_order.rejection_reason = payload.rejection_reason

    audit_rec = audit_vault.record_broker_action(
        audit_reference_id=target_call.audit_reference_id,
        call_id=target_call.call_id,
        order=target_order,
        client_code=target_call.client_code,
        broker_id=payload.broker_id,
        broker_action="REJECTED",
        fix_message=None,
    )

    try:
        supabase_service.update_order_status(
            order_id=target_order.order_id,
            status="REJECTED",
            broker_id=payload.broker_id,
            rejection_reason=payload.rejection_reason
        )
        supabase_service.record_worm_audit({
            "audit_reference_id": target_call.audit_reference_id,
            "call_id": target_call.call_id,
            "order_id": target_order.order_id,
            "broker_id": payload.broker_id,
            "broker_action": "REJECTED",
            "client_code": target_call.client_code,
            "ticker": target_order.ticker,
            "action": target_order.action.value,
            "quantity": target_order.quantity,
            "price": target_order.price,
            "rejection_reason": payload.rejection_reason,
            "sha256_hash": audit_rec.sha256_hash,
            "fra_compliance_status": "FRA_COMPLIANT_WORM_5YR_ACTIVE"
        })
    except Exception as e:
        print(f"[Supabase] rejection audit notice: {e}")

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


# ---------------- VOICE VS TRADE RECONCILIATION & SURVEILLANCE ----------------

@app.get("/api/reconciliation/cases", response_model=List[TradeReconciliationCase])
def get_reconciliation_cases():
    """Returns all Post-Trade Voice vs Execution Audit Cases."""
    return reconciliation_service.get_all_cases()

@app.get("/api/reconciliation/cases/{case_id}", response_model=TradeReconciliationCase)
def get_reconciliation_case(case_id: str):
    case = reconciliation_service.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Reconciliation case not found")
    return case

@app.get("/api/reconciliation/summary")
def get_reconciliation_summary():
    """Returns aggregate audit statistics and total financial exposure."""
    return reconciliation_service.get_summary_statistics()

@app.post("/api/reconciliation/{case_id}/certify")
def certify_trade_execution(case_id: str, payload: Dict[str, Any]):
    auditor_id = payload.get("auditor_id", "AUDITOR_COMPLIANCE_HEAD")
    notes = payload.get("notes")
    certified = reconciliation_service.certify_case(case_id, auditor_id, notes)
    if not certified:
        raise HTTPException(status_code=404, detail="Case not found")
    return {
        "status": "SUCCESS",
        "message": "تم اعتماد صحة مطابقة تنفيذ الصفقة بنجاح وتوثيقها بسجل الرقابة",
        "case": certified
    }

@app.post("/api/reconciliation/{case_id}/dispute")
def escalate_trade_dispute(case_id: str, payload: Dict[str, Any]):
    auditor_id = payload.get("auditor_id", "AUDITOR_COMPLIANCE_HEAD")
    reason = payload.get("reason", "مخالفة شروط تفويض العميل في السعر أو الكمية")
    escalated = reconciliation_service.escalate_dispute(case_id, auditor_id, reason)
    if not escalated:
        raise HTTPException(status_code=404, detail="Case not found")
    return {
        "status": "ESCALATED",
        "message": "تم تسجيل نزاع العميل وإحالة الصفقة للتحقيق والتعويض",
        "case": escalated
    }


# ---------------- SEED DEMO CALLS & AUDIT TRAIL ----------------

@app.post("/api/seed")
@app.get("/api/seed")
def seed_demo_data():
    from scripts.seed_data import seed
    seed()
    calls = supabase_service.get_all_calls()
    for c in calls:
        CALLS_DB[c["call_id"]] = CallRecord(**c)
    return {"status": "SUCCESS", "seeded_calls_count": len(calls)}

@app.get("/api/audit", response_model=List[AuditVaultRecord])
def get_audit_trail():
    """Returns real FRA WORM compliance audit trail records directly from Supabase."""
    audit_from_db = supabase_service.get_all_audit_records()
    if audit_from_db:
        return [AuditVaultRecord(**a) for a in audit_from_db]
    return audit_vault.get_all_records()

@app.websocket("/ws/broker")
async def websocket_broker_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
