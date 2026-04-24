import { z } from "zod";
import { invokeWithFallback } from "@/lib/ai/providers";
import { assistantPrompts } from "@/lib/ai/prompts";
import {
  executionAssistantOutputSchema,
  marketAnalyzerOutputSchema,
  riskManagerOutputSchema,
  strategyBuilderOutputSchema,
  strategyValidatorOutputSchema
} from "@/lib/ai/schemas";
import { chooseBestMarket, type MarketScore } from "@/lib/domain/market-analyzer";
import { parseStrategyPrompt, validateStrategyConfig, type StrategyConfig } from "@/lib/domain/strategy";

function safeJsonParse<T>(input: string, schema: z.ZodSchema<T>): T | null {
  try {
    const parsed = JSON.parse(input);
    return schema.parse(parsed);
  } catch {
    return null;
  }
}

export async function runStrategyBuilder(prompt: string) {
  const deterministic = parseStrategyPrompt(prompt);
  const missingInputs: string[] = [];

  if (!deterministic.markets?.length) missingInputs.push("markets");
  if (!deterministic.modules?.length) missingInputs.push("modules");
  if (!deterministic.tickDuration) missingInputs.push("tickDuration");
  if (!deterministic.stake) missingInputs.push("stake");

  const fallback = {
    markets: deterministic.markets ?? [],
    modules: deterministic.modules?.map((module) => ({ type: module.type, barrier: module.barrier })) ?? [],
    tickDuration: deterministic.tickDuration ?? null,
    stake: deterministic.stake ?? null,
    moneyManagement: deterministic.moneyManagement
      ? {
          type: deterministic.moneyManagement.type ?? null,
          baseStake: deterministic.moneyManagement.baseStake ?? null
        }
      : null,
    stopLoss: deterministic.stopLoss ?? null,
    takeProfit: deterministic.takeProfit ?? null,
    missingInputs,
    notes: ["AI composer mapped only values found in the user prompt."]
  };

  const providerResult = await invokeWithFallback([
    { role: "system", content: assistantPrompts.STRATEGY_BUILDER_AI },
    { role: "user", content: `Prompt: ${prompt}\nDeterministic parse: ${JSON.stringify(fallback)}` }
  ]);

  return safeJsonParse(providerResult.content, strategyBuilderOutputSchema) ?? fallback;
}

export async function runStrategyValidator(strategy: Partial<StrategyConfig>) {
  const deterministic = validateStrategyConfig(strategy);
  const fallback = {
    valid: deterministic.valid,
    issues: deterministic.issues,
    corrections: deterministic.issues.map((issue) => `Resolve: ${issue}`),
    warnings: strategy.moneyManagement?.type ? [] : ["No money management system selected. Base stake will be used."]
  };

  const providerResult = await invokeWithFallback([
    { role: "system", content: assistantPrompts.STRATEGY_VALIDATOR_AI },
    { role: "user", content: JSON.stringify(strategy) }
  ]);

  return safeJsonParse(providerResult.content, strategyValidatorOutputSchema) ?? fallback;
}

export async function runRiskManager(strategy: Partial<StrategyConfig>) {
  const recommendations: string[] = [];
  const warnings: string[] = [];

  if (strategy.stake && strategy.stopLoss && strategy.stake > strategy.stopLoss) {
    warnings.push("Stake exceeds stop loss, which leaves almost no room for session-level control.");
  }

  if (!strategy.stopLoss) {
    recommendations.push("Set a stop loss before enabling execution.");
  }

  if (!strategy.takeProfit) {
    recommendations.push("Set a take profit to define a clear exit target.");
  }

  if (!strategy.moneyManagement?.type) {
    recommendations.push("Use base stake if you want the lowest complexity, or pick a progression explicitly.");
  }

  const fallback = {
    recommendations,
    warnings,
    suggestedGuards: {
      stopLoss: strategy.stopLoss ?? (strategy.stake ? Number((strategy.stake * 5).toFixed(2)) : null),
      takeProfit: strategy.takeProfit ?? (strategy.stake ? Number((strategy.stake * 8).toFixed(2)) : null)
    }
  };

  const providerResult = await invokeWithFallback([
    { role: "system", content: assistantPrompts.RISK_MANAGER_AI },
    { role: "user", content: JSON.stringify(strategy) }
  ]);

  return safeJsonParse(providerResult.content, riskManagerOutputSchema) ?? fallback;
}

export async function runMarketAnalyzer(strategy: Partial<StrategyConfig>, scores: MarketScore[]) {
  const best = chooseBestMarket(scores);
  const fallback = {
    explanation: [
      "Market analysis ranks selected symbols by recent signal readiness.",
      "Digit distributions are descriptive only and do not forecast outcomes."
    ],
    focusMarkets: best ? [best.symbol] : strategy.markets ?? [],
    signalSummary: scores.map((score) => `${score.symbol}: readiness ${score.score}%`),
    riskNotes: ["Use live ticks only. If no feed is connected, do not execute."]
  };

  const providerResult = await invokeWithFallback([
    { role: "system", content: assistantPrompts.MARKET_ANALYZER_AI },
    { role: "user", content: JSON.stringify({ strategy, scores }) }
  ]);

  return safeJsonParse(providerResult.content, marketAnalyzerOutputSchema) ?? fallback;
}

export async function runExecutionAssistant(strategy: Partial<StrategyConfig>, blockers: string[]) {
  const fallback = {
    ready: blockers.length === 0,
    summaryLines: [
      `Markets: ${(strategy.markets ?? []).join(", ") || "Missing"}`,
      `Modules: ${(strategy.modules ?? []).map((module) => `${module.type}${typeof module.barrier === "number" ? `(${module.barrier})` : ""}`).join(", ") || "Missing"}`,
      `Ticks: ${strategy.tickDuration ?? "Missing"}`,
      `Stake: ${strategy.stake ?? "Missing"}`,
      `Money Management: ${strategy.moneyManagement?.type ?? "BASE_STAKE"}`,
      `Stop Loss: ${strategy.stopLoss ?? "Missing"}`,
      `Take Profit: ${strategy.takeProfit ?? "Missing"}`
    ],
    blockers,
    confirmationMessage:
      blockers.length === 0
        ? "Confirm your setup to enable execution."
        : "Resolve the listed blockers before execution can start."
  };

  const providerResult = await invokeWithFallback([
    { role: "system", content: assistantPrompts.EXECUTION_ASSISTANT_AI },
    { role: "user", content: JSON.stringify({ strategy, blockers }) }
  ]);

  return safeJsonParse(providerResult.content, executionAssistantOutputSchema) ?? fallback;
}
