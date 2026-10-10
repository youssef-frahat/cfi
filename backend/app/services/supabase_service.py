"""
Production Supabase Data Service for EGX Voice-to-Order System.
Handles 100% real persistent relational CRUD for calls, orders, tickers, and WORM audit vault.
Zero Mock Data: All data is read from and written to Supabase PostgreSQL.
"""
import os
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ccvyduoylmpsvwkpiful.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "sb_publishable_wgQ1BQA1AQTFZYHr3J8ALQ_1EDaXVTX")

_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        try:
            from supabase import create_client
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print(f"[Supabase] Initialization warning: {e}")
            _supabase_client = None
    return _supabase_client

class SupabaseDataService:
    @staticmethod
    def get_all_calls() -> List[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return []
        try:
            res = client.table("calls").select("*, extracted_orders(*)").order("created_at", desc=True).execute()
            calls_data = []
            for row in res.data:
                orders = row.get("extracted_orders", [])
                calls_data.append({
                    "call_id": row["call_id"],
                    "client_code": row["client_code"],
                    "client_name": row["client_name"],
                    "phone_number": row["phone_number"],
                    "duration_seconds": row["duration_seconds"],
                    "created_at": row["created_at"],
                    "audio_url": row.get("audio_storage_path") or f"https://ccvyduoylmpsvwkpiful.supabase.co/storage/v1/object/public/call-recordings/{row['call_id']}.wav",
                    "transcript": row["transcript"],
                    "waveform_peaks": row.get("waveform_peaks") or [],
                    "audit_reference_id": row["audit_reference_id"],
                    "status": row.get("status", "PENDING_REVIEW"),
                    "extraction": {
                        "call_classification": row["call_classification"],
                        "has_actionable_orders": row["has_actionable_orders"],
                        "confidence_score": float(row["confidence_score"]),
                        "client_mood_or_dispute_flag": row.get("client_mood_dispute", False),
                        "conversation_summary_ar": row.get("conversation_summary_ar", ""),
                        "orders": [
                            {
                                "order_id": o["order_id"],
                                "action": o["action"],
                                "ticker": o["ticker"],
                                "company_name_raw": o["company_name_raw"],
                                "quantity": o["quantity"],
                                "order_type": o["order_type"],
                                "price": float(o["price"]) if o.get("price") is not None else None,
                                "time_in_force": o.get("time_in_force", "DAY"),
                                "audio_timestamp_start": o.get("audio_timestamp_start", "00:00"),
                                "audio_timestamp_end": o.get("audio_timestamp_end", "00:00"),
                                "requires_human_clarification": o.get("requires_human_clarification", False),
                                "ambiguity_reason": o.get("ambiguity_reason"),
                                "notes": o.get("notes"),
                                "status": o.get("status", "PENDING_APPROVAL"),
                                "validation_status": o.get("validation_status", "VALID"),
                                "validation_issues": o.get("validation_issues") or [],
                                "estimated_total_egp": float(o["estimated_total_egp"]) if o.get("estimated_total_egp") else 0.0,
                                "fix_message": o.get("fix_message"),
                                "rejection_reason": o.get("rejection_reason"),
                                "approved_by": o.get("approved_by"),
                                "approval_timestamp": o.get("approval_timestamp")
                            } for o in orders
                        ]
                    }
                })
            return calls_data
        except Exception as e:
            print(f"[Supabase] Error loading calls: {e}")
            return []

    @staticmethod
    def get_call_by_id(call_id: str) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None
        try:
            res = client.table("calls").select("*, extracted_orders(*)").eq("call_id", call_id).limit(1).execute()
            if res.data:
                calls = SupabaseDataService.get_all_calls()
                for c in calls:
                    if c["call_id"] == call_id:
                        return c
            return None
        except Exception as e:
            print(f"[Supabase] Error fetching call {call_id}: {e}")
            return None

    @staticmethod
    def get_all_tickers() -> List[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return []
        try:
            res = client.table("egx_tickers").select("*").execute()
            return [
                {
                    "ticker": r["ticker"],
                    "isin": r["isin"],
                    "name_ar": r["name_ar"],
                    "name_en": r["name_en"],
                    "last_price": float(r["last_price"]),
                    "previous_close": float(r["previous_close"]),
                    "change_pct": float(r["change_pct"]),
                    "high_limit": float(r["high_limit"]),
                    "low_limit": float(r["low_limit"]),
                    "tick_size": float(r["tick_size"]),
                    "market": r.get("market", "EGX30"),
                    "currency": "EGP"
                } for r in res.data
            ]
        except Exception as e:
            print(f"[Supabase] Error loading tickers: {e}")
            return []

    @staticmethod
    def save_call(call_record_dict: Dict[str, Any]) -> bool:
        client = get_supabase_client()
        if not client:
            return False
        try:
            payload = {
                "call_id": call_record_dict["call_id"],
                "client_code": call_record_dict["client_code"],
                "client_name": call_record_dict["client_name"],
                "phone_number": call_record_dict["phone_number"],
                "duration_seconds": call_record_dict["duration_seconds"],
                "transcript": call_record_dict["transcript"],
                "waveform_peaks": call_record_dict.get("waveform_peaks", []),
                "call_classification": call_record_dict["extraction"]["call_classification"],
                "has_actionable_orders": call_record_dict["extraction"]["has_actionable_orders"],
                "confidence_score": call_record_dict["extraction"]["confidence_score"],
                "conversation_summary_ar": call_record_dict["extraction"].get("conversation_summary_ar", ""),
                "audit_reference_id": call_record_dict["audit_reference_id"],
                "status": call_record_dict.get("status", "PENDING_REVIEW")
            }
            client.table("calls").upsert(payload, on_conflict="call_id").execute()
            
            # Save extracted orders
            orders = call_record_dict["extraction"].get("orders", [])
            for ord_data in orders:
                ord_payload = {
                    "order_id": ord_data["order_id"],
                    "call_id": call_record_dict["call_id"],
                    "action": ord_data["action"],
                    "ticker": ord_data["ticker"],
                    "company_name_raw": ord_data["company_name_raw"],
                    "quantity": ord_data["quantity"],
                    "order_type": ord_data["order_type"],
                    "price": ord_data.get("price"),
                    "time_in_force": ord_data.get("time_in_force", "DAY"),
                    "audio_timestamp_start": ord_data.get("audio_timestamp_start", "00:00"),
                    "audio_timestamp_end": ord_data.get("audio_timestamp_end", "00:00"),
                    "requires_human_clarification": ord_data.get("requires_human_clarification", False),
                    "ambiguity_reason": ord_data.get("ambiguity_reason"),
                    "status": ord_data.get("status", "PENDING_APPROVAL"),
                    "validation_status": ord_data.get("validation_status", "VALID"),
                    "validation_issues": ord_data.get("validation_issues", []),
                    "estimated_total_egp": ord_data.get("estimated_total_egp", 0.0),
                    "notes": ord_data.get("notes")
                }
                client.table("extracted_orders").upsert(ord_payload, on_conflict="order_id").execute()
            return True
        except Exception as e:
            print(f"[Supabase] Error saving call: {e}")
            return False

    @staticmethod
    def update_order_status(order_id: str, status: str, broker_id: str, fix_message: Optional[str] = None, rejection_reason: Optional[str] = None) -> bool:
        client = get_supabase_client()
        if not client:
            return False
        try:
            update_data: Dict[str, Any] = {
                "status": status,
                "approved_by": broker_id if status in ["APPROVED", "MODIFIED_AND_APPROVED"] else None,
            }
            if fix_message:
                update_data["fix_message"] = fix_message
            if rejection_reason:
                update_data["rejection_reason"] = rejection_reason
            
            client.table("extracted_orders").update(update_data).eq("order_id", order_id).execute()
            return True
        except Exception as e:
            print(f"[Supabase] Error updating order status: {e}")
            return False

    @staticmethod
    def get_order_by_id(order_id: str) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None
        try:
            res = client.table("extracted_orders").select("*, calls(*)").eq("order_id", order_id).limit(1).execute()
            if res.data:
                return res.data[0]
            return None
        except Exception as e:
            print(f"[Supabase] Error finding order {order_id}: {e}")
            return None

    @staticmethod
    def record_worm_audit(audit_data: Dict[str, Any]) -> bool:
        client = get_supabase_client()
        if not client:
            return False
        try:
            client.table("audit_vault_worm").insert(audit_data).execute()
            return True
        except Exception as e:
            print(f"[Supabase] Error writing WORM audit record: {e}")
            return False

    @staticmethod
    def get_all_audit_records() -> List[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return []
        try:
            res = client.table("audit_vault_worm").select("*").order("created_at", desc=True).execute()
            return [
                {
                    "audit_reference_id": r["audit_reference_id"],
                    "call_id": r["call_id"],
                    "order_id": r["order_id"],
                    "timestamp": r["created_at"],
                    "broker_id": r["broker_id"],
                    "broker_action": r["broker_action"],
                    "client_code": r["client_code"],
                    "ticker": r["ticker"],
                    "action": r["action"],
                    "quantity": r["quantity"],
                    "price": float(r["price"]) if r.get("price") is not None else None,
                    "sha256_hash": r["sha256_hash"],
                    "fra_compliance_status": r["fra_compliance_status"],
                    "fix_message": r.get("fix_message")
                } for r in res.data
            ]
        except Exception as e:
            print(f"[Supabase] Error loading audit trail: {e}")
            return []

supabase_service = SupabaseDataService()
