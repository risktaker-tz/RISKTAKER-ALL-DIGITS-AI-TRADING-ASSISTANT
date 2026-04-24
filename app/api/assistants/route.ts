import { NextResponse } from "next/server";
import { assistantRequestSchema } from "@/lib/ai/schemas";
import {
  runExecutionAssistant,
  runMarketAnalyzer,
  runRiskManager,
  runStrategyBuilder,
  runStrategyValidator
} from "@/lib/ai/assistants";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = assistantRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid assistant request.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { assistant, prompt, strategy, context } = parsed.data;

  switch (assistant) {
    case "STRATEGY_BUILDER_AI":
      return NextResponse.json(await runStrategyBuilder(prompt));
    case "STRATEGY_VALIDATOR_AI":
      return NextResponse.json(await runStrategyValidator((strategy ?? {}) as never));
    case "RISK_MANAGER_AI":
      return NextResponse.json(await runRiskManager((strategy ?? {}) as never));
    case "MARKET_ANALYZER_AI":
      return NextResponse.json(await runMarketAnalyzer((strategy ?? {}) as never, (context?.scores as never[]) ?? []));
    case "EXECUTION_ASSISTANT_AI":
      return NextResponse.json(
        await runExecutionAssistant((strategy ?? {}) as never, ((context?.blockers as string[]) ?? []))
      );
  }
}
