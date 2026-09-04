import fs from 'fs';
import path from 'path';
import { AIUsageLogEntry, AIUsagePeriodStats, AIUsageSummaryResponse, AIHealthStatus } from './usageTypes';
import { calculateEstimatedCost } from './geminiPricing';

const MAX_LOGS_RETAINED = 10000;
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'fima_ai_usage.json');

class UsageStoreClass {
  private logs: AIUsageLogEntry[] = [];
  private isLoaded = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(-MAX_LOGS_RETAINED);
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('[UsageStore] Could not load usage logs from disk, starting fresh:', err);
      this.logs = [];
      this.isLoaded = true;
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveToDisk();
    }, 1000);
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const dataToSave = JSON.stringify(this.logs.slice(-MAX_LOGS_RETAINED));
      fs.writeFileSync(DATA_FILE, dataToSave, 'utf-8');
    } catch (err) {
      console.warn('[UsageStore] Could not persist usage logs to disk:', err);
    }
  }

  /**
   * Log an AI request into the store
   */
  public logRequest(entry: Omit<AIUsageLogEntry, 'estimatedCost'> & { estimatedCost?: number }): AIUsageLogEntry {
    try {
      if (!this.isLoaded) {
        this.loadFromDisk();
      }

      const cost = typeof entry.estimatedCost === 'number'
        ? entry.estimatedCost
        : calculateEstimatedCost(entry.model, entry.inputTokens, entry.outputTokens, entry.thinkingTokens);

      const fullEntry: AIUsageLogEntry = {
        ...entry,
        estimatedCost: cost,
      };

      this.logs.push(fullEntry);
      if (this.logs.length > MAX_LOGS_RETAINED) {
        this.logs = this.logs.slice(-MAX_LOGS_RETAINED);
      }

      this.scheduleSave();
      return fullEntry;
    } catch (err) {
      console.error('[UsageStore] Error logging request (non-fatal):', err);
      return {
        ...entry,
        estimatedCost: 0,
      } as AIUsageLogEntry;
    }
  }

  /**
   * Calculates stats for a list of logs
   */
  private calculatePeriodStats(logs: AIUsageLogEntry[]): AIUsagePeriodStats {
    let totalReqs = 0;
    let visionReqs = 0;
    let textReqs = 0;
    let successfulReqs = 0;
    let failedReqs = 0;
    let rateLimited429 = 0;

    let inputTokens = 0;
    let outputTokens = 0;
    let thinkingTokens = 0;
    let totalTokens = 0;

    let totalCost = 0;

    let visionTokensSum = 0;
    let visionCostSum = 0;
    let textTokensSum = 0;
    let textCostSum = 0;

    for (const log of logs) {
      totalReqs++;
      if (log.feature === 'vision') {
        visionReqs++;
        visionTokensSum += log.totalTokens;
        visionCostSum += log.estimatedCost;
      } else {
        textReqs++;
        textTokensSum += log.totalTokens;
        textCostSum += log.estimatedCost;
      }

      if (log.success) {
        successfulReqs++;
      } else {
        failedReqs++;
      }

      if (log.httpStatus === 429 || log.errorType?.includes('429') || log.errorType?.includes('RESOURCE_EXHAUSTED')) {
        rateLimited429++;
      }

      inputTokens += log.inputTokens || 0;
      outputTokens += log.outputTokens || 0;
      thinkingTokens += log.thinkingTokens || 0;
      totalTokens += log.totalTokens || 0;
      totalCost += log.estimatedCost || 0;
    }

    const averagePerRequest = totalReqs > 0 ? Number((totalCost / totalReqs).toFixed(6)) : null;
    const averageVisionRequest = visionReqs > 0 ? Number((visionCostSum / visionReqs).toFixed(6)) : null;
    const averageTextRequest = textReqs > 0 ? Number((textCostSum / textReqs).toFixed(6)) : null;

    const averageTokensPerVision = visionReqs > 0 ? Math.round(visionTokensSum / visionReqs) : null;
    const averageTokensPerText = textReqs > 0 ? Math.round(textTokensSum / textReqs) : null;

    return {
      requests: {
        total: totalReqs,
        vision: visionReqs,
        text: textReqs,
        successful: successfulReqs,
        failed: failedReqs,
        rateLimited429,
      },
      tokens: {
        input: inputTokens,
        output: outputTokens,
        thinking: thinkingTokens,
        total: totalTokens,
      },
      estimatedCost: {
        total: Number(totalCost.toFixed(6)),
        averagePerRequest,
        averageVisionRequest,
        averageTextRequest,
      },
      averageTokensPerVision,
      averageTokensPerText,
    };
  }

  /**
   * Generates summary response for the frontend monitor
   */
  public getUsageSummary(primaryModel = 'gemini-3.1-flash-lite', fallbackModel = 'gemini-3.8-flash'): AIUsageSummaryResponse {
    if (!this.isLoaded) {
      this.loadFromDisk();
    }

    const now = new Date();
    const nowMs = now.getTime();

    // Start of today (00:00:00 local time)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // Start of yesterday
    const yesterdayStart = todayStart - 86400000;
    const yesterdayEnd = todayStart;

    // 7 days ago
    const last7DaysStart = nowMs - (7 * 86400000);
    // 30 days ago
    const last30DaysStart = nowMs - (30 * 86400000);

    const todayLogs: AIUsageLogEntry[] = [];
    const yesterdayLogs: AIUsageLogEntry[] = [];
    const last7DaysLogs: AIUsageLogEntry[] = [];
    const last30DaysLogs: AIUsageLogEntry[] = [];

    const modelsUsed: Record<string, { requests: number; tokens: number; estimatedCost: number }> = {};

    let recent429Count = 0;
    let recentErrorCount = 0;
    const recentTimeLimit = nowMs - (15 * 60 * 1000); // last 15 mins for health assessment
    let recentCallCount = 0;

    for (const log of this.logs) {
      const logTime = new Date(log.timestamp).getTime();

      if (logTime >= todayStart) todayLogs.push(log);
      if (logTime >= yesterdayStart && logTime < yesterdayEnd) yesterdayLogs.push(log);
      if (logTime >= last7DaysStart) last7DaysLogs.push(log);
      if (logTime >= last30DaysStart) last30DaysLogs.push(log);

      // Model breakdown
      const mName = log.model || 'unknown';
      if (!modelsUsed[mName]) {
        modelsUsed[mName] = { requests: 0, tokens: 0, estimatedCost: 0 };
      }
      modelsUsed[mName].requests++;
      modelsUsed[mName].tokens += (log.totalTokens || 0);
      modelsUsed[mName].estimatedCost = Number((modelsUsed[mName].estimatedCost + (log.estimatedCost || 0)).toFixed(6));

      if (logTime >= recentTimeLimit) {
        recentCallCount++;
        if (!log.success) recentErrorCount++;
        if (log.httpStatus === 429 || log.errorType?.includes('429') || log.errorType?.includes('RESOURCE_EXHAUSTED')) {
          recent429Count++;
        }
      }
    }

    // Determine health status
    let status: AIHealthStatus = 'healthy';
    let statusMessage = 'AI hoạt động bình thường';

    if (!process.env.GEMINI_API_KEY) {
      status = 'error';
      statusMessage = 'Chưa cấu hình GEMINI_API_KEY trên máy chủ';
    } else if (recent429Count > 0) {
      status = 'limited';
      statusMessage = 'Đã chạm giới hạn tốc độ / quota tạm thời (HTTP 429)';
    } else if (recentCallCount > 3 && (recentErrorCount / recentCallCount) > 0.4) {
      status = 'warning';
      statusMessage = 'Có một số yêu cầu gần đây bị gián đoạn hoặc gặp lỗi';
    }

    // Recent 10 logs (exclude raw internal requestId)
    const recentLogs = this.logs.slice(-10).reverse().map(({ requestId, ...rest }) => rest);

    return {
      primaryModel,
      fallbackModel,
      status,
      statusMessage,
      quota: {
        readableDirectly: false,
        available: false,
        rpm: null,
        tpm: null,
        rpd: null,
        remaining: null,
        resetAt: null,
        officialDashboardUrl: 'https://aistudio.google.com/app/plan_information',
        message: 'Không thể đọc trực tiếp quota từ Gemini API backend. Vui lòng xem hạn mức chính thức trong Google AI Studio.',
      },
      periods: {
        today: this.calculatePeriodStats(todayLogs),
        yesterday: this.calculatePeriodStats(yesterdayLogs),
        last7Days: this.calculatePeriodStats(last7DaysLogs),
        last30Days: this.calculatePeriodStats(last30DaysLogs),
        allTime: this.calculatePeriodStats(this.logs),
      },
      modelsUsed,
      recentLogs,
      totalLoggedCount: this.logs.length,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const UsageStore = new UsageStoreClass();
