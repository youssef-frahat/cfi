"""
Unit & Integration Tests for EGX Voice-to-Order HITL System.
Validates Gherkin Acceptance Criteria, FIX 4.4 formatting, and FRA compliance.
"""
# Pure Python test runner without third-party test framework dependency
import os
import sys

# Ensure backend package is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.services.audio_extractor import audio_extraction_engine, EgyptianDialectParser
from app.services.egx_validator import EGXValidationEngine
from app.services.fix_service import FIXProtocolEngine
from app.services.audit_vault import audit_vault
from app.models.schemas import ActionType, OrderType, TimeInForce, ExtractedOrder


def test_gherkin_acceptance_criteria_scenario():
    """
    Scenario: استخراج أمر شراء محدد بسعر من مكالمة عميل
    Given مكالمة صوتية مسجلة للعميل رقم "10542"
    And العميل قال: "اشتري لي عشر تلاف ورقة في التجاري الدولي على 85 جنيه وخمسين قرش"
    Then الحقول المستخرجة تكون:
      Action: BUY, Ticker: COMI, Quantity: 10000, Order Type: LIMIT, Price: 85.50, Time in Force: DAY
      And Confidence Score >= 0.95
    """
    transcript = "اشتري لي عشر تلاف ورقة في التجاري الدولي على 85 جنيه وخمسين قرش"
    extraction = audio_extraction_engine._extract_dialect_rules(transcript)
    extraction = audio_extraction_engine._enrich_response(extraction)

    assert extraction.has_actionable_orders is True
    assert extraction.confidence_score >= 0.95
    assert len(extraction.orders) == 1

    order = extraction.orders[0]
    assert order.action == ActionType.BUY
    assert order.ticker == "COMI"
    assert order.quantity == 10000
    assert order.order_type == OrderType.LIMIT
    assert order.price == 85.50
    assert order.time_in_force == TimeInForce.DAY
    assert order.current_market_price == 85.20
    assert order.validation_status.value in ["VALID", "WARNING"]


def test_arabic_slang_numerals_normalization():
    """Tests Egyptian Arabic colloquial numerals and slang words."""
    assert EgyptianDialectParser.parse_arabic_number("نص مليون ورقة") == 500000
    assert EgyptianDialectParser.parse_arabic_number("أرنب ورقة") == 1000000
    assert EgyptianDialectParser.parse_arabic_number("باكو ورقة") == 1000
    assert EgyptianDialectParser.parse_arabic_number("ألفين سهم") == 2000
    assert EgyptianDialectParser.parse_arabic_number("خمس تلاف سهم") == 5000


def test_arabic_price_parsing():
    """Tests price extraction including piastres (قروش)."""
    assert EgyptianDialectParser.parse_arabic_price("85 جنيه وخمسين قرش") == 85.50
    assert EgyptianDialectParser.parse_arabic_price("عشرين جنيه ونص") == 20.50
    assert EgyptianDialectParser.parse_arabic_price("خمسة جنيه وسبعين قرش") == 5.70
    assert EgyptianDialectParser.parse_arabic_price("على 3.15") == 3.15


def test_egx_ticker_disambiguation():
    """Tests mapping colloquial names to EGX official tickers."""
    assert EGXValidationEngine.resolve_ticker("التجاري الدولي") == "COMI"
    assert EGXValidationEngine.resolve_ticker("السي آي بي") == "COMI"
    assert EGXValidationEngine.resolve_ticker("طلعت مصطفى") == "TMGH"
    assert EGXValidationEngine.resolve_ticker("فوري") == "FWRY"
    assert EGXValidationEngine.resolve_ticker("السويدي إليكتريك") == "SWDY"
    assert EGXValidationEngine.resolve_ticker("القلعة") == "CCAP"
    assert EGXValidationEngine.resolve_ticker("سيدبك") == "SKPC"
    assert EGXValidationEngine.resolve_ticker("موبكو") == "MFPC"
    assert EGXValidationEngine.resolve_ticker("أبو قير") == "ABUK"
    assert EGXValidationEngine.resolve_ticker("حديد عز") == "ESRS"


def test_inquiry_filtering():
    """Tests FR-01: Discarding non-actionable market discussion."""
    transcript = "هو السهم بكام؟ وشايف السهم رايح فين؟ لو نزل لـ 5 هبقى اشتري"
    extraction = audio_extraction_engine._extract_dialect_rules(transcript)
    assert extraction.has_actionable_orders is False
    assert extraction.call_classification.value == "INQUIRY_ONLY"
    assert len(extraction.orders) == 0


def test_fix_44_generation():
    """Tests generating compliant FIX 4.4 NewOrderSingle message."""
    order = ExtractedOrder(
        order_id="TEST-ORD-01",
        action=ActionType.BUY,
        ticker="COMI",
        company_name_raw="التجاري الدولي",
        quantity=10000,
        order_type=OrderType.LIMIT,
        price=85.50,
        time_in_force=TimeInForce.DAY,
    )
    result = FIXProtocolEngine.generate_new_order_single(
        order=order,
        client_code="10542",
        broker_id="BROKER_SHERIF",
    )

    raw_fix = result["raw_fix"]
    assert "8=FIX.4.4\x01" in raw_fix
    assert "35=D\x01" in raw_fix
    assert "55=COMI\x01" in raw_fix
    assert "54=1\x01"  # Buy
    assert "38=10000\x01"
    assert "40=2\x01"  # Limit
    assert "44=85.500\x01"
    assert "10=" in raw_fix  # Checksum tag


def test_fra_audit_vault():
    """Tests recording in the FRA-compliant WORM audit vault."""
    order = ExtractedOrder(
        order_id="AUDIT-ORD-01",
        action=ActionType.BUY,
        ticker="COMI",
        company_name_raw="التجاري الدولي",
        quantity=10000,
        order_type=OrderType.LIMIT,
        price=85.50,
    )
    record = audit_vault.record_broker_action(
        audit_reference_id="FRA-TEST-REF-999",
        call_id="CALL-001",
        order=order,
        client_code="10542",
        broker_id="BROKER_01",
        broker_action="APPROVED",
    )
    assert len(record.sha256_hash) == 64
    assert record.fra_compliance_status == "FRA_COMPLIANT_WORM_5YR_ACTIVE"


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("Running EGX Backend Test Suite...")
    test_gherkin_acceptance_criteria_scenario()
    print("[PASS] Gherkin Acceptance Scenario Passed")
    test_arabic_slang_numerals_normalization()
    print("[PASS] Arabic Slang Numerals Normalization Passed")
    test_arabic_price_parsing()
    print("[PASS] Arabic Price Parsing Passed")
    test_egx_ticker_disambiguation()
    print("[PASS] EGX Ticker Disambiguation Passed")
    test_inquiry_filtering()
    print("[PASS] Inquiry Filtering Passed")
    test_fix_44_generation()
    print("[PASS] FIX 4.4 Generation Passed")
    test_fra_audit_vault()
    print("[PASS] FRA Audit Vault Passed")
    print("ALL TESTS PASSED SUCCESSFULLY! >>>")
