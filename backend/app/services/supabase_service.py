"""
Supabase Data Service for EGX Voice-to-Order System.
Handles persistent relational CRUD for calls, orders, tickers, and WORM audit vault.
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
            from supabase import create_client, Client
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print(f"[Supabase] Initialization warning: {e}")
            _supabase_client = None
    return _supabase_client

class SupabaseDataService:
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

supabase_service = SupabaseDataService()
