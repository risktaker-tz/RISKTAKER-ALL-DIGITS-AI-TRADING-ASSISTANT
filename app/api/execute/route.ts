import { NextResponse } from "next/server";
import { buildExecutionPlan } from "@/lib/domain/execution";
import { strategySchema } from "@/lib/domain/strategy";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = strategySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, issues: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 }
    );
  }

  const plan = buildExecutionPlan(parsed.data);

  if (!plan.ok) {
    return NextResponse.json(plan, { status: 400 });
  }

  if (!process.env.DERIV_API_TOKEN) {
    return NextResponse.json({
      ok: true,
      mode: "preview",
      payloads: plan.payloads,
      message: "Execution payloads are ready, but live purchase is disabled until DERIV_API_TOKEN is configured."
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "guarded",
    payloads: plan.payloads,
    message: "Payloads prepared. Wire secure backend purchase execution before using live mode in production."
  });
}
