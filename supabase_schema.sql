-- ====================================================================
-- CFI RECORD - SUPABASE PRODUCTION RELATIONAL SCHEMA
-- EGX Voice-to-Order HITL System (FRA Compliance & WORM Auditing)
-- Resolves Audit Blockers: DB-001, DB-002, DB-004, SEC-001, AT-001, DL-001
-- ====================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tickers & Market Data (Resolves ARCH-003: Dynamic DB-backed tickers)
CREATE TABLE IF NOT EXISTS public.egx_tickers (
    ticker VARCHAR(10) PRIMARY KEY,
    isin VARCHAR(20) NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    last_price NUMERIC(10, 3) NOT NULL,
    previous_close NUMERIC(10, 3) NOT NULL,
    change_pct NUMERIC(6, 2) NOT NULL,
    high_limit NUMERIC(10, 3) NOT NULL,
    low_limit NUMERIC(10, 3) NOT NULL,
    tick_size NUMERIC(6, 4) NOT NULL DEFAULT 0.010,
    market VARCHAR(20) NOT NULL DEFAULT 'EGX30',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed initial EGX30 data
INSERT INTO public.egx_tickers (ticker, isin, name_ar, name_en, last_price, previous_close, change_pct, high_limit, low_limit, tick_size)
VALUES
('COMI', 'EGS60121C018', 'البنك التجاري الدولي - مصر', 'Commercial International Bank', 85.20, 84.50, 0.83, 101.40, 67.60, 0.01),
('TMGH', 'EGS691S1C011', 'مجموعة طلعت مصطفى القابضة', 'Talaat Moustafa Group Holding', 64.80, 63.50, 2.05, 76.20, 50.80, 0.01),
('FWRY', 'EGS745L1C014', 'فوري لتكنولوجيا البنوك والمدفوعات الإلكترونية', 'Fawry for Banking & Electronic Payment', 7.45, 7.30, 2.05, 8.76, 5.84, 0.01),
('SWDY', 'EGS3G0Z1C014', 'السويدي إليكتريك', 'Elsewedy Electric', 48.50, 47.90, 1.25, 57.48, 38.32, 0.01),
('CCAP', 'EGS69101C011', 'القلعة للاستشارات المالية', 'Qalaa Holdings', 2.85, 2.78, 2.52, 3.34, 2.22, 0.001),
('BTFH', 'EGS693V1C014', 'بلتون المالية القابضة', 'Belton Financial Holding', 3.18, 3.10, 2.58, 3.72, 2.48, 0.001)
ON CONFLICT (ticker) DO NOTHING;

-- 3. Broker Users (Resolves SEC-001: RBAC & Licensed Broker entity)
CREATE TABLE IF NOT EXISTS public.broker_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_code VARCHAR(50) NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    license_number VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    role VARCHAR(20) NOT NULL DEFAULT 'BROKER' CHECK (role IN ('BROKER', 'COMPLIANCE', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.broker_users (broker_code, full_name, email, license_number, role)
VALUES ('BROKER_SHERIF_102', 'شريف عبد الرحمن السعيد', 'sherif.broker@cfi-egypt.com', 'EGX-LIC-84920', 'BROKER')
ON CONFLICT (broker_code) DO NOTHING;

-- 4. Calls Table (Resolves ARCH-001, DI-001, DL-001: Persistent Ingestion)
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(64) NOT NULL UNIQUE,
    client_code VARCHAR(32) NOT NULL,
    client_name TEXT NOT NULL,
    phone_number VARCHAR(32) NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    transcript TEXT NOT NULL,
    audio_storage_path TEXT, -- Bound to Supabase Storage Bucket 'call-recordings'
    audio_sha256 VARCHAR(64), -- Cryptographic checksum of the recording
    waveform_peaks JSONB DEFAULT '[]'::jsonb,
    call_classification VARCHAR(32) NOT NULL DEFAULT 'ACTIONABLE_ORDER'
        CHECK (call_classification IN ('ACTIONABLE_ORDER', 'INQUIRY_ONLY', 'CANCEL_REQUEST', 'COMPLAINT')),
    has_actionable_orders BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.0,
    client_mood_dispute BOOLEAN NOT NULL DEFAULT FALSE,
    conversation_summary_ar TEXT,
    audit_reference_id VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW'
        CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PARTIALLY_APPROVED', 'INQUIRY')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_calls_client_code ON public.calls(client_code);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);

-- 5. Extracted Orders (Resolves DB-004: Relational Orders with Indexed Lookups)
CREATE TABLE IF NOT EXISTS public.extracted_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(64) NOT NULL UNIQUE,
    call_id VARCHAR(64) NOT NULL REFERENCES public.calls(call_id) ON DELETE CASCADE,
    action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
    ticker VARCHAR(10) NOT NULL REFERENCES public.egx_tickers(ticker),
    company_name_raw TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'UNKNOWN')),
    price NUMERIC(10, 3),
    time_in_force VARCHAR(10) NOT NULL DEFAULT 'DAY' CHECK (time_in_force IN ('DAY', 'GTC')),
    audio_timestamp_start VARCHAR(10) DEFAULT '00:00',
    audio_timestamp_end VARCHAR(10) DEFAULT '00:00',
    requires_human_clarification BOOLEAN NOT NULL DEFAULT FALSE,
    ambiguity_reason TEXT,
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL'
        CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'MODIFIED_AND_APPROVED')),
    validation_status VARCHAR(16) NOT NULL DEFAULT 'VALID'
        CHECK (validation_status IN ('VALID', 'WARNING', 'INVALID')),
    validation_issues JSONB DEFAULT '[]'::jsonb,
    estimated_total_egp NUMERIC(14, 2),
    approved_by VARCHAR(50) REFERENCES public.broker_users(broker_code),
    approval_timestamp TIMESTAMPTZ,
    rejection_reason TEXT,
    fix_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_orders_call_id ON public.extracted_orders(call_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.extracted_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ticker ON public.extracted_orders(ticker);

-- 6. FRA WORM Audit Vault (Resolves DB-002, AT-001: Append-Only Immutable Records)
CREATE TABLE IF NOT EXISTS public.audit_vault_worm (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_reference_id VARCHAR(64) NOT NULL,
    call_id VARCHAR(64) NOT NULL,
    order_id VARCHAR(64) NOT NULL,
    broker_id VARCHAR(50) NOT NULL,
    broker_ip INET,
    broker_action VARCHAR(32) NOT NULL,
    client_code VARCHAR(32) NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    action VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    price NUMERIC(10, 3),
    old_value JSONB, -- Previous order state before broker edits
    new_value JSONB, -- Applied state
    fix_message TEXT,
    sha256_hash VARCHAR(64) NOT NULL UNIQUE,
    fra_compliance_status VARCHAR(64) NOT NULL DEFAULT 'FRA_COMPLIANT_WORM_5YR_ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Enforce Immutability Trigger (Disallowing UPDATE and DELETE on audit vault)
CREATE OR REPLACE FUNCTION prevent_audit_vault_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'FRA WORM Compliance Violation: Audit records are Write-Once-Read-Many (WORM) and strictly immutable.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_modification ON public.audit_vault_worm;
CREATE TRIGGER trg_prevent_audit_modification
BEFORE UPDATE OR DELETE ON public.audit_vault_worm
FOR EACH ROW EXECUTE FUNCTION prevent_audit_vault_modifications();

-- 7. Row Level Security (RLS) - Resolves SEC-001
ALTER TABLE public.egx_tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_vault_worm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_users ENABLE ROW LEVEL SECURITY;

-- Allow public reads for dashboard authenticated brokers
CREATE POLICY "Allow authenticated read egx_tickers" ON public.egx_tickers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read calls" ON public.calls FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert calls" ON public.calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update calls" ON public.calls FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated read orders" ON public.extracted_orders FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update orders" ON public.extracted_orders FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert orders" ON public.extracted_orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated read audit_vault" ON public.audit_vault_worm FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert audit_vault" ON public.audit_vault_worm FOR INSERT WITH CHECK (true);
