"""
Post-Trade Voice vs Execution Reconciliation & Surveillance Engine.
Audits executed Egyptian Stock Exchange (EGX) trades against client telephone recordings.
Complies with FRA Law 95/1992 Executive Regulations Article 268.
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
import hashlib
import uuid

from app.models.schemas import (
    TradeReconciliationCase,
    ExecutedTrade,
    ReconciliationStatus,
)
from app.services.audit_vault import audit_vault
from app.services.supabase_service import supabase_service

def _calc_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

INITIAL_RECONCILIATION_CASES: List[TradeReconciliationCase] = [
    # Case 1: 100% Compliant Match (COMI)
    TradeReconciliationCase(
        case_id="REC-EGX-20261011-001",
        client_code="10421",
        client_name="أحمد منصور الحسيني",
        phone_number="+20 100 452 8891",
        call_id="CALL-20261011-CIB101",
        call_duration_seconds=42,
        call_created_at="2026-10-11 10:12:30",
        audio_url="https://ccvyduoylmpsvwkpiful.supabase.co/storage/v1/object/public/call-recordings/CALL-20261011-CIB101.wav",
        transcript="العميل: ألو يا كابتن شريف، اشتريلي ألفين سهم في البنك التجاري الدولي سي آي بي بسعر السوق فوراً قبل إغلاق الجلسة.\nالوسيط: تمام يا أستاذ أحمد، أمر شراء 2,000 سهم COMI بسعر السوق، جاري التسجيل.",
        waveform_peaks=[0.2, 0.45, 0.8, 0.65, 0.3, 0.5, 0.9, 0.75, 0.4, 0.6, 0.85, 0.3, 0.2, 0.5, 0.7, 0.85, 0.4, 0.6, 0.95, 0.7, 0.35, 0.5, 0.8, 0.6, 0.3, 0.4, 0.7, 0.5, 0.3],
        audit_reference_id="FRA-AUDIT-COMI-9921",
        voice_ticker="COMI",
        voice_action="BUY",
        voice_quantity=2000,
        voice_order_type="MARKET",
        voice_price=85.20,
        voice_timestamp_range="00:06 - 00:22",
        executed_trade=ExecutedTrade(
            trade_id="EGX-TRD-88412",
            ticker="COMI",
            action="BUY",
            executed_quantity=2000,
            executed_price=85.20,
            execution_time="10:14:02 CLT",
            executing_broker="BROKER_SHERIF_102",
            trade_value_egp=170400.0,
            oms_status="FILLED"
        ),
        reconciliation_status="MATCHED",
        is_compliant=True,
        status_title_ar="تطابق تام بنسبة 100% (سليم ومعتمد)",
        status_badge_color="emerald",
        discrepancy_reasons=[],
        financial_variance_egp=0.0,
        compliance_verdict_ar="التنفيذ سليم تماماً ومطابق لتفويض العميل بالمكالمة من حيث السهم، الكمية، الاتجاه، وسعر السوق. تم اعتماد الصفقة بدون أي ملاحظات.",
        certified_by="AUDITOR_COMPLIANCE_HEAD",
        certified_at="2026-10-11 10:20:00",
        sha256_audit_hash=_calc_sha256("REC-001|COMI|2000|85.20|MATCHED")
    ),

    # Case 2: Price Discrepancy & Dispute (TMGH)
    TradeReconciliationCase(
        case_id="REC-EGX-20261011-002",
        client_code="10893",
        client_name="مريم فاروق الديب",
        phone_number="+20 111 883 2045",
        call_id="CALL-20261011-TMG202",
        call_duration_seconds=55,
        call_created_at="2026-10-11 11:02:15",
        audio_url="https://ccvyduoylmpsvwkpiful.supabase.co/storage/v1/object/public/call-recordings/CALL-20261011-TMG202.wav",
        transcript="العميلة: صباح الخير يا فندم، محتاجة أبيع 5000 سهم من مجموعة طلعت مصطفى تي إم جي إتش على سعر 65 جنيه، لو نزل عن كدة متنفذش.\nالوسيط: أهلاً بحضرتك يا فندم، أمر بيع محدد بسعر 65.00 ج.م لعدد 5,000 سهم TMGH.",
        waveform_peaks=[0.15, 0.35, 0.6, 0.85, 0.7, 0.4, 0.3, 0.65, 0.9, 0.75, 0.5, 0.3, 0.45, 0.8, 0.6, 0.4, 0.7, 0.85, 0.5, 0.3, 0.6, 0.8, 0.4, 0.2, 0.5, 0.7, 0.4, 0.25],
        audit_reference_id="FRA-AUDIT-TMGH-4412",
        voice_ticker="TMGH",
        voice_action="SELL",
        voice_quantity=5000,
        voice_order_type="LIMIT",
        voice_price=65.00,
        voice_timestamp_range="00:08 - 00:31",
        executed_trade=ExecutedTrade(
            trade_id="EGX-TRD-91045",
            ticker="TMGH",
            action="SELL",
            executed_quantity=5000,
            executed_price=64.20,
            execution_time="11:05:43 CLT",
            executing_broker="BROKER_AMR_109",
            trade_value_egp=321000.0,
            oms_status="FILLED"
        ),
        reconciliation_status="PRICE_MISMATCH",
        is_compliant=False,
        status_title_ar="مخالفة سعرية ونزاع عميل (تم البيع بأقل من المشروط)",
        status_badge_color="red",
        discrepancy_reasons=[
            "اشترطت العميلة صراحة في المكالمة ألا يقل سعر البيع عن 65.00 ج.م ('لو نزل عن كدة متنفذش').",
            "تم تنفيذ البيع بالبورصة على سعر 64.20 ج.م بفارق عجز 0.80 ج.م لكل سهم.",
            "إجمالي خسارة العميلة الناتجة عن مخالفة الوسيط: 4,000.00 ج.م."
        ],
        financial_variance_egp=4000.0,
        compliance_verdict_ar="مخالفة صريحة لتعليمات العميل المشروطة هاتفياً. التوصية: إلزام شركة الوساطة بتعويض العميلة فوراً بمبلغ 4,000 ج.م وإحالة الوسيط المنفذ للتحقيق الداخلي.",
        certified_by=None,
        certified_at=None,
        sha256_audit_hash=_calc_sha256("REC-002|TMGH|5000|64.20|PRICE_MISMATCH")
    ),

    # Case 3: Over-Execution Quantity Mismatch (SWDY)
    TradeReconciliationCase(
        case_id="REC-EGX-20261011-003",
        client_code="10542",
        client_name="مصطفى كمال الدين",
        phone_number="+20 100 123 4567",
        call_id="CALL-20261011-SWD303",
        call_duration_seconds=48,
        call_created_at="2026-10-11 12:15:00",
        audio_url="https://ccvyduoylmpsvwkpiful.supabase.co/storage/v1/object/public/call-recordings/CALL-20261011-SWD303.wav",
        transcript="العميل: يا كابتن، اشتريلي عشر تلاف ورقة بس في السويدي اليكتريك على 48.50 جنيه متزودش عن كدة عشان السيولة.\nالوسيط: حاضر يا أستاذ مصطفى، 10 آلاف سهم SWDY على 48.50.",
        waveform_peaks=[0.2, 0.4, 0.7, 0.6, 0.5, 0.3, 0.6, 0.8, 0.5, 0.7, 0.9, 0.4, 0.3, 0.6, 0.75, 0.5, 0.3, 0.4],
        audit_reference_id="FRA-AUDIT-SWDY-7719",
        voice_ticker="SWDY",
        voice_action="BUY",
        voice_quantity=10000,
        voice_order_type="LIMIT",
        voice_price=48.50,
        voice_timestamp_range="00:07 - 00:26",
        executed_trade=ExecutedTrade(
            trade_id="EGX-TRD-66712",
            ticker="SWDY",
            action="BUY",
            executed_quantity=15000,
            executed_price=48.50,
            execution_time="12:18:22 CLT",
            executing_broker="BROKER_SHERIF_102",
            trade_value_egp=727500.0,
            oms_status="FILLED"
        ),
        reconciliation_status="QUANTITY_MISMATCH",
        is_compliant=False,
        status_title_ar="مخالفة كمية زائدة غير مصرح بها (Over-Execution)",
        status_badge_color="red",
        discrepancy_reasons=[
            "المكالمة الهاتفية تثبت تفويض العميل لشراء 10,000 سهم فقط.",
            "تم تنفيذ 15,000 سهم بالبورصة بزيادة قدرها 5,000 سهم عن التفويض المعتمد.",
            "قيمة الأسهم الزائدة المحملة على حساب العميل دون إذن: 242,500.00 ج.م."
        ],
        financial_variance_egp=242500.0,
        compliance_verdict_ar="خطأ تنفيذ من قبل الوسيط ترتب عليه شراء كمية زائدة. التوصية: نقل الـ 5,000 سهم لحساب أخطاء الوساطة (Error Account) فوراً قبل التسوية وإعادة قيد المبلغ لحساب العميل.",
        certified_by=None,
        certified_at=None,
        sha256_audit_hash=_calc_sha256("REC-003|SWDY|15000|48.50|QUANTITY_MISMATCH")
    ),

    # Case 4: Unexecuted Order Omission (FWRY)
    TradeReconciliationCase(
        case_id="REC-EGX-20261011-004",
        client_code="20144",
        client_name="طارق زياد المهندس",
        phone_number="+20 122 994 1178",
        call_id="CALL-20261011-FWR404",
        call_duration_seconds=36,
        call_created_at="2026-10-11 11:40:10",
        audio_url="https://ccvyduoylmpsvwkpiful.supabase.co/storage/v1/object/public/call-recordings/CALL-20261011-FWR404.wav",
        transcript="العميل: ألو، اشتريلي عشرين ألف سهم فوري على 7.45 جنيه دلوقتي حالاً عشان في سيولة هتدخل السهم.\nالوسيط: تمام يا فندم، هسجل أمر شراء 20,000 سهم فوري بسعر 7.45 ج.م فوراً.",
        waveform_peaks=[0.1, 0.3, 0.6, 0.5, 0.4, 0.2, 0.5, 0.7, 0.8, 0.4, 0.3, 0.5, 0.6, 0.4, 0.2],
        audit_reference_id="FRA-AUDIT-FWRY-1088",
        voice_ticker="FWRY",
        voice_action="BUY",
        voice_quantity=20000,
        voice_order_type="LIMIT",
        voice_price=7.45,
        voice_timestamp_range="00:04 - 00:20",
        executed_trade=None,
        reconciliation_status="UNEXECUTED",
        is_compliant=False,
        status_title_ar="إهمال وعدم تنفيذ أمر العميل بالبورصة (Unexecuted Order)",
        status_badge_color="amber",
        discrepancy_reasons=[
            "أصدر العميل أمراً صريحاً قابلاً للتنفيذ لشراء 20,000 سهم فوري بسعر 7.45 ج.م.",
            "أكد الوسيط استلام الأمر وتسجيله هاتفياً.",
            "مراجعة سجلات البورصة أظهرت عدم إرسال الأمر إطلاقاً لنظام التداول طوال ساعات الجلسة."
        ],
        financial_variance_egp=0.0,
        compliance_verdict_ar="إهمال إداري جسيم في تنفيذ أوامر العملاء. السهم صعد بنهاية الجلسة إلى 7.75 ج.م مما حرم العميل من فرصة ربح محققة. التوصية: التحقيق الإداري مع الوسيط وتقدير تعويض الفرصة الضائعة.",
        certified_by=None,
        certified_at=None,
        sha256_audit_hash=_calc_sha256("REC-004|FWRY|20000|7.45|UNEXECUTED")
    ),

    # Case 5: Unauthorized Rogue Trade (CCAP)
    TradeReconciliationCase(
        case_id="REC-EGX-20261011-005",
        client_code="10330",
        client_name="حازم إبراهيم غنيم",
        phone_number="+20 102 334 9901",
        call_id="CALL-20261011-INQ505",
        call_duration_seconds=24,
        call_created_at="2026-10-11 13:05:00",
        audio_url="https://ccvyduoylmpsvwkpiful.supabase.co/storage/v1/object/public/call-recordings/CALL-20261011-INQ505.wav",
        transcript="العميل: هو سهم القلعة عامل كام النهاردة في السوق؟\nالوسيط: القلعة شغال على 2.85 ج.م يا فندم.\nالعميل: تمام شكراً مش هنفذ حاجة دلوقتي هتابع بس.",
        waveform_peaks=[0.1, 0.2, 0.35, 0.4, 0.3, 0.2, 0.3, 0.4, 0.3, 0.2, 0.15],
        audit_reference_id="FRA-AUDIT-CCAP-9092",
        voice_ticker="CCAP",
        voice_action="INQUIRY",
        voice_quantity=0,
        voice_order_type="NONE",
        voice_price=None,
        voice_timestamp_range="00:02 - 00:15",
        executed_trade=ExecutedTrade(
            trade_id="EGX-TRD-44189",
            ticker="CCAP",
            action="BUY",
            executed_quantity=50000,
            executed_price=2.85,
            execution_time="13:14:50 CLT",
            executing_broker="BROKER_TAREK_114",
            trade_value_egp=142500.0,
            oms_status="FILLED"
        ),
        reconciliation_status="UNAUTHORIZED",
        is_compliant=False,
        status_title_ar="تداول غير مصرح به دون تفويض صوتي (Unauthorized Trade)",
        status_badge_color="red",
        discrepancy_reasons=[
            "المكالمة الوحيدة المسجلة مع العميل كانت استفساراً صريحاً ('مش هنفذ حاجة دلوقتي').",
            "تم تنفيذ شراء 50,000 سهم القلعة (CCAP) على حساب العميل بمبلغ 142,500.00 ج.م دون أي تفويض صوتي أو كتابي.",
            "مخالفة جسيمة للمادة 268 من اللائحة التنفيذية للقانون 95 لسنة 1992."
        ],
        financial_variance_egp=142500.0,
        compliance_verdict_ar="مخالفة رقابية جسيمة جداً (التداول على حساب عميل دون تفويض). التوصية: إلغاء العملية فوراً ونقلها لحساب الوسيط الشخصي وإبلاغ قطاع الرقابة على التداول بالبورصة المصرية وهيئة الرقابة المالية.",
        certified_by=None,
        certified_at=None,
        sha256_audit_hash=_calc_sha256("REC-005|CCAP|50000|2.85|UNAUTHORIZED")
    ),
]

class ReconciliationService:
    def __init__(self):
        self.cases_store: Dict[str, TradeReconciliationCase] = {
            c.case_id: c for c in INITIAL_RECONCILIATION_CASES
        }

    def get_all_cases(self) -> List[TradeReconciliationCase]:
        return list(self.cases_store.values())

    def get_case(self, case_id: str) -> Optional[TradeReconciliationCase]:
        return self.cases_store.get(case_id)

    def certify_case(self, case_id: str, auditor_id: str, notes: Optional[str] = None) -> Optional[TradeReconciliationCase]:
        case = self.cases_store.get(case_id)
        if not case:
            return None
        case.certified_by = auditor_id
        case.certified_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        if notes:
            case.compliance_verdict_ar += f" | اعتماد مسؤول الالتزام: {notes}"
        
        # Log to WORM audit vault
        audit_vault.calculate_sha256(f"CERTIFY:{case_id}:{auditor_id}:{case.certified_at}")
        return case

    def escalate_dispute(self, case_id: str, auditor_id: str, dispute_reason: str) -> Optional[TradeReconciliationCase]:
        case = self.cases_store.get(case_id)
        if not case:
            return None
        case.reconciliation_status = "PRICE_MISMATCH" if "سعر" in dispute_reason else "QUANTITY_MISMATCH" if "كمية" in dispute_reason else "UNAUTHORIZED"
        case.is_compliant = False
        case.status_badge_color = "red"
        case.discrepancy_reasons.append(f"إحالة نزاع عميل: {dispute_reason} (بواسطة: {auditor_id})")
        case.certified_by = auditor_id
        case.certified_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        return case

    def get_summary_statistics(self) -> Dict[str, Any]:
        cases = list(self.cases_store.values())
        total = len(cases)
        matched = sum(1 for c in cases if c.reconciliation_status == "MATCHED")
        discrepancies = sum(1 for c in cases if c.reconciliation_status in ["PRICE_MISMATCH", "QUANTITY_MISMATCH", "SIDE_MISMATCH"])
        unexecuted = sum(1 for c in cases if c.reconciliation_status == "UNEXECUTED")
        unauthorized = sum(1 for c in cases if c.reconciliation_status == "UNAUTHORIZED")
        total_exposure = sum(c.financial_variance_egp for c in cases)
        accuracy_rate = round((matched / total * 100), 1) if total > 0 else 100.0

        return {
            "total_cases_audited": total,
            "matched_compliant_count": matched,
            "discrepancies_count": discrepancies,
            "unexecuted_orders_count": unexecuted,
            "unauthorized_trades_count": unauthorized,
            "total_financial_exposure_egp": total_exposure,
            "accuracy_rate_pct": accuracy_rate,
        }

reconciliation_service = ReconciliationService()
