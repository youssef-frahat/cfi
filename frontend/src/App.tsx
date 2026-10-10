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
  Upload
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

const API_BASE = window.location.origin.includes('localhost') 
  ? 'https://cfi-six.vercel.app/api' 
  : '/api';

export default function App() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [tickers, setTickers] = useState<EGXTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditRecords, setAuditRecords] = useState<any[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load Calls & Tickers
  const fetchData = async () => {
    try {
      setLoading(true);
      const [callsRes, tickersRes] = await Promise.all([
        fetch(`${API_BASE}/calls`),
        fetch(`${API_BASE}/egx/tickers`)
      ]);
      const callsData = await callsRes.json();
      const tickersData = await tickersRes.json();
      
      setCalls(callsData);
      setTickers(tickersData);
      if (callsData.length > 0 && !selectedCall) {
        setSelectedCall(callsData[0]);
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
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedCall]);

  const handleApprove = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_id: 'BROKER_SHERIF_102' })
      });
      if (res.ok) {
        setActionNotice(`تم اعتماد الأمر بنجاح وتوليد رسالة FIX 4.4 وإيداع السجل في WORM Vault.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (orderId: string) => {
    const reason = prompt('أدخل سبب الرفض الإلزامي لهيئة الرقابة المالية:');
    if (!reason) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_id: 'BROKER_SHERIF_102', rejection_reason: reason })
      });
      if (res.ok) {
        setActionNotice(`تم رفض الأمر وتوثيق سبب الرفض في سجل الرقابة.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('audio_file', file);
    formData.append('client_code', '10542');
    formData.append('client_name', 'مستثمر تداول مباشر');
    formData.append('phone_number', '+20 100 123 4567');

    try {
      setActionNotice('جاري رفع التسجيل الصوتي إلى Supabase Storage وتحليله بالذكاء الاصطناعي...');
      const res = await fetch(`${API_BASE}/calls/upload-audio`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const newCall = await res.json();
        setActionNotice(`تم رفع التسجيل الصوتي بنجاح إلى Supabase Storage وتوليد مسودة أمر.`);
        fetchData();
        setSelectedCall(newCall);
      } else {
        setActionNotice('فشل رفع الملف الصوتي. يرجى المحاولة مجدداً.');
      }
    } catch (err) {
      console.error(err);
      setActionNotice('حدث خطأ أثناء رفع المكالمة الصوتية.');
    }
  };

  const loadAuditVault = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit`);
      const data = await res.json();
      setAuditRecords(data);
      setShowAuditModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0B0E14] text-gray-100 font-sans overflow-hidden select-none" dir="rtl">
      
      {/* 1. Header Bar */}
      <header className="absolute top-0 left-0 right-0 h-14 bg-[#141824] border-b border-[#1E2436] flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            CFI
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white flex items-center gap-2">
              منظومة تدقيق وتداول البورصة المصرية (EGX Voice-to-Order)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                HITL Live Terminal
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* File Upload Button for Supabase Storage */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-pointer transition">
            <Upload className="w-4 h-4" />
            <span>رفع مكالمة صوتية (.wav / .mp3)</span>
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1A2030] border border-[#262F47]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-gray-300">الوسيط المرخص:</span>
            <span className="font-semibold text-white">شريف عبد الرحمن (102)</span>
          </div>

          <button 
            onClick={loadAuditVault}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition"
          >
            <ShieldCheck className="w-4 h-4" />
            سجل الرقابة المالية (WORM Vault)
          </button>

          <button 
            onClick={fetchData}
            className="p-1.5 rounded bg-[#1A2030] hover:bg-[#262F47] text-gray-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content 3-Panels */}
      <div className="flex w-full h-full pt-14">
        
        {/* Panel 1: Calls Feed (Right in RTL) */}
        <aside className="w-80 border-l border-[#1E2436] bg-[#0E121C] flex flex-col">
          <div className="p-3 border-b border-[#1E2436] flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>سجل المكالمات الواردة</span>
            <span className="px-1.5 py-0.5 rounded bg-[#1E2436] text-gray-300">{calls.length} مكالمة</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1A2030]">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                جاري الاتصال بقاعدة بيانات Supabase...
              </div>
            ) : calls.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">لا توجد مكالمات مسجلة حالياً</div>
            ) : (
              calls.map((call) => (
                <div
                  key={call.call_id}
                  onClick={() => {
                    setSelectedCall(call);
                    setPlaybackTime(0);
                    setIsPlaying(false);
                  }}
                  className={`p-3.5 cursor-pointer transition ${
                    selectedCall?.call_id === call.call_id
                      ? 'bg-[#182033] border-r-2 border-emerald-400'
                      : 'hover:bg-[#121624]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">{call.client_name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">كود: {call.client_code}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
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
                      {call.extraction.has_actionable_orders ? `${call.extraction.orders.length} أمر تداول` : 'استفسار فقط'}
                    </span>

                    <span className="text-[10px] text-emerald-400 font-mono mr-auto">
                      ثقة: {Math.round(call.extraction.confidence_score * 100)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Panel 2: HITL Center Console */}
        <main className="flex-1 flex flex-col bg-[#0B0E14] overflow-y-auto p-6 space-y-6">
          {selectedCall ? (
            <>
              {/* Notification Banner */}
              {actionNotice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs flex items-center justify-between">
                  <span>{actionNotice}</span>
                  <button onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-white">✕</button>
                </div>
              )}

              {/* Call Player & Waveform Card */}
              <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition shadow-lg shadow-emerald-500/20"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                    </button>
                    <div>
                      <div className="text-sm font-bold text-white">تسجيل المكالمة الهاتفية المؤرشفة</div>
                      <div className="text-xs text-gray-400 font-mono">
                        00:{playbackTime.toString().padStart(2, '0')} / 00:{selectedCall.duration_seconds.toString().padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-[#0E121C] px-3 py-1.5 rounded border border-[#1E2436]">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WORM ID: {selectedCall.audit_reference_id}</span>
                  </div>
                </div>

                {/* Simulated Visual Waveform */}
                <div className="h-14 bg-[#0A0D14] rounded-lg p-2 flex items-center gap-1 border border-[#1E2436]/50 overflow-hidden">
                  {selectedCall.waveform_peaks.map((peak, idx) => {
                    const isPlayed = (idx / selectedCall.waveform_peaks.length) <= (playbackTime / selectedCall.duration_seconds);
                    return (
                      <div 
                        key={idx}
                        className={`flex-1 rounded-full transition-all duration-150 ${
                          isPlayed ? 'bg-emerald-400' : 'bg-[#1E2638]'
                        }`}
                        style={{ height: `${Math.max(15, peak * 100)}%` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Transcript & LLM Analysis Card */}
              <div className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  التفريغ النصي الحقيقي للمكالمة (Voice Transcription)
                </h3>
                <div className="p-4 bg-[#0E121C] border border-[#1E2436] rounded-lg text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-line">
                  {selectedCall.transcript}
                </div>
                {selectedCall.extraction.conversation_summary_ar && (
                  <div className="text-xs text-gray-400 bg-blue-500/5 border border-blue-500/20 p-3 rounded">
                    <span className="font-bold text-blue-400 ml-1">ملخص المحادثة:</span>
                    {selectedCall.extraction.conversation_summary_ar}
                  </div>
                )}
              </div>

              {/* Extracted Orders HITL Action Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    مسودات الأوامر المستخرجة للاعتماد (Order Drafts)
                  </h3>
                  <span className="text-xs text-gray-400">
                    يلزم اعتماد الوسيط البشري قبل الإرسال لمحرك البورصة (FRA Law 95)
                  </span>
                </div>

                {selectedCall.extraction.orders.length === 0 ? (
                  <div className="p-6 bg-[#121622] border border-[#1E2436] rounded-xl text-center text-xs text-gray-500">
                    لم يتم رصد أوامر قابلة للتنفيذ في هذه المكالمة (استفسار أسعار فقط).
                  </div>
                ) : (
                  selectedCall.extraction.orders.map((ord) => (
                    <div 
                      key={ord.order_id} 
                      className="bg-[#121622] border border-[#1E2436] rounded-xl p-5 hover:border-[#2B354F] transition"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                            ord.action === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}>
                            {ord.action === 'BUY' ? 'أمر شراء' : 'أمر بيع'}
                          </span>
                          <span className="text-base font-bold text-white font-mono">{ord.ticker}</span>
                          <span className="text-xs text-gray-400">{ord.company_name_raw}</span>
                        </div>

                        <span className={`text-xs px-2.5 py-0.5 rounded font-semibold ${
                          ord.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                          ord.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {ord.status === 'APPROVED' ? 'معتمد' : ord.status === 'REJECTED' ? 'مرفوض' : 'في انتظار الاعتماد'}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 p-3 bg-[#0E121C] rounded-lg text-xs mb-4">
                        <div>
                          <div className="text-gray-500">الكمية المطلوبة:</div>
                          <div className="font-bold text-white mt-0.5">{ord.quantity.toLocaleString()} سهم</div>
                        </div>
                        <div>
                          <div className="text-gray-500">نوع السعر:</div>
                          <div className="font-bold text-white mt-0.5">{ord.order_type === 'MARKET' ? 'سعر السوق (Market)' : `${ord.price} ج.م`}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">القيمة المقدرة:</div>
                          <div className="font-bold text-emerald-400 mt-0.5">{ord.estimated_total_egp.toLocaleString()} ج.م</div>
                        </div>
                        <div>
                          <div className="text-gray-500">صلاحية الأمر:</div>
                          <div className="font-bold text-white mt-0.5">يومي (DAY)</div>
                        </div>
                      </div>

                      {ord.fix_message && (
                        <div className="mb-4 p-2.5 bg-black/40 rounded border border-[#1E2436] font-mono text-[10px] text-emerald-400 break-all" dir="ltr">
                          <span className="text-gray-500 select-none">FIX 4.4: </span>
                          {ord.fix_message}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-2 border-t border-[#1E2436]">
                        {ord.status === 'PENDING_APPROVAL' ? (
                          <>
                            <button 
                              onClick={() => handleApprove(ord.order_id)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                            >
                              <CheckCircle className="w-4 h-4" />
                              اعتماد وإرسال للـ OMS (بضغطة واحدة)
                            </button>
                            <button 
                              onClick={() => handleReject(ord.order_id)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs transition"
                            >
                              <XCircle className="w-4 h-4" />
                              رفض الأمر
                            </button>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-gray-400" />
                            تم إغلاق الأمر وتوثيقه بسجل الرقابة المالية WORM.
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
              اختر مكالمة من القائمة للبدء في المراجعة والاعتماد
            </div>
          )}
        </main>

        {/* Panel 3: EGX30 Market Watch (Left in RTL) */}
        <aside className="w-80 border-r border-[#1E2436] bg-[#0E121C] flex flex-col">
          <div className="p-3 border-b border-[#1E2436] flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              أسعار السوق اللحظية (EGX30)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">LIVE DB</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1A2030]">
            {tickers.map((t) => {
              const isUp = t.change_pct >= 0;
              return (
                <div key={t.ticker} className="p-3 hover:bg-[#121624] transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white font-mono">{t.ticker}</div>
                      <div className="text-[10px] text-gray-400">{t.name_ar}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-white font-mono">{t.last_price.toFixed(2)} ج.م</div>
                      <div className={`text-[11px] font-semibold flex items-center justify-end font-mono ${
                        isUp ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isUp ? `+${t.change_pct}%` : `${t.change_pct}%`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom OMS FIX Status Widget */}
          <div className="p-3 bg-[#121622] border-t border-[#1E2436] text-[11px] space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              بوابة OMS FIX Gateway: متصلة
            </div>
            <div className="text-gray-500 text-[10px]">
              جلسة التداول الرسمية: 10:00 - 14:30 بتوقيت القاهرة
            </div>
          </div>
        </aside>

      </div>

      {/* WORM Audit Trail Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#121622] border border-[#1E2436] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#1E2436] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                سجل التدقيق الرقابي غير القابل للتعديل (FRA WORM 5-Year Vault)
              </div>
              <button 
                onClick={() => setShowAuditModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-[#1E2436]">
              {auditRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">لا توجد سجلات تدقيق حتى الآن. قم باعتماد أو رفض أمر لتسجيله مشفراً.</div>
              ) : (
                auditRecords.map((r, i) => (
                  <div key={i} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-gray-400">
                      <span className="text-white font-bold">{r.client_code} | {r.ticker} ({r.action})</span>
                      <span className="font-mono text-gray-500">{r.timestamp}</span>
                    </div>
                    <div className="font-mono text-[10px] text-emerald-400 bg-black/30 p-1.5 rounded break-all" dir="ltr">
                      SHA256: {r.sha256_hash}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
