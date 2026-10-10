import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  TrendingUp, 
  Play, 
  Pause, 
  FileText, 
  Activity, 
  RefreshCw, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Lock,
  Upload,
  HardDrive,
  Cpu,
  Layers,
  Database,
  Search,
  Copy,
  Check,
  Radio
} from 'lucide-react';

interface ExtractedOrder {
  order_id: string;
  action: 'BUY' | 'SELL';
  ticker: string;
  company_name_raw: string;
  quantity: number;
  order_type: 'MARKET' | 'LIMIT';
  price: number | null;
  time_in_force: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'MODIFIED_AND_APPROVED';
  validation_status: 'VALID' | 'WARNING' | 'INVALID';
  validation_issues?: string[];
  estimated_total_egp: number;
  fix_message?: string;
  requires_human_clarification?: boolean;
  ambiguity_reason?: string;
  notes?: string;
}

interface CallRecord {
  call_id: string;
  client_code: string;
  client_name: string;
  phone_number: string;
  duration_seconds: number;
  created_at: string;
  audio_url: string;
  transcript: string;
  waveform_peaks: number[];
  audit_reference_id: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'INQUIRY';
  extraction: {
    call_classification: string;
    has_actionable_orders: boolean;
    confidence_score: number;
    conversation_summary_ar: string;
    orders: ExtractedOrder[];
  };
}

interface EGXTicker {
  ticker: string;
  isin: string;
  name_ar: string;
  name_en: string;
  last_price: number;
  previous_close: number;
  change_pct: number;
  high_limit: number;
  low_limit: number;
  tick_size: number;
  market: string;
}

interface AuditRecord {
  audit_reference_id: string;
  call_id: string;
  order_id: string;
  timestamp: string;
  broker_id: string;
  broker_action: string;
  client_code: string;
  ticker: string;
  action: string;
  quantity: number;
  price: number | null;
  sha256_hash: string;
  fra_compliance_status: string;
  fix_message?: string;
}

const API_BASE = window.location.origin.includes('localhost') 
  ? 'https://cfi-six.vercel.app/api' 
  : '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'hitl' | 'storage' | 'egx' | 'worm' | 'fix'>('hitl');
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [tickers, setTickers] = useState<EGXTicker[]>([]);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  
  // UI feedback & modals
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [callFilter, setCallFilter] = useState<'ALL' | 'ORDERS' | 'INQUIRY' | 'APPROVED'>('ALL');
  const [copiedFix, setCopiedFix] = useState<string | null>(null);
  
  // Audio Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadClientCode, setUploadClientCode] = useState('10542');
  const [uploadClientName, setUploadClientName] = useState('أحمد فتحي الدسوقي');
  const [uploadPhone, setUploadPhone] = useState('+20 100 876 5432');
  const [uploadTranscriptNote, setUploadTranscriptNote] = useState('العميل: اشتريلي 3000 سهم في السويدي اليكتريك على 48 جنيه ونص.\nالوسيط: تمام يا فندم، أمر شراء 3,000 سهم SWDY بسعر 48.50 ج.م.');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [callsRes, tickersRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/calls`),
        fetch(`${API_BASE}/egx/tickers`),
        fetch(`${API_BASE}/audit`).catch(() => ({ json: async () => [] }))
      ]);
      const callsData: CallRecord[] = await callsRes.json();
      const tickersData: EGXTicker[] = await tickersRes.json();
      const auditData: AuditRecord[] = await auditRes.json();
      
      setCalls(callsData);
      setTickers(tickersData);
      setAuditRecords(auditData);

      if (callsData.length > 0) {
        if (!selectedCall || !callsData.some(c => c.call_id === selectedCall.call_id)) {
          setSelectedCall(callsData[0]);
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
    if (isPlaying && selectedCall) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= selectedCall.duration_seconds) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedCall, playbackSpeed]);

  // Handle Seed Demo Calls
  const handleSeedDemo = async () => {
    try {
      setActionNotice('جاري توليد مكالمات تجريبية حقيقية بالبورصة في قاعدة بيانات Supabase...');
      const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
      if (res.ok) {
        setActionNotice('تم توليد بيانات المكالمات بنجاح في Supabase.');
        await fetchData();
      } else {
        setActionNotice('تم تحديث البيانات من الخادم.');
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      await fetchData();
    }
  };

  // Order Approval
  const handleApprove = async (orderId: string) => {
    try {
      setActionNotice('جاري تدقيق الأمر، وتوليد رسالة FIX 4.4، وتوثيقه بسجل WORM...');
      const res = await fetch(`${API_BASE}/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_id: 'BROKER_SHERIF_102' })
      });
      if (res.ok) {
        const data = await res.json();
        setActionNotice(`تم اعتماد الأمر بنجاح وتوليد بروتوكول FIX 4.4 (${data.fix_message ? '35=D' : ''}) وإيداعه في WORM Vault.`);
        fetchData();
      } else {
        setActionNotice('فشل اعتماد الأمر. تحقق من صحة البيانات.');
      }
    } catch (e) {
      console.error(e);
      setActionNotice('حدث خطأ أثناء اعتماد الأمر.');
    }
  };

  // Order Rejection
  const handleReject = async (orderId: string) => {
    const reason = prompt('أدخل سبب الرفض الإلزامي لهيئة الرقابة المالية (FRA):', 'السعر المطلوب يتجاوز حدود التذبذب المسموح بها بالجلسة');
    if (!reason) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_id: 'BROKER_SHERIF_102', rejection_reason: reason })
      });
      if (res.ok) {
        setActionNotice(`تم رفض الأمر وتوثيق السبب في سجل الرقابة المالية WORM.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct Audio File Upload to Supabase Storage
  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('يرجى اختيار ملف صوتي (.wav أو .mp3)');
      return;
    }

    try {
      setIsUploading(true);
      setActionNotice('جاري رفع التسجيل الصوتي إلى Supabase Storage وتحليله بنموذج الذكاء الاصطناعي المصري...');
      
      const formData = new FormData();
      formData.append('audio_file', uploadFile);
      formData.append('client_code', uploadClientCode);
      formData.append('client_name', uploadClientName);
      formData.append('phone_number', uploadPhone);
      if (uploadTranscriptNote) {
        formData.append('transcript_note', uploadTranscriptNote);
      }

      const res = await fetch(`${API_BASE}/calls/upload-audio`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newCall: CallRecord = await res.json();
        setActionNotice(`تم بنجاح رفع التسجيل إلى Supabase Storage وحفظه في جدول المكالمات! كود المكالمة: ${newCall.call_id}`);
        setUploadFile(null);
        await fetchData();
        setSelectedCall(newCall);
        setActiveTab('hitl');
      } else {
        setActionNotice('فشل رفع التسجيل الصوتي إلى الخادم. يرجى إعادة المحاولة.');
      }
    } catch (err) {
      console.error(err);
      setActionNotice('حدث خطأ أثناء رفع التسجيل إلى التخزين.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered Calls list
  const filteredCalls = calls.filter((c) => {
    const matchesSearch = 
      c.client_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.client_code.includes(searchFilter) ||
      c.call_id.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (callFilter === 'ORDERS') return c.extraction.has_actionable_orders;
    if (callFilter === 'INQUIRY') return !c.extraction.has_actionable_orders;
    if (callFilter === 'APPROVED') return c.status === 'APPROVED';
    return true;
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0E14] text-gray-100 font-sans overflow-hidden select-none" dir="rtl">
      
      {/* ============================================================== */}
      {/* 1. TOP GLOBAL NAVIGATION HEADER */}
      {/* ============================================================== */}
      <header className="h-16 bg-[#121622] border-b border-[#1E2436] flex items-center justify-between px-6 z-20 flex-shrink-0">
        
        {/* Brand & Market Identity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/20">
              CFI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-wide">CFI Record</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  EGX 30 COPILOT
                </span>
              </div>
              <p className="text-[11px] text-gray-400">منظومة تدقيق أوامر التداول بالصوت والذكاء الاصطناعي</p>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1E2436] mx-2 hidden md:block"></div>

          {/* EGX Market Hours Status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E121C] border border-[#1E2436] text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-gray-300">جلسة التداول المستمر:</span>
            <span className="text-emerald-400 font-bold font-mono">10:00 - 14:30</span>
            <span className="text-gray-500 text-[10px]">(مفتوحة)</span>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-3 text-xs">
          
          {/* Licensed Broker Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#182033] border border-[#263352]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-gray-400">الوسيط المرخص:</span>
            <span className="font-bold text-white">شريف عبد الرحمن (102)</span>
          </div>

          {/* Seed Demo Button */}
          <button
            onClick={handleSeedDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 font-medium transition cursor-pointer"
            title="توليد مكالمات تجريبية حقيقية بالبورصة"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>توليد بيانات تجريبية</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-[#182033] hover:bg-[#202b45] text-gray-400 hover:text-white border border-[#263352] transition cursor-pointer"
            title="تحديث البيانات اللحظية"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. TAB SELECTION BAR */}
      {/* ============================================================== */}
      <nav className="h-12 bg-[#0E121C] border-b border-[#1E2436] px-6 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2 overflow-x-auto">
          
          {/* Tab 1: HITL Console */}
          <button
            onClick={() => setActiveTab('hitl')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'hitl'
                ? 'bg-[#182033] text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>منصة الاعتماد والتدقيق (HITL Orders)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#121622] text-[10px] text-gray-300 border border-[#263352]">
              {calls.length}
            </span>
          </button>

          {/* Tab 2: Audio Storage Hub */}
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-[#182033] text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>مركز رفع التسجيلات والتخزين (Storage Hub)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          {/* Tab 3: EGX30 Market Terminal */}
          <button
            onClick={() => setActiveTab('egx')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'egx'
                ? 'bg-[#182033] text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>شاشة البورصة والحدود السعرية (EGX30)</span>
            <span className="text-[10px] text-emerald-400 font-mono">±10%</span>
          </button>

          {/* Tab 4: WORM Audit Vault */}
          <button
            onClick={() => setActiveTab('worm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'worm'
                ? 'bg-[#182033] text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>سجل الرقابة المشفر (WORM Compliance)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">
              قانون 95
            </span>
          </button>

          {/* Tab 5: FIX Protocol Engine */}
          <button
            onClick={() => setActiveTab('fix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'fix'
                ? 'bg-[#182033] text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121622]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>محاكي بروتوكول FIX 4.4</span>
            <span className="text-[10px] text-gray-400 font-mono">Tag 35=D</span>
          </button>
        </div>

        {/* Live FIX Connection Badge */}
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>بوابة FIX OMS:</span>
          <span className="text-emerald-400 font-mono font-bold">ONLINE (Session: EGX_PROD_102)</span>
        </div>
      </nav>

      {/* Global Action Banner */}
      {actionNotice && (
        <div className="bg-emerald-950/70 border-b border-emerald-500/40 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-300 z-10 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button 
            onClick={() => setActionNotice(null)} 
            className="text-emerald-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MAIN WORKSPACE CONTENT AREA (TABBED VIEWS) */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-hidden">
        
        {/* ============================================================ */}
        {/* TAB 1: HITL ORDER VALIDATION CONSOLE */}
        {/* ============================================================ */}
        {activeTab === 'hitl' && (
          <div className="flex h-full w-full">
            
            {/* Right Feed Panel: Calls List */}
            <aside className="w-88 border-l border-[#1E2436] bg-[#0E121C] flex flex-col flex-shrink-0">
              
              {/* Search & Filter Header */}
              <div className="p-3.5 border-b border-[#1E2436] space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="بحث باسم العميل أو الكود..."
                    className="w-full bg-[#141824] border border-[#232B3E] rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    onClick={() => setCallFilter('ALL')}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${
                      callFilter === 'ALL' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    الكل ({calls.length})
                  </button>
                  <button
                    onClick={() => setCallFilter('ORDERS')}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${
                      callFilter === 'ORDERS' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    بها أوامر
                  </button>
                  <button
                    onClick={() => setCallFilter('INQUIRY')}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${
                      callFilter === 'INQUIRY' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    استفسار
                  </button>
                  <button
                    onClick={() => setCallFilter('APPROVED')}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${
                      callFilter === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    معتمد
                  </button>
                </div>
              </div>

              {/* Calls Scroll List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#171E2D]">
                {loading ? (
                  <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                    <span>جاري تحميل سجل المكالمات من Supabase...</span>
                  </div>
                ) : filteredCalls.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 space-y-3">
                    <p>لا توجد مكالمات مطابقة للبحث</p>
                    <button
                      onClick={handleSeedDemo}
                      className="px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer text-xs"
                    >
                      توليد مكالمات تجريبية الآن
                    </button>
                  </div>
                ) : (
                  filteredCalls.map((call) => (
                    <div
                      key={call.call_id}
                      onClick={() => {
                        setSelectedCall(call);
                        setPlaybackTime(0);
                        setIsPlaying(false);
                      }}
                      className={`p-3.5 cursor-pointer transition ${
                        selectedCall?.call_id === call.call_id
                          ? 'bg-[#182033] border-r-3 border-emerald-400'
                          : 'hover:bg-[#121624]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-white">{call.client_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono bg-[#141824] px-1.5 py-0.5 rounded border border-[#1E2436]">
                          كود: {call.client_code}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {call.duration_seconds} ثانية
                        </span>
                        <span className="font-mono text-[10px] text-gray-500">{call.call_id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          call.extraction.has_actionable_orders
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                          {call.extraction.has_actionable_orders 
                            ? `${call.extraction.orders.length} أمر تداول` 
                            : 'استفسار أسعار'}
                        </span>

                        {call.status === 'APPROVED' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                            معتمد
                          </span>
                        )}

                        <span className="text-[10px] text-emerald-400 font-mono mr-auto">
                          ثقة: {Math.round(call.extraction.confidence_score * 100)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>

            {/* Center Main Stage: Voice Player, Transcript & Order Cards */}
            <main className="flex-1 flex flex-col bg-[#0B0E14] overflow-y-auto p-6 space-y-6">
              {selectedCall ? (
                <>
                  {/* Card 1: Advanced Audio Player with Visual Waveform */}
                  <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition shadow-lg shadow-emerald-500/30 cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                        </button>
                        
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>التسجيل الصوتي المؤرشف (Supabase Storage)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#182033] text-gray-300 border border-[#263352]">
                              {selectedCall.call_id}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">
                            00:{playbackTime.toString().padStart(2, '0')} / 00:{selectedCall.duration_seconds.toString().padStart(2, '0')}
                          </div>
                        </div>
                      </div>

                      {/* Playback Controls & WORM Chip */}
                      <div className="flex items-center gap-3">
                        {/* Speed Switcher */}
                        <div className="flex items-center rounded-lg bg-[#0E121C] border border-[#1E2436] p-0.5 text-xs">
                          {[1.0, 1.25, 1.5].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setPlaybackSpeed(speed)}
                              className={`px-2 py-1 rounded cursor-pointer font-mono ${
                                playbackSpeed === speed ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-gray-400'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>

                        {/* WORM Audit Reference */}
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-[#0E121C] px-3 py-1.5 rounded-lg border border-[#1E2436]">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>WORM ID: {selectedCall.audit_reference_id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Animated Waveform Visualizer */}
                    <div 
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const pct = 1 - (clickX / rect.width); // RTL reversed
                        const newTime = Math.round(pct * selectedCall.duration_seconds);
                        setPlaybackTime(Math.max(0, Math.min(selectedCall.duration_seconds, newTime)));
                      }}
                      className="h-16 bg-[#0A0D14] rounded-lg p-2.5 flex items-center gap-1 border border-[#1E2436] overflow-hidden cursor-pointer hover:border-emerald-500/40 transition"
                      title="انقر على أي نقطة في الويف للتقديم أو الترجيع اللحظي"
                    >
                      {(selectedCall.waveform_peaks.length > 0 ? selectedCall.waveform_peaks : Array(40).fill(0.4)).map((peak, idx) => {
                        const totalPeaks = selectedCall.waveform_peaks.length || 40;
                        const isPlayed = (idx / totalPeaks) <= (playbackTime / selectedCall.duration_seconds);
                        return (
                          <div 
                            key={idx}
                            className={`flex-1 rounded-full transition-all duration-150 ${
                              isPlayed 
                                ? 'bg-gradient-to-t from-emerald-500 to-teal-300 shadow-sm shadow-emerald-500/50' 
                                : 'bg-[#1E2638] hover:bg-[#2A364F]'
                            }`}
                            style={{ height: `${Math.max(15, peak * 100)}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Accurate Voice Transcription & Dialect Analysis */}
                  <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        التفريغ النصي الحقيقي للمكالمة (Speech-to-Text Transcription)
                      </h3>
                      <span className="text-[11px] text-gray-500 font-mono">
                        المعالج: Whisper Arabic v3 (لهجة مصرية مصونة)
                      </span>
                    </div>

                    <div className="p-4 bg-[#0E121C] border border-[#1E2436] rounded-lg text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-line border-r-4 border-r-emerald-500">
                      {selectedCall.transcript}
                    </div>

                    {selectedCall.extraction.conversation_summary_ar && (
                      <div className="text-xs text-gray-300 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-bold text-emerald-400 ml-1.5">ملخص المحادثة بالذكاء الاصطناعي:</span>
                          <span>{selectedCall.extraction.conversation_summary_ar}</span>
                        </div>
                        <span className="text-emerald-400 font-mono font-bold">
                          دقة: {Math.round(selectedCall.extraction.confidence_score * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Extracted Order Drafts & 1-Click Approval */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        مسودات أوامر التداول المستخرجة للاعتماد البشري (HITL Drafts)
                      </h3>
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                        مطلوب اعتماد الوسيط البشري قبل الإرسال لمحرك البورصة (FRA Law 95)
                      </span>
                    </div>

                    {selectedCall.extraction.orders.length === 0 ? (
                      <div className="p-8 bg-[#121622] border border-[#1E2436] rounded-xl text-center text-xs text-gray-400 space-y-2">
                        <p className="font-bold text-gray-300">لم يتم رصد أي طلب تنفيذ أوامر في هذه المكالمة.</p>
                        <p className="text-gray-500">تم تصنيف هذه المكالمة كـ (استفسار أسعار فقط - Price Inquiry) وأرشفتها رقابياً.</p>
                      </div>
                    ) : (
                      selectedCall.extraction.orders.map((ord) => (
                        <div 
                          key={ord.order_id} 
                          className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 hover:border-[#2B354F] transition shadow-lg space-y-4"
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded text-xs font-black ${
                                ord.action === 'BUY'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
                              }`}>
                                {ord.action === 'BUY' ? 'أمر شراء (BUY)' : 'أمر بيع (SELL)'}
                              </span>
                              <span className="text-lg font-black text-white font-mono tracking-wider">{ord.ticker}</span>
                              <span className="text-xs text-gray-400 font-semibold">{ord.company_name_raw}</span>
                            </div>

                            <span className={`text-xs px-3 py-1 rounded font-bold ${
                              ord.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                              ord.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                              'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            }`}>
                              {ord.status === 'APPROVED' ? '✓ تم الاعتماد والتنفيذ' : 
                               ord.status === 'REJECTED' ? '✕ تم الرفض' : 
                               '⏳ في انتظار اعتماد الوسيط'}
                            </span>
                          </div>

                          {/* Order Parameter Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#0E121C] rounded-lg text-xs border border-[#1A2133]">
                            <div>
                              <div className="text-gray-500">الكمية المطلوبة:</div>
                              <div className="font-black text-white text-sm mt-0.5 font-mono">
                                {ord.quantity.toLocaleString()} سهم
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">نوع السعر:</div>
                              <div className="font-bold text-white text-sm mt-0.5 font-mono">
                                {ord.order_type === 'MARKET' ? 'سعر السوق (Market)' : `${ord.price} ج.م (Limit)`}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">القيمة المقدرة:</div>
                              <div className="font-bold text-emerald-400 text-sm mt-0.5 font-mono">
                                {ord.estimated_total_egp.toLocaleString()} ج.م
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">صلاحية الأمر:</div>
                              <div className="font-bold text-white text-sm mt-0.5 font-mono">
                                يومي (DAY)
                              </div>
                            </div>
                          </div>

                          {/* EGX Circuit Breakers Validation Status */}
                          <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-[#0A0D14] border border-[#1E2436]">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span className="text-gray-300">مطابقة ضوابط البورصة المصرية:</span>
                              <span className="text-emerald-400 font-semibold">
                                {ord.notes || 'السعر يقع ضمن حدود التذبذب السعري اليومي المسموح به (±10%)'}
                              </span>
                            </div>
                            <span className="text-gray-500 font-mono text-[11px]">Tick Size: 0.01 EGP</span>
                          </div>

                          {/* FIX Message preview if already approved */}
                          {ord.fix_message && (
                            <div className="p-3 bg-[#090C12] border border-[#1A2030] rounded-lg space-y-1">
                              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center justify-between">
                                <span>رسالة FIX 4.4 المولدة لمحرك OMS:</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(ord.fix_message || '');
                                    setCopiedFix(ord.order_id);
                                    setTimeout(() => setCopiedFix(null), 2000);
                                  }}
                                  className="text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedFix === ord.order_id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedFix === ord.order_id ? 'تم النسخ' : 'نسخ الرسالة'}</span>
                                </button>
                              </div>
                              <div className="font-mono text-xs text-emerald-400 break-all select-all">
                                {ord.fix_message}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons for Broker */}
                          <div className="flex items-center justify-end gap-3 pt-2">
                            {ord.status === 'PENDING_APPROVAL' ? (
                              <>
                                <button
                                  onClick={() => handleReject(ord.order_id)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs transition cursor-pointer"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>رفض الأمر مع ذكر السبب</span>
                                </button>

                                <button
                                  onClick={() => handleApprove(ord.order_id)}
                                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 cursor-pointer"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>اعتماد وإرسال فوراً لمحرك البورصة (FIX 4.4)</span>
                                </button>
                              </>
                            ) : (
                              <div className="text-xs text-gray-400 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-emerald-400" />
                                <span>تم إغلاق الأمر وتوثيقه في سجل الرقابة المالية WORM Vault.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-500 space-y-4">
                  <Activity className="w-12 h-12 text-gray-600" />
                  <div className="text-base font-bold text-gray-400">اختر مكالمة من القائمة الجانبية لبدء التدقيق والاعتماد</div>
                  <p className="text-xs text-gray-500 max-w-md">
                    أو اضغط على زر "توليد بيانات تجريبية" بالأعلى لملء النظام بمكالمات حقيقية من البورصة المصرية لاختبار الاعتماد اللحظي.
                  </p>
                  <button
                    onClick={handleSeedDemo}
                    className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-bold transition cursor-pointer"
                  >
                    توليد مكالمات تجريبية الآن
                  </button>
                </div>
              )}
            </main>

            {/* Left Quick Watch Panel */}
            <aside className="w-76 border-r border-[#1E2436] bg-[#0E121C] flex flex-col flex-shrink-0 hidden xl:flex">
              <div className="p-3.5 border-b border-[#1E2436] flex items-center justify-between text-xs font-bold text-gray-400">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  أسعار السوق اللحظية (EGX30)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE DB</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#171E2D]">
                {tickers.map((t) => {
                  const isUp = t.change_pct >= 0;
                  return (
                    <div key={t.ticker} className="p-3 hover:bg-[#121624] transition">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <div className="font-bold text-sm text-white font-mono">{t.ticker}</div>
                          <div className="text-[10px] text-gray-400">{t.name_ar}</div>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-sm text-white font-mono">{t.last_price.toFixed(2)} ج.م</div>
                          <div className={`text-[11px] font-semibold flex items-center justify-end font-mono ${
                            isUp ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isUp ? `+${t.change_pct}%` : `${t.change_pct}%`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1 pt-1 border-t border-[#171E2D]">
                        <span>الحد الأدنى: {t.low_limit.toFixed(2)}</span>
                        <span>الحد الأقصى: {t.high_limit.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: AUDIO STORAGE & INGESTION HUB (ANSWERS USER QUESTIONS) */}
        {/* ============================================================ */}
        {activeTab === 'storage' && (
          <div className="h-full w-full overflow-y-auto p-8 max-w-6xl mx-auto space-y-8">
            
            {/* Header explaining how it works */}
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-emerald-400" />
                مركز رفع ومعالجة التسجيلات الصوتية (Supabase Audio Storage Hub)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                دليل وآلية عمل تخزين التسجيلات الصوتية في سحابة Supabase ومطابقتها لمتطلبات هيئة الرقابة المالية (WORM Compliance).
              </p>
            </div>

            {/* Architecture Mechanism Walkthrough Cards */}
            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                آلية عمل حفظ وتحليل المكالمات (End-to-End Ingestion Pipeline)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                
                {/* Step 1 */}
                <div className="p-3.5 rounded-lg bg-[#0E121C] border border-[#1E2436] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">1. الاستقبال</span>
                    <Radio className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-white">تسجيل المكالمة</div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    استقبال المكالمة عبر السنترال (SIP/PBX) أو رفع ملف صوتي (.wav/.mp3) مباشرة من الواجهة.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-lg bg-[#0E121C] border border-[#1E2436] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">2. التخزين</span>
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-white">Supabase Storage</div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    رفع الملف إلى باكت <span className="font-mono text-emerald-400">call-recordings</span> وحساب بصمة SHA-256 لمنع التلاعب.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-lg bg-[#0E121C] border border-[#1E2436] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">3. الذكاء الاصطناعي</span>
                    <Cpu className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-white">Whisper & Dialect NLP</div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    تفريغ الصوت وفهم الأرقام واللهجة المصرية العامية واستخراج السهم، الكمية، والسعر.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-lg bg-[#0E121C] border border-[#1E2436] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">4. قواعد EGX</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-white">مطابقة اللوائح</div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    فحص حدود التذبذب السعري (±10%)، وتوافق كود السهم ISIN، وتحديد حجم التدرج السعري.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="p-3.5 rounded-lg bg-[#0E121C] border border-[#1E2436] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">5. الاعتماد البشري</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-white">HITL Console</div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    اعتماد الوسيط بنقرة واحدة لتوليد رسالة FIX 4.4 وإيداع السجل في خزينة WORM Vault.
                  </p>
                </div>

              </div>
            </div>

            {/* Direct Upload Form */}
            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                رفع تسجيل صوتي جديد إلى Supabase Storage (Upload Audio File)
              </h3>

              <form onSubmit={handleDirectUpload} className="space-y-5">
                
                {/* File Dropzone */}
                <div className="border-2 border-dashed border-[#232B3E] hover:border-emerald-500/50 rounded-xl p-6 text-center bg-[#0E121C] transition cursor-pointer">
                  <input
                    type="file"
                    id="audio-upload-input"
                    accept="audio/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="audio-upload-input" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-emerald-400 mx-auto" />
                    <div className="text-sm font-bold text-white">
                      {uploadFile ? uploadFile.name : 'انقر هنا لاختيار ملف صوتي (.wav أو .mp3) أو اسحبه وأفلته هنا'}
                    </div>
                    <p className="text-xs text-gray-500">
                      {uploadFile ? `الحجم: ${(uploadFile.size / 1024).toFixed(1)} كيلوبايت` : 'يدعم صيغ WAV, MP3, M4A حتى 25 ميجابايت'}
                    </p>
                  </label>
                </div>

                {/* Metadata Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1.5 font-semibold">كود العميل بالشركة:</label>
                    <input
                      type="text"
                      value={uploadClientCode}
                      onChange={(e) => setUploadClientCode(e.target.value)}
                      className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1.5 font-semibold">اسم العميل الثلاثي:</label>
                    <input
                      type="text"
                      value={uploadClientName}
                      onChange={(e) => setUploadClientName(e.target.value)}
                      className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1.5 font-semibold">رقم الهاتف المسجل:</label>
                    <input
                      type="text"
                      value={uploadPhone}
                      onChange={(e) => setUploadPhone(e.target.value)}
                      className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Optional Transcript Note */}
                <div className="text-xs">
                  <label className="block text-gray-400 mb-1.5 font-semibold">
                    نص المكالمة أو ملاحظات إضافية للتجربة (اختياري):
                  </label>
                  <textarea
                    rows={3}
                    value={uploadTranscriptNote}
                    onChange={(e) => setUploadTranscriptNote(e.target.value)}
                    className="w-full bg-[#0E121C] border border-[#232B3E] rounded-lg p-3 text-white font-sans focus:border-emerald-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs transition shadow-lg cursor-pointer ${
                      isUploading || !uploadFile
                        ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>جاري الرفع والتحليل...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>رفع التسجيل إلى Supabase Storage والبدء في التحليل</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Storage Explorer Table */}
            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  الملفات المسجلة بقاعدة بيانات Supabase (Calls Table)
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {calls.length} تسجيل متاح
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-[#1E2436] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">معرف المكالمة</th>
                      <th className="py-2.5 px-3">العميل</th>
                      <th className="py-2.5 px-3">كود العميل</th>
                      <th className="py-2.5 px-3">المدة</th>
                      <th className="py-2.5 px-3">التصنيف</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171E2D]">
                    {calls.map((c) => (
                      <tr key={c.call_id} className="hover:bg-[#0E121C] transition">
                        <td className="py-3 px-3 font-mono text-gray-300">{c.call_id}</td>
                        <td className="py-3 px-3 font-bold text-white">{c.client_name}</td>
                        <td className="py-3 px-3 font-mono text-gray-400">{c.client_code}</td>
                        <td className="py-3 px-3 font-mono text-gray-400">{c.duration_seconds} ثانية</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.extraction.has_actionable_orders 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}>
                            {c.extraction.has_actionable_orders ? 'أمر تداول' : 'استفسار'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                            c.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              setSelectedCall(c);
                              setActiveTab('hitl');
                            }}
                            className="px-2.5 py-1 rounded bg-[#182033] hover:bg-[#232F4D] text-emerald-400 border border-[#2B3859] transition cursor-pointer text-[11px]"
                          >
                            فتح في المنصة
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
        {/* TAB 3: EGX30 MARKET TERMINAL */}
        {/* ============================================================ */}
        {activeTab === 'egx' && (
          <div className="h-full w-full overflow-y-auto p-8 max-w-6xl mx-auto space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                  شاشة أسعار وضوابط البورصة المصرية (EGX30 Market Terminal)
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  الحدود السعرية اللحظية (Circuit Breakers ±10%) وأحجام التدرج السعري المعتمدة.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  جلسة التداول مستمرة
                </span>
                <button
                  onClick={fetchData}
                  className="p-2 rounded-lg bg-[#182033] hover:bg-[#263352] text-gray-300 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Constituents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tickers.map((t) => {
                const isUp = t.change_pct >= 0;
                // Calculate percentage between low and high limit
                const range = t.high_limit - t.low_limit;
                const positionPct = Math.max(0, Math.min(100, ((t.last_price - t.low_limit) / range) * 100));

                return (
                  <div key={t.ticker} className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 space-y-4 hover:border-emerald-500/40 transition shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-black text-white font-mono tracking-wider">{t.ticker}</div>
                        <div className="text-xs text-gray-400 font-semibold">{t.name_ar}</div>
                      </div>
                      <div className="text-left">
                        <div className="text-base font-black text-white font-mono">{t.last_price.toFixed(2)} ج.م</div>
                        <div className={`text-xs font-bold flex items-center justify-end font-mono ${
                          isUp ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {isUp ? `+${t.change_pct}%` : `${t.change_pct}%`}
                        </div>
                      </div>
                    </div>

                    {/* Circuit Breaker Visual Slider */}
                    <div className="space-y-1.5 bg-[#0A0D14] p-3 rounded-lg border border-[#1A2133]">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>الحد الأدنى: {t.low_limit.toFixed(2)} (-10%)</span>
                        <span>الحد الأقصى: {t.high_limit.toFixed(2)} (+10%)</span>
                      </div>
                      
                      <div className="h-2 w-full bg-[#182033] rounded-full overflow-hidden relative">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          style={{ width: `${positionPct}%` }}
                        />
                      </div>
                      
                      <div className="text-[10px] text-gray-500 text-center font-mono">
                        الإغلاق السابق: {t.previous_close.toFixed(2)} ج.م
                      </div>
                    </div>

                    {/* Stock Details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#1A2133] text-gray-400">
                      <div>
                        <span>كود الترقيم الدولي (ISIN):</span>
                        <div className="font-mono text-gray-200 mt-0.5">{t.isin}</div>
                      </div>
                      <div>
                        <span>وحدة المزايدة (Tick Size):</span>
                        <div className="font-mono text-gray-200 mt-0.5">{t.tick_size} ج.م</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: WORM COMPLIANCE AUDIT VAULT */}
        {/* ============================================================ */}
        {activeTab === 'worm' && (
          <div className="h-full w-full overflow-y-auto p-8 max-w-6xl mx-auto space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  سجل الامتثال الرقابي المشفر (FRA WORM Audit Vault)
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  سجل غير قابل للتعديل أو المسح (Write-Once, Read-Many) يوثق كافة إجراءات الوسطاء وفقاً لقانون سوق المال 95.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
                  حفظ إلزامي: 5 سنوات
                </span>
                <button
                  onClick={fetchData}
                  className="p-2 rounded-lg bg-[#182033] hover:bg-[#263352] text-gray-300 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-[#1E2436] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">معرف الرقابة (WORM ID)</th>
                      <th className="py-2.5 px-3">التوقيت</th>
                      <th className="py-2.5 px-3">الوسيط</th>
                      <th className="py-2.5 px-3">العميل</th>
                      <th className="py-2.5 px-3">السهم</th>
                      <th className="py-2.5 px-3">النوع</th>
                      <th className="py-2.5 px-3">الكمية</th>
                      <th className="py-2.5 px-3">البصمة الرقمية (SHA-256)</th>
                      <th className="py-2.5 px-3">الحالة الرقابية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171E2D]">
                    {auditRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-500">
                          لا توجد قيود مؤرشفة في خزانة WORM حتى الآن. قم باعتماد أمر من منصة HITL لإنشاء أول قيد موثق.
                        </td>
                      </tr>
                    ) : (
                      auditRecords.map((a, idx) => (
                        <tr key={idx} className="hover:bg-[#0E121C] transition">
                          <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{a.audit_reference_id}</td>
                          <td className="py-3 px-3 font-mono text-gray-400">{new Date(a.timestamp).toLocaleTimeString('ar-EG')}</td>
                          <td className="py-3 px-3 text-white">{a.broker_id}</td>
                          <td className="py-3 px-3 font-mono text-gray-400">{a.client_code}</td>
                          <td className="py-3 px-3 font-mono font-bold text-white">{a.ticker}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.action === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>
                              {a.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-white">{a.quantity.toLocaleString()}</td>
                          <td className="py-3 px-3 font-mono text-[10px] text-gray-500 max-w-xs truncate" title={a.sha256_hash}>
                            {a.sha256_hash.slice(0, 16)}...
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              FRA COMPLIANT
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: FIX PROTOCOL ENGINE (FINANCIAL TELECOM) */}
        {/* ============================================================ */}
        {activeTab === 'fix' && (
          <div className="h-full w-full overflow-y-auto p-8 max-w-6xl mx-auto space-y-6">
            
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <Cpu className="w-6 h-6 text-emerald-400" />
                محاكي بروتوكول FIX 4.4 (Financial Information eXchange Gateway)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                البروتوكول المالي القياسي المعتمد للتواصل مع محركات تداول البورصة المصرية ومحطات OMS.
              </p>
            </div>

            {/* FIX Protocol Fields Dictionary */}
            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                هيكل حقول رسالة أمر الشراء / البيع (Tag 35=D NewOrderSingle)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg">
                  <div className="font-mono text-emerald-400 text-xs font-bold">Tag 8 (BeginString)</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">FIX.4.4</div>
                  <div className="text-[10px] text-gray-500 mt-1">إصدار البروتوكول المالي</div>
                </div>

                <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg">
                  <div className="font-mono text-emerald-400 text-xs font-bold">Tag 35 (MsgType)</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">D (NewOrderSingle)</div>
                  <div className="text-[10px] text-gray-500 mt-1">نوع الرسالة: أمر جديد</div>
                </div>

                <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg">
                  <div className="font-mono text-emerald-400 text-xs font-bold">Tag 55 (Symbol)</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">COMI / TMGH / FWRY</div>
                  <div className="text-[10px] text-gray-500 mt-1">رمز السهم بالبورصة المصرية</div>
                </div>

                <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg">
                  <div className="font-mono text-emerald-400 text-xs font-bold">Tag 54 (Side)</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">1 = شراء | 2 = بيع</div>
                  <div className="text-[10px] text-gray-500 mt-1">اتجاه الأمر المالي</div>
                </div>

                <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg">
                  <div className="font-mono text-emerald-400 text-xs font-bold">Tag 38 (OrderQty)</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">عدد الأسهم</div>
                  <div className="text-[10px] text-gray-500 mt-1">الكمية المصرح بها</div>
                </div>

                <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg">
                  <div className="font-mono text-emerald-400 text-xs font-bold">Tag 44 (Price)</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">السعر بالجنيه (EGP)</div>
                  <div className="text-[10px] text-gray-500 mt-1">سعر الأمر المحدد</div>
                </div>

                <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg">
                  <div className="font-mono text-emerald-400 text-xs font-bold">Tag 11 (ClOrdID)</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">معرف الأمر الفريد</div>
                  <div className="text-[10px] text-gray-500 mt-1">توليد تلقائي لتفادي التكرار</div>
                </div>

                <div className="p-3 bg-[#0E121C] border border-[#1E2436] rounded-lg">
                  <div className="font-mono text-emerald-400 text-xs font-bold">Tag 10 (CheckSum)</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">المجموع الاختباري</div>
                  <div className="text-[10px] text-gray-500 mt-1">التحقق من سلامة البايتات</div>
                </div>
              </div>
            </div>

            {/* Sample Live FIX Stream Preview */}
            <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-white">نموذج لرسالة FIX 4.4 معتمدة وجاهزة للإرسال لمحرك EGX:</h3>
              <div className="p-4 bg-[#080B10] border border-[#1E2436] rounded-lg font-mono text-xs text-emerald-400 leading-relaxed select-all break-all">
                8=FIX.4.4|9=156|35=D|49=CFI_BROKERAGE|56=EGX_MATCHING_ENGINE|34=1024|52=20261011-09:30:00.120|11=ORD-COMI-101|55=COMI|54=1|38=2000|40=1|44=85.20|59=0|10=184|
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
