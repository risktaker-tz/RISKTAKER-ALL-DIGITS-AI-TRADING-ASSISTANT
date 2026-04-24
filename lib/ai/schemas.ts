import { z } from "zod";

export const assistantNameSchema = z.enum([
  "STRATEGY_BUILDER_AI",
  "STRATEGY_VALIDATOR_AI",
  "RISK_MANAGER_AI",
  "MARKET_ANALYZER_AI",
  "EXECUTION_ASSISTANT_AI"
]);

export const assistantRequestSchema = z.object({
  assistant: assistantNameSchema,
  prompt: z.string().min(1),
  strategy: z.unknown().optional(),
  context: z.record(z.string(), z.unknown()).optional()
});

export const strategyBuilderOutputSchema = z.object({
  markets: z.array(z.string()),
  modules: z.array(z.object({
    type: z.string(),
    barrier: z.number().int().optional()
  })),
  tickDuration: z.number().int().min(1).max(20).nullable(),
  stake: z.number().positive().nullable(),
  moneyManagement: z.object({
    type: z.string().nullable(),
    baseStake: z.number().positive().nullable()
  }).nullable(),
  stopLoss: z.number().positive().nullable(),
  takeProfit: z.number().positive().nullable(),
  missingInputs: z.array(z.string()),
  notes: z.array(z.string())
});

export const strategyValidatorOutputSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  corrections: z.array(z.string()),
  warnings: z.array(z.string())
});

export const riskManagerOutputSchema = z.object({
  recommendations: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestedGuards: z.object({
    stopLoss: z.number().positive().nullable(),
    takeProfit: z.number().positive().nullable()
  })
});

export const marketAnalyzerOutputSchema = z.object({
  explanation: z.array(z.string()),
  focusMarkets: z.array(z.string()),
  signalSummary: z.array(z.string()),
  riskNotes: z.array(z.string())
});

export const executionAssistantOutputSchema = z.object({
  ready: z.boolean(),
  summaryLines: z.array(z.string()),
  blockers: z.array(z.string()),
  confirmationMessage: z.string()
});
