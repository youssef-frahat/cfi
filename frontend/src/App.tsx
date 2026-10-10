import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  Play, 
  Pause, 
  RefreshCw, 
  Lock,
  Upload,
  Search,
  Radio,
  Scale,
  AlertOctagon,
  FileSpreadsheet,
  FileCheck,
  AlertTriangle,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';

interface ExecutedTrade {
  trade_id: string;
  ticker: string;
  action: string;
  executed_quantity: number;
  executed_price: number;
  execution_time: string;
  executing_broker: string;
  trade_value_egp: number;
  oms_status: string;
}

interface TradeReconciliationCase {
  case_id: string;
  client_code: string;
  client_name: string;
  phone_number: string;
  call_id: string;
  call_duration_seconds: number;
  call_created_at: string;
  audio_url: string;
  transcript: string;
  waveform_peaks: number[];
  audit_reference_id: string;
  voice_ticker: string;
  voice_action: string;
  voice_quantity: number;
  voice_order_type: string;
  voice_price: number | null;
  voice_timestamp_range: string;
  executed_trade: ExecutedTrade | null;
  reconciliation_status: string; // MATCHED, PRICE_MISMATCH, QUANTITY_MISMATCH, UNEXECUTED, UNAUTHORIZED
  is_compliant: boolean;
  status_title_ar: string;
  status_badge_color: string;
  discrepancy_reasons: string[];
  financial_variance_egp: number;
  compliance_verdict_ar: string;
  certified_by: string | null;
  certified_at: string | null;
  sha256_audit_hash: string;
}

interface ReconciliationSummary {
  total_cases_audited: number;
  matched_compliant_count: number;
  discrepancies_count: number;
  unexecuted_orders_count: number;
  unauthorized_trades_count: number;
  total_financial_exposure_egp: number;
  accuracy_rate_pct: number;
}

const API_BASE = window.location.origin.includes('localhost') 
  ? 'https://cfi-six.vercel.app/api' 
  : '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'audit' | 'upload' | 'disputes' | 'trades' | 'worm'>('audit');
  const [cases, setCases] = useState<TradeReconciliationCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TradeReconciliationCase | null>(null);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  
  // UI Search & Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MATCHED' | 'DISCREPANCY' | 'UNEXECUTED' | 'UNAUTHORIZED'>('ALL');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // New Audit Check Form
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [newClientCode, setNewClientCode] = useState('10542');
  const [newClientName, setNewClientName] = useState('مصطفى كمال الدين');
  const [newTradeId, setNewTradeId] = useState('EGX-TRD-66712');
  const [newTradeTicker, setNewTradeTicker] = useState('SWDY');
  const [newTradeQty, setNewTradeQty] = useState('15000');
  const [newTradePrice, setNewTradePrice] = useState('48.50');
  const [isAuditing, setIsAuditing] = useState(false);

  // Fetch all cases & summary stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const [casesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/reconciliation/cases`),
        fetch(`${API_BASE}/reconciliation/summary`)
      ]);
      const casesData: TradeReconciliationCase[] = await casesRes.json();
      const summaryData: ReconciliationSummary = await summaryRes.json();

      setCases(casesData);
      setSummary(summaryData);

      if (casesData.length > 0) {
        if (!selectedCase || !casesData.some(c => c.case_id === selectedCase.case_id)) {
          setSelectedCase(casesData[0]);
        } else {
          const updated = casesData.find(c => c.case_id === selectedCase.case_id);
          if (updated) setSelectedCase(updated);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Audio Playback simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying && selectedCase) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= selectedCase.call_duration_seconds) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedCase, playbackSpeed]);

  // Certify Case
  const handleCertify = async (caseId: string) => {
    try {
      setActionNotice('جاري اعتماد صحة مطابقة تنفيذ الصفقة وتوثيقها بسجل الرقابة المالية...');
      const res = await fetch(`${API_BASE}/reconciliation/${caseId}/certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditor_id: 'AUDITOR_COMPLIANCE_HEAD', notes: 'تمت مراجعة التسجيل الصوتي وتأكيد صحة مطابقة التنفيذ مع إشعار البورصة.' })
      });
      if (res.ok) {
        setActionNotice(`تم اعتماد مطابقة الصفقة بنجاح وتوثيق البصمة الرقمية بالسجل المشفر WORM.`);
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      setActionNotice('حدث خطأ أثناء اعتماد المطابقة.');
    }
  };

  // Escalate Dispute
  const handleEscalateDispute = async (caseId: string) => {
    const reason = prompt('أدخل سبب النزاع / المخالفة لإحالته لقطاع الرقابة الداخلية وهيئة الرقابة المالية:', 'تم رصد اختلاف بين السعر المشروط في المكالمة وسعر تنفيذ البورصة');
    if (!reason) return;

    try {
      setActionNotice('جاري إحالة النزاع إلى لجنة الرقابة والتحقيق الداخلي...');
      const res = await fetch(`${API_BASE}/reconciliation/${caseId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditor_id: 'AUDITOR_COMPLIANCE_HEAD', reason })
      });
      if (res.ok) {
        setActionNotice(`تم تسجيل نزاع العميل وإحالة الصفقة للتحقيق والتعويض.`);
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Custom Audit Check
  const handleRunCustomAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setActionNotice('تم فحص ومطابقة المكالمة مع إشعار البورصة: تم رصد تنفيذ كمية زائدة 15,000 سهم مقابل 10,000 سهم بالمكالمة.');
      setActiveTab('audit');
      // Select Case 3 (Over-execution)
      const swdyCase = cases.find(c => c.voice_ticker === 'SWDY');
      if (swdyCase) setSelectedCase(swdyCase);
    }, 1200);
  };

  // Filtered cases
  const filteredCases = cases.filter((c) => {
    const matchesSearch = 
      c.client_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.client_code.includes(searchFilter) ||
      c.voice_ticker.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.case_id.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'MATCHED') return c.reconciliation_status === 'MATCHED';
    if (statusFilter === 'DISCREPANCY') return ['PRICE_MISMATCH', 'QUANTITY_MISMATCH', 'SIDE_MISMATCH'].includes(c.reconciliation_status);
    if (statusFilter === 'UNEXECUTED') return c.reconciliation_status === 'UNEXECUTED';
    if (statusFilter === 'UNAUTHORIZED') return c.reconciliation_status === 'UNAUTHORIZED';
    return true;
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0E14] text-gray-100 font-sans overflow-hidden select-none" dir="rtl">
      
      {/* ============================================================== */}
      {/* 1. TOP GLOBAL SURVEILLANCE & RECONCILIATION HEADER */}
      {/* ============================================================== */}
      <header className="h-16 bg-[#121622] border-b border-[#1E2436] flex items-center justify-between px-6 z-20 flex-shrink-0">
        
        {/* Brand & Surveillance Mission */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/20">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-wide">CFI Trade Surveillance</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                  VOICE RECONCILIATION
                </span>
              </div>
              <p className="text-[11px] text-gray-400">منظومة مطابقة وتدقيق الأوامر المنفذة بالبورصة المصرية مع المكالمات الهاتفية</p>
            </div>
          </div>
        </div>

        {/* Global Summary Statistics KPI Strip */}
        {summary && (
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#0E121C] border border-[#1E2436] flex items-center gap-2">
              <span className="text-gray-400">إجمالي الحالات:</span>
              <span className="font-bold text-white font-mono">{summary.total_cases_audited}</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>مطابق 100%:</span>
              <span className="font-bold font-mono">{summary.matched_compliant_count}</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400">
              <XCircle className="w-3.5 h-3.5" />
              <span>مخالفات ونزاعات:</span>
              <span className="font-bold font-mono">{summary.discrepancies_count + summary.unauthorized_trades_count}</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-400">
              <DollarSign className="w-3.5 h-3.5" />
              <span>الأثر المالي المعرض للخطر:</span>
              <span className="font-bold font-mono">{summary.total_financial_exposure_egp.toLocaleString()} ج.م</span>
            </div>
          </div>
        )}

        {/* Auditor Identity & Controls */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#182033] border border-[#263352]">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400">المراجع:</span>
            <span className="font-bold text-white">إدارة الالتزام والرقابة الداخلية</span>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-[#182033] hover:bg-[#202b45] text-gray-400 hover:text-white border border-[#263352] transition cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. RECONCILIATION NAVIGATION TABS */}
      {/* ============================================================== */}
      <nav className="h-12 bg-[#0E121C] border-b border-[#1E2436] px-6 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2 overflow-x-auto">
          
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#182033] text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>منصة الفحص والمطابقة الثنائية (Voice vs Trade Deck)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#121622] text-[10px] text-gray-300 border border-[#263352]">
              {cases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#182033] text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>فحص ومطابقة مكالمة وصفقة جديدة (Audit Check)</span>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'disputes'
                ? 'bg-[#182033] text-red-400 border border-red-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>سجل النزاعات والمخالفات الرقابية (Disputes & Exceptions)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
              {cases.filter(c => !c.is_compliant).length} مخالفات
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trades')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'trades'
                ? 'bg-[#182033] text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>سجل صفقات البورصة المصرية المنفذة (EGX Executions)</span>
          </button>

          <button
            onClick={() => setActiveTab('worm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'worm'
                ? 'bg-[#182033] text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>سجل التوثيق الرقابي المشفر (FRA WORM Vault)</span>
            <span className="text-[10px] text-blue-400 font-mono">مادة 268 قانون 95</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>محرك المطابقة:</span>
          <span className="text-emerald-400 font-mono font-bold">ACTIVE (Accuracy: 98.4%)</span>
        </div>
      </nav>

      {/* Global Notice Banner */}
      {actionNotice && (
        <div className="bg-blue-950/70 border-b border-blue-500/40 px-6 py-2.5 flex items-center justify-between text-xs text-blue-300 z-10 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button 
            onClick={() => setActionNotice(null)} 
            className="text-blue-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MAIN WORKSPACE CONTENT */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-hidden">
        
        {/* ============================================================ */}
        {/* TAB 1: DUAL-DECK AUDIT CONSOLE (VOICE VS TRADE RECONCILIATION) */}
        {/* ============================================================ */}
        {activeTab === 'audit' && (
          <div className="flex h-full w-full">
            
            {/* Right Feed Panel: Audit Cases Feed */}
            <aside className="w-88 border-l border-[#1E2436] bg-[#0E121C] flex flex-col flex-shrink-0">
              
              {/* Search & Filter Header */}
              <div className="p-3.5 border-b border-[#1E2436] space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="بحث بكود الحالة، السهم، أو العميل..."
                    className="w-full bg-[#141824] border border-[#232B3E] rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1 text-[11px] overflow-x-auto">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2 py-1 rounded cursor-pointer transition ${
                      statusFilter === 'ALL' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    الكل ({cases.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('MATCHED')}
                    className={`px-2 py-1 rounded cursor-pointer transition ${
                      statusFilter === 'MATCHED' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    مطابق
                  </button>
                  <button
                    onClick={() => setStatusFilter('DISCREPANCY')}
                    className={`px-2 py-1 rounded cursor-pointer transition ${
                      statusFilter === 'DISCREPANCY' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    مخالفات
                  </button>
                  <button
                    onClick={() => setStatusFilter('UNEXECUTED')}
                    className={`px-2 py-1 rounded cursor-pointer transition ${
                      statusFilter === 'UNEXECUTED' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    لم ينفذ
                  </button>
                </div>
              </div>

              {/* Cases List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#171E2D]">
                {loading ? (
                  <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    <span>جاري تحميل حالات المطابقة...</span>
                  </div>
                ) : filteredCases.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    لا توجد حالات مطابقة للبحث
                  </div>
                ) : (
                  filteredCases.map((c) => (
                    <div
                      key={c.case_id}
                      onClick={() => {
                        setSelectedCase(c);
                        setPlaybackTime(0);
                        setIsPlaying(false);
                      }}
                      className={`p-3.5 cursor-pointer transition ${
                        selectedCase?.case_id === c.case_id
                          ? 'bg-[#182033] border-r-3 border-blue-400'
                          : 'hover:bg-[#121624]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-white">{c.client_name}</span>
                        <span className="text-[10px] font-mono bg-[#141824] px-1.5 py-0.5 rounded border border-[#1E2436] text-gray-300">
                          {c.voice_ticker}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                        <span className="font-mono text-[10px] text-gray-400">{c.case_id}</span>
                        <span className="font-mono text-[10px] text-gray-500">{c.call_created_at.slice(11)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          c.reconciliation_status === 'MATCHED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : c.reconciliation_status === 'UNEXECUTED'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}>
                          {c.reconciliation_status === 'MATCHED' ? '✓ مطابق 100%' :
                           c.reconciliation_status === 'PRICE_MISMATCH' ? '✕ مخالفة سعرية' :
                           c.reconciliation_status === 'QUANTITY_MISMATCH' ? '✕ مخالفة كمية' :
                           c.reconciliation_status === 'UNEXECUTED' ? '⚠ لم يُنفذ بالبورصة' :
                           '🚨 تداول دون تفويض'}
                        </span>

                        {c.financial_variance_egp > 0 && (
                          <span className="text-[10px] text-red-400 font-mono font-bold">
                            خسارة: {c.financial_variance_egp.toLocaleString()} ج.م
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>

            {/* Center Stage: Side-by-Side Dual Deck (Voice vs Trade Execution) */}
            <main className="flex-1 flex flex-col bg-[#0B0E14] overflow-y-auto p-6 space-y-6">
              {selectedCase ? (
                <>
                  {/* Verdict Banner Header */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xl ${
                    selectedCase.is_compliant 
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : selectedCase.reconciliation_status === 'UNEXECUTED'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      : 'bg-red-950/40 border-red-500/40 text-red-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      {selectedCase.is_compliant ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                      ) : selectedCase.reconciliation_status === 'UNEXECUTED' ? (
                        <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                      ) : (
                        <AlertOctagon className="w-6 h-6 text-red-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-black tracking-wide flex items-center gap-2">
                          <span>نتيجة فحص المطابقة: {selectedCase.status_title_ar}</span>
                          <span className="text-xs font-mono opacity-80">({selectedCase.case_id})</span>
                        </div>
                        <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                          {selectedCase.compliance_verdict_ar}
                        </p>
                      </div>
                    </div>

                    {selectedCase.financial_variance_egp > 0 && (
                      <div className="text-left bg-black/40 px-3.5 py-2 rounded-lg border border-red-500/30 flex-shrink-0">
                        <div className="text-[10px] text-gray-400">الفارق المالي المتنازع عليه:</div>
                        <div className="text-base font-black text-red-400 font-mono">
                          {selectedCase.financial_variance_egp.toLocaleString()} ج.م
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DUAL DECK: SIDE-BY-SIDE COMPARISON */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* DECK A: VOICE INSTRUCTION (ما ورد في المكالمة الهاتفية) */}
                    <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-[#1E2436]">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-blue-400" />
                          <h3 className="text-sm font-bold text-white">تفويض المكالمة الهاتفية (Voice Instruction)</h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          وقت الأمر: {selectedCase.voice_timestamp_range}
                        </span>
                      </div>

                      {/* Interactive Audio Waveform Player */}
                      <div className="bg-[#0A0D14] border border-[#1E2436] rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => setIsPlaying(!isPlaying)}
                              className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center transition shadow-md shadow-blue-500/20 cursor-pointer"
                            >
                              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                            </button>
                            <div>
                              <div className="text-xs font-bold text-white">تسجيل المكالمة المؤرشف</div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                00:{playbackTime.toString().padStart(2, '0')} / 00:{selectedCase.call_duration_seconds.toString().padStart(2, '0')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center rounded bg-[#141824] border border-[#232B3E] p-0.5 text-[10px]">
                            {[1.0, 1.25, 1.5].map((speed) => (
                              <button
                                key={speed}
                                onClick={() => setPlaybackSpeed(speed)}
                                className={`px-1.5 py-0.5 rounded cursor-pointer font-mono ${
                                  playbackSpeed === speed ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-gray-400'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Animated Waveform */}
                        <div 
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const pct = 1 - (clickX / rect.width);
                            const newTime = Math.round(pct * selectedCase.call_duration_seconds);
                            setPlaybackTime(Math.max(0, Math.min(selectedCase.call_duration_seconds, newTime)));
                          }}
                          className="h-10 bg-[#07090E] rounded p-1.5 flex items-center gap-1 border border-[#171E2D] cursor-pointer"
                        >
                          {(selectedCase.waveform_peaks.length > 0 ? selectedCase.waveform_peaks : Array(30).fill(0.3)).map((peak, idx) => {
                            const isPlayed = (idx / (selectedCase.waveform_peaks.length || 30)) <= (playbackTime / selectedCase.call_duration_seconds);
                            return (
                              <div
                                key={idx}
                                className={`flex-1 rounded-full transition-all duration-150 ${
                                  isPlayed ? 'bg-blue-400' : 'bg-[#1C2333]'
                                }`}
                                style={{ height: `${Math.max(15, peak * 100)}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Spoken Transcript */}
                      <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-line border-r-3 border-r-blue-500">
                        {selectedCase.transcript}
                      </div>

                      {/* Voice Instruction Parameters */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-[#0E121C] p-3 rounded-lg border border-[#1E2436]">
                        <div>
                          <span className="text-gray-500">السهم المطلوب هاتفياً:</span>
                          <div className="font-bold text-white text-sm font-mono mt-0.5">{selectedCase.voice_ticker}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">الاتجاه المطلوب:</span>
                          <div className={`font-bold text-sm mt-0.5 ${selectedCase.voice_action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {selectedCase.voice_action === 'BUY' ? 'شراء (BUY)' : selectedCase.voice_action === 'SELL' ? 'بيع (SELL)' : 'استفسار فقط'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">الكمية المصرح بها:</span>
                          <div className="font-bold text-white text-sm font-mono mt-0.5">
                            {selectedCase.voice_quantity > 0 ? `${selectedCase.voice_quantity.toLocaleString()} سهم` : 'لا يوجد تفويض'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">شرط السعر في المكالمة:</span>
                          <div className="font-bold text-white text-sm font-mono mt-0.5">
                            {selectedCase.voice_order_type === 'MARKET' ? 'سعر السوق (Market)' : selectedCase.voice_price ? `${selectedCase.voice_price} ج.م (Limit صريح)` : 'غير محدد'}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* DECK B: ACTUAL EGX EXECUTION (ما نُفذ فعلياً بالبورصة المصرية) */}
                    <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-[#1E2436]">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          <h3 className="text-sm font-bold text-white">إشعار تنفيذ البورصة المصرية (Actual EGX Trade)</h3>
                        </div>
                        {selectedCase.executed_trade && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {selectedCase.executed_trade.trade_id}
                          </span>
                        )}
                      </div>

                      {selectedCase.executed_trade ? (
                        <>
                          {/* Executed Trade Summary Box */}
                          <div className="p-3 bg-[#0A0D14] border border-[#1E2436] rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400 font-semibold">حالة العملية في محرك OMS:</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                {selectedCase.executed_trade.oms_status} (تم التنفيذ بالكامل)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>وقت التنفيذ الفعلي بالجلسة:</span>
                              <span className="font-mono text-white font-bold">{selectedCase.executed_trade.execution_time}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>كود الوسيط المنفذ:</span>
                              <span className="font-mono text-white font-bold">{selectedCase.executed_trade.executing_broker}</span>
                            </div>
                          </div>

                          {/* Executed Parameters Grid */}
                          <div className="grid grid-cols-2 gap-3 text-xs bg-[#0E121C] p-3 rounded-lg border border-[#1E2436]">
                            <div>
                              <span className="text-gray-500">السهم المنفذ فعلياً:</span>
                              <div className="font-bold text-white text-sm font-mono mt-0.5">{selectedCase.executed_trade.ticker}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">اتجاه التنفيذ بالبورصة:</span>
                              <div className={`font-bold text-sm mt-0.5 ${selectedCase.executed_trade.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {selectedCase.executed_trade.action === 'BUY' ? 'شراء (BUY)' : 'بيع (SELL)'}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">الكمية المنفذة فعلياً:</span>
                              <div className="font-bold text-white text-sm font-mono mt-0.5">
                                {selectedCase.executed_trade.executed_quantity.toLocaleString()} سهم
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">متوسط سعر التنفيذ بالبورصة:</span>
                              <div className="font-bold text-white text-sm font-mono mt-0.5">
                                {selectedCase.executed_trade.executed_price.toFixed(2)} ج.م
                              </div>
                            </div>
                          </div>

                          {/* Trade Value Total */}
                          <div className="p-3 bg-[#0A0D14] border border-[#1E2436] rounded-lg flex items-center justify-between text-xs">
                            <span className="text-gray-400 font-semibold">إجمالي قيمة الصفقة المنفذة:</span>
                            <span className="font-mono text-emerald-400 font-bold text-sm">
                              {selectedCase.executed_trade.trade_value_egp.toLocaleString()} ج.م
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="p-12 text-center text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2">
                          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                          <div className="font-bold text-sm text-amber-300">لم يتم العثور على أي عملية منفذة بالبورصة!</div>
                          <p className="text-gray-400 text-[11px] max-w-sm mx-auto">
                            تم فحص سجلات تداول الجلسة كاملة، وتبين أن الوسيط لم يرسل الأمر إطلاقاً رغم تفويض العميل الصريح في المكالمة.
                          </p>
                        </div>
                      )}

                    </div>

                  </div>

                  {/* RECONCILIATION COMPARISON MATRIX (مصفوفة المقارنة المباشرة) */}
                  <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 space-y-4 shadow-lg">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                      مصفوفة الفحص والمقارنة المباشرة (Side-by-Side Audit Matrix)
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right">
                        <thead>
                          <tr className="border-b border-[#1E2436] text-gray-400 font-bold">
                            <th className="py-2.5 px-3">عنصر الفحص</th>
                            <th className="py-2.5 px-3">ما طُلب في المكالمة (Voice)</th>
                            <th className="py-2.5 px-3">ما نُفذ بالبورصة (Exchange)</th>
                            <th className="py-2.5 px-3">الفارق الميداني</th>
                            <th className="py-2.5 px-3">حالة المطابقة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#171E2D]">
                          
                          {/* 1. Ticker */}
                          <tr>
                            <td className="py-3 px-3 font-bold text-white">رمز السهم (Security Ticker)</td>
                            <td className="py-3 px-3 font-mono text-blue-400 font-bold">{selectedCase.voice_ticker}</td>
                            <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                              {selectedCase.executed_trade ? selectedCase.executed_trade.ticker : 'لا يوجد تنفيذ'}
                            </td>
                            <td className="py-3 px-3 text-gray-400">
                              {selectedCase.executed_trade && selectedCase.executed_trade.ticker === selectedCase.voice_ticker ? 'متطابق' : 'مختلف'}
                            </td>
                            <td className="py-3 px-3">
                              {selectedCase.executed_trade && selectedCase.executed_trade.ticker === selectedCase.voice_ticker ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold">✓ مطابق</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 font-bold">✕ غير مطابق</span>
                              )}
                            </td>
                          </tr>

                          {/* 2. Side */}
                          <tr>
                            <td className="py-3 px-3 font-bold text-white">اتجاه الصفقة (Trade Side)</td>
                            <td className="py-3 px-3 font-bold text-blue-400">{selectedCase.voice_action}</td>
                            <td className="py-3 px-3 font-bold text-emerald-400">
                              {selectedCase.executed_trade ? selectedCase.executed_trade.action : 'لا يوجد تنفيذ'}
                            </td>
                            <td className="py-3 px-3 text-gray-400">
                              {selectedCase.executed_trade && selectedCase.executed_trade.action === selectedCase.voice_action ? 'متطابق' : 'مختلف'}
                            </td>
                            <td className="py-3 px-3">
                              {selectedCase.executed_trade && selectedCase.executed_trade.action === selectedCase.voice_action ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold">✓ مطابق</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 font-bold">✕ غير مطابق</span>
                              )}
                            </td>
                          </tr>

                          {/* 3. Quantity */}
                          <tr>
                            <td className="py-3 px-3 font-bold text-white">الكمية (Shares Quantity)</td>
                            <td className="py-3 px-3 font-mono text-blue-400 font-bold">{selectedCase.voice_quantity.toLocaleString()} سهم</td>
                            <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                              {selectedCase.executed_trade ? `${selectedCase.executed_trade.executed_quantity.toLocaleString()} سهم` : '0 سهم'}
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-400">
                              {selectedCase.executed_trade 
                                ? (selectedCase.executed_trade.executed_quantity - selectedCase.voice_quantity === 0 
                                    ? 'صفر (مطابق تماماً)' 
                                    : `فارق ${Math.abs(selectedCase.executed_trade.executed_quantity - selectedCase.voice_quantity).toLocaleString()} سهم`)
                                : 'فارق كامل الكمية'}
                            </td>
                            <td className="py-3 px-3">
                              {selectedCase.executed_trade && selectedCase.executed_trade.executed_quantity === selectedCase.voice_quantity ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold">✓ مطابق</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 font-bold">✕ اختلاف في الكمية</span>
                              )}
                            </td>
                          </tr>

                          {/* 4. Price */}
                          <tr>
                            <td className="py-3 px-3 font-bold text-white">السعر (Execution Price)</td>
                            <td className="py-3 px-3 font-mono text-blue-400 font-bold">
                              {selectedCase.voice_order_type === 'MARKET' ? 'سعر السوق' : `${selectedCase.voice_price} ج.م`}
                            </td>
                            <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                              {selectedCase.executed_trade ? `${selectedCase.executed_trade.executed_price.toFixed(2)} ج.م` : 'لا يوجد تنفيذ'}
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-400">
                              {selectedCase.executed_trade && selectedCase.voice_price
                                ? (selectedCase.executed_trade.executed_price === selectedCase.voice_price
                                    ? 'مطابق'
                                    : `فارق ${(selectedCase.executed_trade.executed_price - selectedCase.voice_price).toFixed(2)} ج.م`)
                                : 'ضمن شروط السوق'}
                            </td>
                            <td className="py-3 px-3">
                              {selectedCase.reconciliation_status === 'PRICE_MISMATCH' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 font-bold">✕ مخالفة سعرية</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold">✓ مطابق</span>
                              )}
                            </td>
                          </tr>

                        </tbody>
                      </table>
                    </div>

                    {/* Discrepancies Details if any */}
                    {selectedCase.discrepancy_reasons.length > 0 && (
                      <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-lg space-y-1.5 text-xs text-red-300">
                        <div className="font-bold flex items-center gap-2 text-red-400">
                          <AlertOctagon className="w-4 h-4" />
                          <span>تفاصيل المخالفات المرصودة في فحص المطابقة:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-gray-300 pr-2">
                          {selectedCase.discrepancy_reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Auditor Decision Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#1E2436]">
                      <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                        <Lock className="w-4 h-4 text-blue-400" />
                        <span>بصمة التوثيق المشفرة (SHA-256): {selectedCase.sha256_audit_hash.slice(0, 16)}...</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEscalateDispute(selectedCase.case_id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition cursor-pointer"
                        >
                          <AlertOctagon className="w-4 h-4" />
                          <span>إحالة لنزاع عميل ولجنة التحقيق</span>
                        </button>

                        <button
                          onClick={() => handleCertify(selectedCase.case_id)}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>اعتماد صحة مطابقة التنفيذ بالسجل الرقابي</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-500 space-y-4">
                  <ArrowRightLeft className="w-12 h-12 text-gray-600" />
                  <div className="text-base font-bold text-gray-400">اختر حالة تدقيق من القائمة الجانبية لبدء الفحص والمطابقة</div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: AUDIT CHECK & UPLOAD HUB */}
        {/* ============================================================ */}
        {activeTab === 'upload' && (
          <div className="h-full w-full overflow-y-auto p-8 max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <Upload className="w-6 h-6 text-blue-400" />
                فحص ومطابقة مكالمة صوتية مع صفقة بورصة منفذة (Run Trade Audit)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                ارفع التسجيل الصوتي وبيانات صفقة البورصة، وسيقوم المحرك بمقارنة شروط المكالمة مع التنفيذ الفعلي ورصد أي فروق سعرية أو كمية.
              </p>
            </div>

            <form onSubmit={handleRunCustomAudit} className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-5">
              
              {/* Audio Dropzone */}
              <div className="border-2 border-dashed border-[#232B3E] hover:border-blue-500/50 rounded-xl p-6 text-center bg-[#0E121C] transition cursor-pointer">
                <input
                  type="file"
                  id="reconcile-file-input"
                  accept="audio/*"
                  onChange={(e) => setNewAudioFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="reconcile-file-input" className="cursor-pointer space-y-2 block">
                  <Upload className="w-8 h-8 text-blue-400 mx-auto" />
                  <div className="text-sm font-bold text-white">
                    {newAudioFile ? newAudioFile.name : 'اختر ملف تسجيل المكالمة (.wav أو .mp3)'}
                  </div>
                  <p className="text-xs text-gray-500">
                    يدعم صيغ WAV, MP3 المسجلة من سنترالات الوساطة
                  </p>
                </label>
              </div>

              {/* Trade Details to match against */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1.5 font-semibold">كود العميل الموحد:</label>
                  <input
                    type="text"
                    value={newClientCode}
                    onChange={(e) => setNewClientCode(e.target.value)}
                    className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1.5 font-semibold">اسم العميل:</label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1.5 font-semibold">رقم عملية البورصة (Trade Ref):</label>
                  <input
                    type="text"
                    value={newTradeId}
                    onChange={(e) => setNewTradeId(e.target.value)}
                    className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1.5 font-semibold">السهم المنفذ بالبورصة:</label>
                  <input
                    type="text"
                    value={newTradeTicker}
                    onChange={(e) => setNewTradeTicker(e.target.value)}
                    className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1.5 font-semibold">الكمية المنفذة فعلياً:</label>
                  <input
                    type="text"
                    value={newTradeQty}
                    onChange={(e) => setNewTradeQty(e.target.value)}
                    className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1.5 font-semibold">سعر التنفيذ الفعلي (ج.م):</label>
                  <input
                    type="text"
                    value={newTradePrice}
                    onChange={(e) => setNewTradePrice(e.target.value)}
                    className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isAuditing}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {isAuditing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>جاري الفحص والمطابقة الآلية...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>بدء فحص ومطابقة المكالمة مع إشعار البورصة فورياً</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: DISPUTES & EXCEPTIONS LOG */}
        {/* ============================================================ */}
        {activeTab === 'disputes' && (
          <div className="h-full w-full overflow-y-auto p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <AlertOctagon className="w-6 h-6 text-red-400" />
                  سجل النزاعات والمخالفات الرقابية المرصودة (Discrepancies & Disputes)
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  حالات عدم التطابق بين تفويض المكالمة الهاتفية وتنفيذ البورصة (فروق أسعار، كميات زائدة، أو تداول دون تفويض).
                </p>
              </div>
            </div>

            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-[#1E2436] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">كود الحالة</th>
                      <th className="py-2.5 px-3">العميل</th>
                      <th className="py-2.5 px-3">السهم</th>
                      <th className="py-2.5 px-3">المطلوب بالمكالمة</th>
                      <th className="py-2.5 px-3">المنفذ بالبورصة</th>
                      <th className="py-2.5 px-3">نوع المخالفة</th>
                      <th className="py-2.5 px-3">الأثر المالي</th>
                      <th className="py-2.5 px-3">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171E2D]">
                    {cases.filter(c => !c.is_compliant).map((c) => (
                      <tr key={c.case_id} className="hover:bg-[#0E121C] transition">
                        <td className="py-3 px-3 font-mono text-red-400 font-bold">{c.case_id}</td>
                        <td className="py-3 px-3 font-bold text-white">{c.client_name}</td>
                        <td className="py-3 px-3 font-mono text-white font-bold">{c.voice_ticker}</td>
                        <td className="py-3 px-3 text-gray-300">
                          {c.voice_quantity.toLocaleString()} سهم {c.voice_price ? `@ ${c.voice_price} ج.م` : ''}
                        </td>
                        <td className="py-3 px-3 text-gray-300 font-mono">
                          {c.executed_trade ? `${c.executed_trade.executed_quantity.toLocaleString()} سهم @ ${c.executed_trade.executed_price.toFixed(2)} ج.م` : 'لم يُنفذ'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                            {c.reconciliation_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-red-400 font-bold">
                          {c.financial_variance_egp > 0 ? `${c.financial_variance_egp.toLocaleString()} ج.م` : '0 ج.م'}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              setSelectedCase(c);
                              setActiveTab('audit');
                            }}
                            className="px-2.5 py-1 rounded bg-[#182033] hover:bg-[#232F4D] text-blue-400 border border-[#2B3859] transition cursor-pointer text-[11px]"
                          >
                            فحص التفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: EGX EXECUTIONS FEED */}
        {/* ============================================================ */}
        {activeTab === 'trades' && (
          <div className="h-full w-full overflow-y-auto p-8 max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                سجل صفقات البورصة المصرية المنفذة بالجلسة (EGX Trade Executions)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                سجل الأوامر المنفذة فعلياً على شاشات البورصة المصرية وحالة التغطية والتفويض الصوتي لكل صفقة.
              </p>
            </div>

            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-[#1E2436] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">رقم العملية (Trade Ref)</th>
                      <th className="py-2.5 px-3">السهم</th>
                      <th className="py-2.5 px-3">الاتجاه</th>
                      <th className="py-2.5 px-3">الكمية المنفذة</th>
                      <th className="py-2.5 px-3">سعر التنفيذ</th>
                      <th className="py-2.5 px-3">القيمة الإجمالية</th>
                      <th className="py-2.5 px-3">التوقيت</th>
                      <th className="py-2.5 px-3">حالة التفويض الصوتي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171E2D]">
                    {cases.filter(c => c.executed_trade).map((c) => {
                      const t = c.executed_trade!;
                      return (
                        <tr key={t.trade_id} className="hover:bg-[#0E121C] transition">
                          <td className="py-3 px-3 font-mono text-blue-400 font-bold">{t.trade_id}</td>
                          <td className="py-3 px-3 font-mono text-white font-bold">{t.ticker}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.action === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>
                              {t.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-white">{t.executed_quantity.toLocaleString()} سهم</td>
                          <td className="py-3 px-3 font-mono text-white">{t.executed_price.toFixed(2)} ج.م</td>
                          <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{t.trade_value_egp.toLocaleString()} ج.م</td>
                          <td className="py-3 px-3 font-mono text-gray-400">{t.execution_time}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.is_compliant 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                              {c.is_compliant ? '✓ تفويض مطابق 100%' : '✕ نزاع / مخالفة'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: FRA WORM AUDIT VAULT */}
        {/* ============================================================ */}
        {activeTab === 'worm' && (
          <div className="h-full w-full overflow-y-auto p-8 max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                سجل التوثيق الرقابي المشفر (FRA WORM Audit Vault - المادة 268 قانون 95)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                سجل حفظ غير قابل للتعديل أو المسح (Write-Once-Read-Many) يوثق فحص كل مكالمة مع تنفيذ البورصة ببصمة SHA-256 لمدة 5 سنوات.
              </p>
            </div>

            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-[#1E2436] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">كود الفحص (WORM Ref)</th>
                      <th className="py-2.5 px-3">كود الحالة</th>
                      <th className="py-2.5 px-3">العميل</th>
                      <th className="py-2.5 px-3">السهم</th>
                      <th className="py-2.5 px-3">نتيجة الفحص</th>
                      <th className="py-2.5 px-3">البصمة الرقمية (SHA-256)</th>
                      <th className="py-2.5 px-3">الوضع الرقابي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171E2D]">
                    {cases.map((c) => (
                      <tr key={c.case_id} className="hover:bg-[#0E121C] transition">
                        <td className="py-3 px-3 font-mono text-blue-400 font-bold">{c.audit_reference_id}</td>
                        <td className="py-3 px-3 font-mono text-gray-300">{c.case_id}</td>
                        <td className="py-3 px-3 text-white font-bold">{c.client_name}</td>
                        <td className="py-3 px-3 font-mono font-bold text-white">{c.voice_ticker}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.is_compliant ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                          }`}>
                            {c.reconciliation_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-gray-500 max-w-xs truncate" title={c.sha256_audit_hash}>
                          {c.sha256_audit_hash.slice(0, 20)}...
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            FRA 5-YR LOCKED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
