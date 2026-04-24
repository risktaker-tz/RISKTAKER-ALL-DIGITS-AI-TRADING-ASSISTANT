import { contractRegistry } from "@/lib/domain/contracts";
import { strategySchema, type StrategyConfig } from "@/lib/domain/strategy";

export function buildExecutionPlan(config: StrategyConfig) {
  const parsed = strategySchema.safeParse(config);

  if (!parsed.success) {
    return {
      ok: false as const,
      issues: parsed.error.issues.map((issue) => issue.message)
    };
  }

  if (!config.confirmed) {
    return {
      ok: false as const,
      issues: ["Execution blocked until the user confirms the setup."]
    };
  }

  const payloads = config.markets.flatMap((market) =>
    config.modules.map((module) =>
      contractRegistry[module.type].buildPayload({
        symbol: market,
        amount: config.stake,
        duration: config.tickDuration,
        barrier: module.barrier
      })
    )
  );

  return {
    ok: true as const,
    payloads
  };
}
