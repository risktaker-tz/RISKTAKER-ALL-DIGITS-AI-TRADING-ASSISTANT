import { z } from "zod";
import { contractAliases, contractRegistry, type ContractType } from "@/lib/domain/contracts";
import { validateBarrier } from "@/lib/domain/barriers";
import type { MoneyManagementType } from "@/lib/domain/money-management";

export const strategySchema = z.object({
  markets: z.array(z.string()).min(1, "Select at least one market."),
  modules: z.array(z.object({
    type: z.custom<ContractType>(),
    barrier: z.number().int().min(0).max(9).optional()
  })).min(1, "Select at least one contract module."),
  tickDuration: z.number().int().min(1).max(20),
  stake: z.number().positive("Stake is required."),
  moneyManagement: z.object({
    type: z.custom<MoneyManagementType>().optional(),
    baseStake: z.number().positive(),
    percentage: z.number().positive().optional(),
    sequence: z.array(z.number().positive()).optional(),
    customSteps: z.array(z.number().positive()).optional(),
    stepSize: z.number().positive().optional()
  }).optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  confirmed: z.boolean().default(false)
});

export type StrategyConfig = z.infer<typeof strategySchema>;

const moneyManagementAliases: Record<string, MoneyManagementType> = {
  martingale: "MARTINGALE",
  "anti martingale": "ANTI_MARTINGALE",
  antimartingale: "ANTI_MARTINGALE",
  dalembert: "DALEMBERT",
  "reverse dalembert": "REVERSE_DALEMBERT",
  fibonacci: "FIBONACCI",
  labouchere: "LABOUCHERE",
  "reverse labouchere": "REVERSE_LABOUCHERE",
  "percentage risk": "PERCENTAGE_RISK",
  "custom progression": "CUSTOM_PROGRESSION",
  base: "BASE_STAKE"
};

export function parseStrategyPrompt(prompt: string): Partial<StrategyConfig> {
  const normalized = prompt.toLowerCase();
  const modules = Object.entries(contractAliases).flatMap(([alias, type]) => {
    const regex = new RegExp(`\\b${alias}\\b(?:\\s+(?:from|at|barrier|digit)?\\s*(\\d))?`, "gi");
    const matches = [...normalized.matchAll(regex)];
    return matches.map((match) => ({
      type,
      barrier: match[1] ? Number(match[1]) : undefined
    }));
  });

  const uniqueModules = modules.filter((module, index, array) => {
    return index === array.findIndex((entry) => entry.type === module.type && entry.barrier === module.barrier);
  });

  const marketMatches = [...normalized.matchAll(/\b(r_10|r_25|r_50|r_75|r_100|volatility\s*(10|25|50|75|100))\b/gi)].map(
    (match) => match[1].replace(/\s+/g, "").toUpperCase().replace("VOLATILITY", "R_")
  );

  const ticks = normalized.match(/\b(\d{1,2})\s*ticks?\b/)?.[1];
  const stake = normalized.match(/\bstake\s*\$?\s*(\d+(\.\d+)?)\b/)?.[1] ?? normalized.match(/\$([0-9]+(\.[0-9]+)?)/)?.[1];
  const stopLoss = normalized.match(/\b(?:sl|stop loss)\s*\$?\s*(\d+(\.\d+)?)\b/)?.[1];
  const takeProfit = normalized.match(/\b(?:tp|take profit)\s*\$?\s*(\d+(\.\d+)?)\b/)?.[1];

  const mmEntry = Object.entries(moneyManagementAliases).find(([alias]) => normalized.includes(alias));

  return {
    markets: marketMatches,
    modules: uniqueModules,
    tickDuration: ticks ? Number(ticks) : undefined,
    stake: stake ? Number(stake) : undefined,
    moneyManagement: mmEntry && stake ? {
      type: mmEntry[1],
      baseStake: Number(stake)
    } : undefined,
    stopLoss: stopLoss ? Number(stopLoss) : undefined,
    takeProfit: takeProfit ? Number(takeProfit) : undefined
  };
}

export function validateStrategyConfig(config: Partial<StrategyConfig>) {
  const issues: string[] = [];

  if (!config.markets?.length) {
    issues.push("At least one market is required.");
  }

  if (!config.modules?.length) {
    issues.push("At least one contract module is required.");
  }

  config.modules?.forEach((module) => {
    const registry = contractRegistry[module.type];

    if (!registry) {
      issues.push(`Unsupported module: ${module.type}`);
      return;
    }

    const barrierCheck = validateBarrier(module.type, module.barrier);
    if (!barrierCheck.ok) {
      issues.push(barrierCheck.message ?? `Invalid barrier for ${registry.label}.`);
    }
  });

  if (!config.stake) {
    issues.push("Stake is mandatory.");
  }

  if (!config.tickDuration || config.tickDuration < 1 || config.tickDuration > 20) {
    issues.push("Tick duration must be between 1 and 20.");
  }

  if (
    typeof config.stopLoss === "number" &&
    typeof config.takeProfit === "number" &&
    config.stopLoss >= config.takeProfit
  ) {
    issues.push("Stop loss should be lower than take profit for a sensible session guard.");
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
