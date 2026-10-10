"""
FIX Protocol Engine (FIX 4.4 / FIX 4.2).
Constructs and serializes NewOrderSingle (MsgType=D) messages for OMS integration.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid
from backend.app.models.schemas import ExtractedOrder, ActionType, OrderType, TimeInForce

class FIXProtocolEngine:
    SOH = "\x01"  # Standard FIX Start of Header delimiter

    @staticmethod
    def _calculate_checksum(message_body: str) -> str:
        """Calculates 3-digit standard FIX checksum (sum of all ASCII values modulo 256)."""
        total = sum(ord(c) for c in message_body) % 256
        return f"{total:03d}"

    @classmethod
    def generate_new_order_single(
        cls,
        order: ExtractedOrder,
        client_code: str,
        broker_id: str,
        seq_num: int = 101,
    ) -> Dict[str, str]:
        """
        Builds a valid FIX 4.4 NewOrderSingle (35=D) message.
        Returns both raw SOH-delimited string and human-readable pipe-delimited format.
        """
        now_utc = datetime.now(timezone.utc).strftime("%Y%m%d-%H:%M:%S.%f")[:-3]
        cl_ord_id = f"CFI-{order.ticker}-{uuid.uuid4().hex[:8].upper()}"

        # FIX Tag Mappings
        # Side: 1 = Buy, 2 = Sell
        side_tag = "1" if order.action == ActionType.BUY else "2"

        # OrdType: 1 = Market, 2 = Limit
        ord_type_tag = "1" if order.order_type == OrderType.MARKET else "2"

        # TimeInForce: 0 = Day, 1 = Good Till Cancel (GTC)
        tif_tag = "0" if order.time_in_force == TimeInForce.DAY else "1"

        # Construct body fields list of (Tag, Value)
        body_tags: List[Tuple[int, str]] = [
            (35, "D"),                     # MsgType = NewOrderSingle
            (49, "CFI_BROKER_CONSOLE"),    # SenderCompID
            (56, "EGX_OMS_GATEWAY"),       # TargetCompID
            (34, str(seq_num)),            # MsgSeqNum
            (52, now_utc),                 # SendingTime
            (11, cl_ord_id),               # ClOrdID
            (1, client_code),              # Account / Client Code
            (55, order.ticker),            # Symbol
            (54, side_tag),                # Side
            (60, now_utc),                 # TransactTime
            (38, str(order.quantity)),     # OrderQty
            (40, ord_type_tag),            # OrdType
            (59, tif_tag),                 # TimeInForce
            (76, broker_id),               # ExecBroker / Desk ID
        ]

        if order.order_type == OrderType.LIMIT and order.price is not None:
            body_tags.append((44, f"{order.price:.3f}"))  # Price

        # Serialize body with SOH
        body_str = "".join(f"{tag}={val}{cls.SOH}" for tag, val in body_tags)
        body_length = len(body_str.encode("ascii"))

        # Standard FIX Header
        header_str = f"8=FIX.4.4{cls.SOH}9={body_length}{cls.SOH}"

        full_message_before_checksum = f"{header_str}{body_str}"
        checksum = cls._calculate_checksum(full_message_before_checksum)
        raw_fix = f"{full_message_before_checksum}10={checksum}{cls.SOH}"

        # Human-readable format replacing SOH with pipe '|'
        display_fix = raw_fix.replace(cls.SOH, " | ")[:-3]

        return {
            "cl_ord_id": cl_ord_id,
            "raw_fix": raw_fix,
            "display_fix": display_fix,
            "sending_time": now_utc,
            "symbol": order.ticker,
            "side": "BUY" if order.action == ActionType.BUY else "SELL",
            "quantity": str(order.quantity),
            "price": str(order.price) if order.price else "MARKET",
        }
