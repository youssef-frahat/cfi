"""
EGX Business Logic & Validation Engine.
Handles:
- EGX Ticker Disambiguation (Egyptian Arabic common names -> Official Symbol & ISIN)
- Tick Size Validation (FRA / EGX market microstructure rules)
- Daily Circuit Breakers & Price Band Checks (±10% / ±20%)
- Order Enrichment (Estimated value, limits)
"""
from typing import Dict, List, Optional, Tuple
import math
from backend.app.models.schemas import (
    EGXTickerInfo,
    ExtractedOrder,
    ValidationStatus,
    OrderType,
)

# Reference Egyptian Stock Exchange database
EGX_DATABASE: Dict[str, EGXTickerInfo] = {
    "COMI": EGXTickerInfo(
        ticker="COMI",
        isin="EGS60121C018",
        name_ar="البنك التجاري الدولي - مصر",
        name_en="Commercial International Bank",
        last_price=85.20,
        previous_close=84.50,
        change_pct=0.83,
        high_limit=101.40,
        low_limit=67.60,
        tick_size=0.01,
        market="EGX30",
    ),
    "TMGH": EGXTickerInfo(
        ticker="TMGH",
        isin="EGS691S1C011",
        name_ar="مجموعة طلعت مصطفى القابضة",
        name_en="Talaat Moustafa Group Holding",
        last_price=64.80,
        previous_close=63.50,
        change_pct=2.05,
        high_limit=76.20,
        low_limit=50.80,
        tick_size=0.01,
        market="EGX30",
    ),
    "FWRY": EGXTickerInfo(
        ticker="FWRY",
        isin="EGS745L1C014",
        name_ar="فوري لتكنولوجيا البنوك والمدفوعات الإلكترونية",
        name_en="Fawry for Banking & Electronic Payment",
        last_price=7.45,
        previous_close=7.30,
        change_pct=2.05,
        high_limit=8.76,
        low_limit=5.84,
        tick_size=0.01,
        market="EGX30",
    ),
    "SWDY": EGXTickerInfo(
        ticker="SWDY",
        isin="EGS3G0Z1C014",
        name_ar="السويدي إليكتريك",
        name_en="Elsewedy Electric",
        last_price=48.50,
        previous_close=47.90,
        change_pct=1.25,
        high_limit=57.48,
        low_limit=38.32,
        tick_size=0.01,
        market="EGX30",
    ),
    "CCAP": EGXTickerInfo(
        ticker="CCAP",
        isin="EGS69101C011",
        name_ar="القلعة للاستشارات المالية",
        name_en="Qalaa Holdings",
        last_price=2.85,
        previous_close=2.78,
        change_pct=2.52,
        high_limit=3.34,
        low_limit=2.22,
        tick_size=0.001,
        market="EGX30",
    ),
    "SKPC": EGXTickerInfo(
        ticker="SKPC",
        isin="EGS380S1C017",
        name_ar="سيدي كرير للبتروكيماويات",
        name_en="Sidi Kerir Petrochemicals",
        last_price=31.20,
        previous_close=30.80,
        change_pct=1.30,
        high_limit=36.96,
        low_limit=24.64,
        tick_size=0.01,
        market="EGX30",
    ),
    "MFPC": EGXTickerInfo(
        ticker="MFPC",
        isin="EGS39021C014",
        name_ar="مصر لإنتاج الأسمدة - موبكو",
        name_en="Misr Fertilizers Production Company (MOPCO)",
        last_price=46.30,
        previous_close=45.50,
        change_pct=1.76,
        high_limit=54.60,
        low_limit=36.40,
        tick_size=0.01,
        market="EGX30",
    ),
    "ABUK": EGXTickerInfo(
        ticker="ABUK",
        isin="EGS38191C010",
        name_ar="أبو قير للأسمدة والصناعات الكيماوية",
        name_en="Abu Qir Fertilizers",
        last_price=62.40,
        previous_close=61.80,
        change_pct=0.97,
        high_limit=74.16,
        low_limit=49.44,
        tick_size=0.01,
        market="EGX30",
    ),
    "HRHO": EGXTickerInfo(
        ticker="HRHO",
        isin="EGS69101C018",
        name_ar="إي إف جي القابضة (هيرمس)",
        name_en="EFG Holding",
        last_price=21.90,
        previous_close=21.50,
        change_pct=1.86,
        high_limit=25.80,
        low_limit=17.20,
        tick_size=0.01,
        market="EGX30",
    ),
    "BTFH": EGXTickerInfo(
        ticker="BTFH",
        isin="EGS693V1C014",
        name_ar="بلتون المالية القابضة",
        name_en="Belton Financial Holding",
        last_price=3.18,
        previous_close=3.10,
        change_pct=2.58,
        high_limit=3.72,
        low_limit=2.48,
        tick_size=0.001,
        market="EGX30",
    ),
    "PHDC": EGXTickerInfo(
        ticker="PHDC",
        isin="EGS65591C017",
        name_ar="بالم هيلز للتعمير",
        name_en="Palm Hills Developments",
        last_price=5.60,
        previous_close=5.50,
        change_pct=1.82,
        high_limit=6.60,
        low_limit=4.40,
        tick_size=0.01,
        market="EGX30",
    ),
    "EMFD": EGXTickerInfo(
        ticker="EMFD",
        isin="EGS65601C015",
        name_ar="إعمار مصر للتنمية",
        name_en="Emaar Misr for Development",
        last_price=7.95,
        previous_close=7.80,
        change_pct=1.92,
        high_limit=9.36,
        low_limit=6.24,
        tick_size=0.01,
        market="EGX30",
    ),
    "ESRS": EGXTickerInfo(
        ticker="ESRS",
        isin="EGS3G071C016",
        name_ar="حديد عز",
        name_en="Ezz Steel",
        last_price=104.50,
        previous_close=102.00,
        change_pct=2.45,
        high_limit=122.40,
        low_limit=81.60,
        tick_size=0.05,
        market="EGX30",
    ),
    "ETEL": EGXTickerInfo(
        ticker="ETEL",
        isin="EGS48031C016",
        name_ar="المصرية للاتصالات",
        name_en="Telecom Egypt (WE)",
        last_price=39.20,
        previous_close=38.80,
        change_pct=1.03,
        high_limit=46.56,
        low_limit=31.04,
        tick_size=0.01,
        market="EGX30",
    ),
    "AMOC": EGXTickerInfo(
        ticker="AMOC",
        isin="EGS38321C014",
        name_ar="الإسكندرية للزيوت المعدنية - أموك",
        name_en="Alexandria Mineral Oils Company",
        last_price=9.35,
        previous_close=9.20,
        change_pct=1.63,
        high_limit=11.04,
        low_limit=7.36,
        tick_size=0.01,
        market="EGX30",
    ),
    "ISPH": EGXTickerInfo(
        ticker="ISPH",
        isin="EGS3G111C013",
        name_ar="ابن سينا فارما",
        name_en="Ibnsina Pharma",
        last_price=3.95,
        previous_close=3.90,
        change_pct=1.28,
        high_limit=4.68,
        low_limit=3.12,
        tick_size=0.001,
        market="EGX30",
    ),
}

# Colloquial Egyptian Stock Slang & Name Aliases to Ticker
TICKER_ALIASES: Dict[str, str] = {
    # COMI
    "comi": "COMI",
    "تجاري": "COMI",
    "التجاري": "COMI",
    "التجاري الدولي": "COMI",
    "البنك التجاري الدولي": "COMI",
    "السي آي بي": "COMI",
    "السي اي بي": "COMI",
    "cib": "COMI",
    # TMGH
    "tmgh": "TMGH",
    "طلعت": "TMGH",
    "طلعت مصطفى": "TMGH",
    "مجموعة طلعت مصطفى": "TMGH",
    "مجموعة طلعت": "TMGH",
    # FWRY
    "fwry": "FWRY",
    "فوري": "FWRY",
    "فورى": "FWRY",
    "فوري للمدفوعات": "FWRY",
    # SWDY
    "swdy": "SWDY",
    "السويدي": "SWDY",
    "السويدى": "SWDY",
    "السويدي إليكتريك": "SWDY",
    "السويدي اليكتريك": "SWDY",
    # CCAP
    "ccap": "CCAP",
    "القلعة": "CCAP",
    "القلعه": "CCAP",
    "شركة القلعة": "CCAP",
    # SKPC
    "skpc": "SKPC",
    "سيدبك": "SKPC",
    "سيدي كرير": "SKPC",
    "سيدى كرير": "SKPC",
    # MFPC
    "mfpc": "MFPC",
    "موبكو": "MFPC",
    "مصر لإنتاج الأسمدة": "MFPC",
    # ABUK
    "abuk": "ABUK",
    "أبو قير": "ABUK",
    "ابو قير": "ABUK",
    "ابوقير": "ABUK",
    "أبو قير للأسمدة": "ABUK",
    # HRHO
    "hrho": "HRHO",
    "هيرمس": "HRHO",
    "هيرميس": "HRHO",
    "المجموعة المالية": "HRHO",
    "إي إف جي": "HRHO",
    "اي اف جي": "HRHO",
    "efg": "HRHO",
    # BTFH
    "btfh": "BTFH",
    "بلتون": "BTFH",
    "بلتون المالية": "BTFH",
    # PHDC
    "phdc": "PHDC",
    "بالم هيلز": "PHDC",
    "بالم": "PHDC",
    # EMFD
    "emfd": "EMFD",
    "إعمار": "EMFD",
    "اعمار": "EMFD",
    "إعمار مصر": "EMFD",
    # ESRS
    "esrs": "ESRS",
    "حديد عز": "ESRS",
    "عز": "ESRS",
    "عز الدخيلة": "ESRS",
    # ETEL
    "etel": "ETEL",
    "المصرية للاتصالات": "ETEL",
    "وي": "ETEL",
    "المصرية": "ETEL",
    # AMOC
    "amoc": "AMOC",
    "أموك": "AMOC",
    "اموك": "AMOC",
    # ISPH
    "isph": "ISPH",
    "ابن سينا": "ISPH",
    "ابن سينا فارما": "ISPH",
}


class EGXValidationEngine:
    @staticmethod
    def resolve_ticker(raw_text: str) -> Optional[str]:
        """Resolves colloquial spoken name or symbol to canonical EGX ticker symbol."""
        if not raw_text:
            return None
        cleaned = raw_text.strip().lower()
        if cleaned.upper() in EGX_DATABASE:
            return cleaned.upper()
        
        # Check alias dictionary
        if cleaned in TICKER_ALIASES:
            return TICKER_ALIASES[cleaned]
        
        # Partial match on aliases
        for alias, ticker in TICKER_ALIASES.items():
            if alias in cleaned or cleaned in alias:
                return ticker
                
        return None

    @staticmethod
    def get_ticker_info(ticker: str) -> Optional[EGXTickerInfo]:
        """Returns market info and limits for a given ticker."""
        return EGX_DATABASE.get(ticker.upper())

    @staticmethod
    def validate_and_enrich_order(order: ExtractedOrder) -> ExtractedOrder:
        """
        Validates order against EGX business rules:
        - Ticker existence & resolution
        - Tick size check
        - Price band boundary (Circuit breaker)
        - Quantity positivity
        - Value estimation
        """
        issues: List[str] = []
        status = ValidationStatus.VALID

        # 1. Resolve & check ticker
        canonical_ticker = EGXValidationEngine.resolve_ticker(order.ticker) or EGXValidationEngine.resolve_ticker(order.company_name_raw)
        if canonical_ticker:
            order.ticker = canonical_ticker
            ticker_info = EGX_DATABASE[canonical_ticker]
            order.current_market_price = ticker_info.last_price
            order.price_band_lower = ticker_info.low_limit
            order.price_band_upper = ticker_info.high_limit
            order.tick_size = ticker_info.tick_size
        else:
            issues.append(f"رمز الورقة المالية '{order.ticker}' غير مدرج أو غير معروف في البورصة المصرية.")
            status = ValidationStatus.INVALID
            ticker_info = None

        # 2. Check Quantity
        if order.quantity <= 0:
            issues.append("الكمية المطلوبة يجب أن تكون أكبر من الصفر.")
            status = ValidationStatus.INVALID

        # 3. Check Price & Tick Size (if Limit order)
        if order.order_type == OrderType.LIMIT:
            if order.price is None or order.price <= 0:
                issues.append("الأمر محدد بسعر (LIMIT) لكن لم يتم تحديد قيمة السعر.")
                status = ValidationStatus.INVALID
            elif ticker_info:
                # Price band limits check
                if order.price > ticker_info.high_limit:
                    issues.append(
                        f"تنبيه: السعر المحدد ({order.price:.2f} ج.م) يتجاوز الحد السعري الأعلى للجلسة ({ticker_info.high_limit:.2f} ج.م +20%)."
                    )
                    status = ValidationStatus.WARNING
                elif order.price < ticker_info.low_limit:
                    issues.append(
                        f"تنبيه: السعر المحدد ({order.price:.2f} ج.م) أقل من الحد السعري الأدنى للجلسة ({ticker_info.low_limit:.2f} ج.م -20%)."
                    )
                    status = ValidationStatus.WARNING

                # Tick size check
                # Check if price aligns with tick size modulo
                tick = ticker_info.tick_size
                remainder = round((order.price % tick), 4)
                if remainder != 0.0 and abs(remainder - tick) > 0.0001:
                    issues.append(
                        f"تنبيه: السعر ({order.price:.3f} ج.م) لا يتوافق تماماً مع وحدة المزايدة المعتمدة ({tick} ج.م)."
                    )
                    if status != ValidationStatus.INVALID:
                        status = ValidationStatus.WARNING
        elif order.order_type == OrderType.MARKET:
            order.price = None  # Market orders must have null price as per EGX PRD

        # 4. Calculate estimated order value in EGP
        effective_price = order.price if (order.order_type == OrderType.LIMIT and order.price) else (ticker_info.last_price if ticker_info else 0.0)
        order.estimated_total_egp = round(order.quantity * effective_price, 2)

        # 5. Check clarification requirement
        if order.requires_human_clarification:
            issues.append(f"مطلوب مراجعة الوسيط: {order.ambiguity_reason or 'بيانات غير واضحة في التسجيل الصوتي'}")
            if status == ValidationStatus.VALID:
                status = ValidationStatus.WARNING

        order.validation_status = status
        order.validation_issues = issues
        return order
