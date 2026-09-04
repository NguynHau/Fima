import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, RefreshCw, Activity, Zap, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Clock, HelpCircle, WifiOff } from 'lucide-react';
import { AIManager } from '../services/ai/AIManager';
import { AIUsageSummaryResponse, AIUsagePeriodStats, AIHealthStatus } from '../services/ai/usageTypes';
import { formatUsdCost } from '../services/ai/geminiPricing';

type PeriodKey = 'today' | 'yesterday' | 'last7Days' | 'last30Days' | 'allTime';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  last7Days: '7 ngày',
  last30Days: '30 ngày',
  allTime: 'Tất cả',
};

export const AIUsageMonitor: React.FC = () => {
  const [data, setData] = useState<AIUsageSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('today');
  const [showLogs, setShowLogs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('');

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const summary = await AIManager.getUsageStats();
      setData(summary);
      setLastRefreshedTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (err) {
      console.error('Error loading AI usage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();

    const handleOnline = () => {
      fetchUsage();
    };

    const handleOffline = () => {
      fetchUsage();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchUsage]);

  const currentStats: AIUsagePeriodStats = data?.periods?.[activePeriod] || {
    requests: { total: 0, vision: 0, text: 0, successful: 0, failed: 0, rateLimited429: 0 },
    tokens: { input: 0, output: 0, thinking: 0, total: 0 },
    estimatedCost: { total: 0, averagePerRequest: null, averageVisionRequest: null, averageTextRequest: null },
    averageTokensPerVision: null,
    averageTokensPerText: null,
  };

  const getStatusBadge = (status?: AIHealthStatus) => {
    if (!AIManager.isOnline()) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <WifiOff size={12} className="text-amber-400" />
          Offline (Ngoại tuyến)
        </span>
      );
    }

    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Available (Sẵn sàng)
          </span>
        );
      case 'limited':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle size={12} className="text-amber-400" />
            Rate Limited (429)
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
            <AlertTriangle size={12} className="text-yellow-400" />
            Cảnh báo lỗi
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30">
            <AlertCircle size={12} className="text-red-400" />
            Lỗi cấu hình
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
            Unavailable
          </span>
        );
    }
  };

  return (
    <div className="bg-[#121212] border border-purple-500/30 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Activity size={22} className="text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">AI Usage & Quota Monitor</h3>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-neutral-400 hover:text-purple-300 transition-colors cursor-pointer"
                title="Giải thích chỉ số"
              >
                <HelpCircle size={15} />
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">
              Model: <span className="text-purple-300 font-mono font-bold">{data?.primaryModel || 'gemini-3.1-flash-lite'}</span>
              <span className="text-neutral-500 text-[10px] ml-1.5">(Fallback: {data?.fallbackModel || 'gemini-3.8-flash'})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {getStatusBadge(data?.status)}
          <button
            type="button"
            onClick={() => fetchUsage()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white transition-all border border-neutral-700 flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Làm mới số liệu (không tiêu tốn token hay quota Gemini)"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-purple-400' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Help info modal / banner if toggled */}
      {showHelp && (
        <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-3.5 text-xs text-purple-200/90 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-purple-300">
            <span className="flex items-center gap-1.5"><Sparkles size={14} /> Cách tính chỉ số & Quota</span>
            <button onClick={() => setShowHelp(false)} className="text-neutral-400 hover:text-white text-[11px]">Đóng</button>
          </div>
          <p>• <strong>Token thực tế:</strong> Được trích xuất trực tiếp từ trường <code className="bg-purple-900/60 px-1 py-0.5 rounded text-[10px]">usageMetadata</code> của Gemini API.</p>
          <p>• <strong>Ước lượng chi phí:</strong> Tính theo biểu phí chuẩn Google Gemini ($0.075/1M token đầu vào, $0.30/1M token đầu ra). Nếu dùng gói Free Tier trong Google AI Studio, chi phí thực tế là $0.00.</p>
          <p>• <strong>Quota/Rate Limit:</strong> Gemini API không trả về hạn mức còn lại qua API response. Số liệu thống kê ở đây là log thực tế ghi nhận từ backend Fima.</p>
        </div>
      )}

      {/* Period Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((pKey) => (
          <button
            key={pKey}
            type="button"
            onClick={() => setActivePeriod(pKey)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activePeriod === pKey
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            {PERIOD_LABELS[pKey]}
          </button>
        ))}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Requests */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
            <Zap size={13} className="text-amber-400" /> Tổng Requests
          </span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-white font-mono">
              {currentStats.requests.total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-0.5">
              <span className="text-emerald-400 font-semibold">{currentStats.requests.successful} ok</span>
              {currentStats.requests.failed > 0 && (
                <span className="text-red-400 font-semibold">• {currentStats.requests.failed} lỗi</span>
              )}
            </div>
          </div>
        </div>

        {/* Vision Requests */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
            📷 Vision (Hóa đơn)
          </span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-purple-300 font-mono">
              {currentStats.requests.vision.toLocaleString()}
            </span>
            <p className="text-[10px] text-neutral-400 mt-0.5">Quét hóa đơn qua ảnh</p>
          </div>
        </div>

        {/* Text Requests */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
            💬 Text AI
          </span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-blue-300 font-mono">
              {currentStats.requests.text.toLocaleString()}
            </span>
            <p className="text-[10px] text-neutral-400 mt-0.5">Trợ lý & Chat văn bản</p>
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
            💰 Ước lượng chi phí
          </span>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
              {formatUsdCost(currentStats.estimatedCost.total)}
            </span>
            <p className="text-[10px] text-neutral-400 mt-0.5">Free Tier: $0.00</p>
          </div>
        </div>
      </div>

      {/* Collapsible Recent Logs */}
      {data?.recentLogs && data.recentLogs.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="w-full py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-bold transition-all flex items-center justify-between border border-neutral-800 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              Lịch sử các yêu cầu AI gần nhất ({data.recentLogs.length})
            </span>
            {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showLogs && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {data.recentLogs.map((log, index) => (
                <div
                  key={index}
                  className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px]">{log.feature === 'vision' ? '📷' : '💬'}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-200">
                          {log.feature === 'vision' ? 'Quét hóa đơn' : 'Text AI / Trợ lý'}
                        </span>
                        <span className="text-[10px] font-mono text-purple-300">({log.model})</span>
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN')} • {log.latencyMs}ms
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-neutral-300 text-[11px]">
                      {log.totalTokens.toLocaleString()} tokens
                    </span>
                    <p className="text-[10px] text-neutral-500">
                      {log.success ? <span className="text-emerald-400">200 OK</span> : <span className="text-red-400">Lỗi</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lastRefreshedTime && (
        <div className="text-right text-[10px] text-neutral-500">
          Cập nhật lúc: {lastRefreshedTime}
        </div>
      )}
    </div>
  );
};
