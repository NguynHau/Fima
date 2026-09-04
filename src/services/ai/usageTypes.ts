/**
 * AI Usage & Quota Monitor Types
 */

export interface AIUsageLogEntry {
  requestId: string;
  timestamp: string; // ISO string
  endpoint: string;
  feature: 'vision' | 'text';
  model: string;
  success: boolean;
  httpStatus: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalTokens: number;
  imageTokens?: number;
  estimatedCost: number;
  latencyMs: number;
  errorType?: string | null;
  isMultimodal: boolean;
}

export interface AIUsagePeriodStats {
  requests: {
    total: number;
    vision: number;
    text: number;
    successful: number;
    failed: number;
    rateLimited429: number;
  };
  tokens: {
    input: number;
    output: number;
    thinking: number;
    total: number;
  };
  estimatedCost: {
    total: number;
    averagePerRequest: number | null;
    averageVisionRequest: number | null;
    averageTextRequest: number | null;
  };
  averageTokensPerVision: number | null;
  averageTokensPerText: number | null;
}

export type AIHealthStatus = 'healthy' | 'warning' | 'limited' | 'error' | 'unavailable';

export interface AIUsageSummaryResponse {
  primaryModel: string;
  fallbackModel: string;
  status: AIHealthStatus;
  statusMessage: string;
  quota: {
    readableDirectly: false;
    available: false;
    rpm: number | null;
    tpm: number | null;
    rpd: number | null;
    remaining: number | null;
    resetAt: string | null;
    officialDashboardUrl: string;
    message: string;
  };
  periods: {
    today: AIUsagePeriodStats;
    yesterday: AIUsagePeriodStats;
    last7Days: AIUsagePeriodStats;
    last30Days: AIUsagePeriodStats;
    allTime: AIUsagePeriodStats;
  };
  modelsUsed: Record<string, { requests: number; tokens: number; estimatedCost: number }>;
  recentLogs: Array<Omit<AIUsageLogEntry, 'requestId'>>;
  totalLoggedCount: number;
  updatedAt: string;
}
