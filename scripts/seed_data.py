import os
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from app.services.supabase_service import supabase_service

demo_calls = [
    {
        'call_id': 'CALL-20261011-CIB101',
        'client_code': '10421',
        'client_name': 'أحمد منصور الحسيني',
        'phone_number': '+20 100 452 8891',
        'duration_seconds': 42,
        'transcript': 'العميل: ألو يا كابتن شريف، اشتريلي ألفين سهم في البنك التجاري الدولي سي آي بي بسعر السوق فوراً قبل إغلاق الجلسة.\nالوسيط: تمام يا أستاذ أحمد، أمر شراء 2,000 سهم COMI بسعر السوق، جاري التسجيل للاعتماد.',
        'waveform_peaks': [0.2, 0.45, 0.8, 0.65, 0.3, 0.5, 0.9, 0.75, 0.4, 0.6, 0.85, 0.3, 0.2, 0.5, 0.7, 0.85, 0.4, 0.6, 0.95, 0.7, 0.35, 0.5, 0.8, 0.6, 0.3, 0.4, 0.7, 0.5, 0.3],
        'audit_reference_id': 'FRA-AUDIT-COMI-9921',
        'status': 'PENDING_REVIEW',
        'extraction': {
            'call_classification': 'ACTIONABLE_ORDER',
            'has_actionable_orders': True,
            'confidence_score': 0.97,
            'conversation_summary_ar': 'أمر شراء صريح ومؤكد لعدد 2,000 سهم في البنك التجاري الدولي (COMI) بسعر السوق.',
            'orders': [
                {
                    'order_id': 'ORD-COMI-101',
                    'action': 'BUY',
                    'ticker': 'COMI',
                    'company_name_raw': 'البنك التجاري الدولي - مصر',
                    'quantity': 2000,
                    'order_type': 'MARKET',
                    'price': 85.20,
                    'time_in_force': 'DAY',
                    'audio_timestamp_start': '00:05',
                    'audio_timestamp_end': '00:22',
                    'requires_human_clarification': False,
                    'status': 'PENDING_APPROVAL',
                    'validation_status': 'VALID',
                    'validation_issues': [],
                    'estimated_total_egp': 170400.0,
                    'notes': 'السعر المرجعي 85.20 ج.م ضمن الحدود السعرية المعتمدة (+0.83%)'
                }
            ]
        }
    },
    {
        'call_id': 'CALL-20261011-TMG202',
        'client_code': '10893',
        'client_name': 'مريم فاروق الديب',
        'phone_number': '+20 111 883 2045',
        'duration_seconds': 55,
        'transcript': 'العميلة: صباح الخير يا فندم، محتاجة أبيع 5000 سهم من مجموعة طلعت مصطفى تي إم جي إتش على سعر 65 جنيه، لو نزل عن كدة متنفذش.\nالوسيط: أهلاً بحضرتك يا فندم، أمر بيع محدد بسعر 65.00 ج.م لعدد 5,000 سهم TMGH، تم استلام الأمر للمطابقة.',
        'waveform_peaks': [0.15, 0.35, 0.6, 0.85, 0.7, 0.4, 0.3, 0.65, 0.9, 0.75, 0.5, 0.3, 0.45, 0.8, 0.6, 0.4, 0.7, 0.85, 0.5, 0.3, 0.6, 0.8, 0.4, 0.2, 0.5, 0.7, 0.4, 0.25],
        'audit_reference_id': 'FRA-AUDIT-TMGH-4412',
        'status': 'PENDING_REVIEW',
        'extraction': {
            'call_classification': 'ACTIONABLE_ORDER',
            'has_actionable_orders': True,
            'confidence_score': 0.95,
            'conversation_summary_ar': 'أمر بيع محدد السعر (LIMIT) لعدد 5,000 سهم في طلعت مصطفى (TMGH) بسعر 65.00 ج.م.',
            'orders': [
                {
                    'order_id': 'ORD-TMGH-202',
                    'action': 'SELL',
                    'ticker': 'TMGH',
                    'company_name_raw': 'مجموعة طلعت مصطفى القابضة',
                    'quantity': 5000,
                    'order_type': 'LIMIT',
                    'price': 65.00,
                    'time_in_force': 'DAY',
                    'audio_timestamp_start': '00:08',
                    'audio_timestamp_end': '00:31',
                    'requires_human_clarification': False,
                    'status': 'PENDING_APPROVAL',
                    'validation_status': 'VALID',
                    'validation_issues': [],
                    'estimated_total_egp': 325000.0,
                    'notes': 'السعر المحدد 65.00 ج.م يقع ضمن النطاق السعري اليومي المسموح به (50.80 - 76.20 ج.م)'
                }
            ]
        }
    },
    {
        'call_id': 'CALL-20261011-INQ303',
        'client_code': '20144',
        'client_name': 'طارق زياد المهندس',
        'phone_number': '+20 122 994 1178',
        'duration_seconds': 28,
        'transcript': 'العميل: يا شريف باشا، أسهم فوري عاملة كام النهاردة؟ وشوفلي السويدي برضه شغال على كام لو سمحت.\nالوسيط: فوري حالياً على 7.45 ج.م مرتفع 2%، والسويدي على 48.50 ج.م.',
        'waveform_peaks': [0.1, 0.25, 0.4, 0.5, 0.35, 0.2, 0.3, 0.45, 0.6, 0.4, 0.25, 0.3, 0.5, 0.4, 0.2, 0.35, 0.5, 0.3, 0.2, 0.4, 0.3, 0.15],
        'audit_reference_id': 'FRA-AUDIT-INQ-1088',
        'status': 'INQUIRY',
        'extraction': {
            'call_classification': 'INQUIRY_ONLY',
            'has_actionable_orders': False,
            'confidence_score': 0.99,
            'conversation_summary_ar': 'استفسار عن أسعار أسهم فوري والسويدي إليكتريك دون طلب تنفيذ أوامر.',
            'orders': []
        }
    }
]

def seed():
    print("[Seed] Inserting demo calls to Supabase...")
    for call in demo_calls:
        success = supabase_service.save_call(call)
        print(f"  - Saved {call['call_id']}: {success}")

    calls = supabase_service.get_all_calls()
    print(f"[Seed] Done! Total calls in Supabase: {len(calls)}")

if __name__ == "__main__":
    seed()
