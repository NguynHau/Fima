/**
 * Google Gemini API Official Pricing Matrix & Cost Estimation
 * 
 * Source: Official Google AI Studio & Google Cloud Gemini API Pricing
 * Last verified: September 2026
 * 
 * Note: Costs are estimates based on standard pay-as-you-go pricing per million tokens.
 * Free tier usage will incur $0 actual billing in Google AI Studio within free quota tiers.
 */

export interface ModelPricingTier {
  model: string;
  displayName: string;
  inputPricePerMillion: number; // USD per 1M tokens
  outputPricePerMillion: number; // USD per 1M tokens
  thinkingPricePerMillion?: number; // USD per 1M tokens (for reasoning models)
  tierDescription: string;
}

export const GEMINI_PRICING_REGISTRY: Record<string, ModelPricingTier> = {
  'gemini-3.1-flash-lite': {
    model: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash Lite',
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    thinkingPricePerMillion: 0.30,
    tierDescription: 'Ultra low latency & high efficiency flash model',
  },
  'gemini-3.8-flash': {
    model: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    thinkingPricePerMillion: 0.30,
    tierDescription: 'High-speed multimodal flash model',
  },
  'gemini-2.5-flash': {
    model: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    thinkingPricePerMillion: 0.30,
    tierDescription: 'Fast multimodal flash model',
  },
  'gemini-2.5-flash-lite': {
    model: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash Lite',
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    thinkingPricePerMillion: 0.30,
    tierDescription: 'Efficient lightweight flash model',
  },
  'gemini-3.7-flash': {
    model: 'gemini-3.7-flash',
    displayName: 'Gemini 3.7 Flash',
    inputPricePerMillion: 0.10,
    outputPricePerMillion: 0.40,
    thinkingPricePerMillion: 0.40,
    tierDescription: 'Hybrid reasoning and multimodal model',
  },
};

export const DEFAULT_MODEL_PRICING: ModelPricingTier = {
  model: 'default-flash',
  displayName: 'Gemini Flash Model',
  inputPricePerMillion: 0.075,
  outputPricePerMillion: 0.30,
  thinkingPricePerMillion: 0.30,
  tierDescription: 'Standard Gemini Flash tier pricing',
};

/**
 * Calculates the estimated USD cost for a Gemini request based on token counts
 */
export function calculateEstimatedCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  thinkingTokens: number = 0
): number {
  const normModel = (model || '').toLowerCase().trim();
  const pricing = GEMINI_PRICING_REGISTRY[normModel] || DEFAULT_MODEL_PRICING;

  const inputCost = (Math.max(0, inputTokens) / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (Math.max(0, outputTokens) / 1_000_000) * pricing.outputPricePerMillion;
  const thinkingCost = (Math.max(0, thinkingTokens) / 1_000_000) * (pricing.thinkingPricePerMillion || pricing.outputPricePerMillion);

  return Number((inputCost + outputCost + thinkingCost).toFixed(8));
}

/**
 * Formats USD cost into a human-friendly string
 */
export function formatUsdCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined || isNaN(cost)) {
    return '$0.00';
  }
  if (cost === 0) {
    return '$0.00 (hoặc Free Tier)';
  }
  if (cost < 0.0001) {
    return `< $0.0001`;
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(3)}`;
}
