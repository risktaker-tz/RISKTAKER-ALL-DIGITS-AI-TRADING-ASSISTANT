import { contractRegistry } from "@/lib/domain/contracts";
import { buildDigitDistribution, type TickQuote } from "@/lib/domain/ticks";

export type StrategyModuleConfig = {
  type: keyof typeof contractRegistry;
  barrier?: number;
};

export type MarketScore = {
  symbol: string;
  score: number;
  distribution: ReturnType<typeof buildDigitDistribution>;
  readiness: number;
  reason: string;
};

export function scoreMarket(symbol: string, ticks: TickQuote[], modules: StrategyModuleConfig[]): MarketScore {
  const distribution = buildDigitDistribution(ticks);
  const recentDigits = ticks.slice(-7).map((tick) => tick.lastDigit);
  let readiness = 0;

  modules.forEach((module) => {
    const registry = contractRegistry[module.type];
    const hits = recentDigits.filter((digit) => registry.entryCondition(digit, module.barrier)).length;
    readiness += hits / Math.max(1, recentDigits.length);
  });

  const score = Number((readiness / Math.max(1, modules.length) * 100).toFixed(2));

  return {
    symbol,
    score,
    distribution,
    readiness,
    reason: `Score based on recent 7-tick readiness across ${modules.length} configured module(s).`
  };
}

export function chooseBestMarket(scores: MarketScore[]): MarketScore | null {
  if (!scores.length) {
    return null;
  }

  return [...scores].sort((a, b) => b.score - a.score)[0];
}
