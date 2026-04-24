import { NextResponse } from "next/server";
import { z } from "zod";
import { buildExecutionPlan } from "@/lib/domain/execution";
import { strategySchema } from "@/lib/domain/strategy";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = strategySchema.extend({
    token: z.string().optional()
  }).safeParse(body);

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

  const hasToken = Boolean(parsed.data.token || process.env.DERIV_API_TOKEN);

  if (!hasToken) {
    return NextResponse.json({
      ok: true,
      mode: "preview",
      payloads: plan.payloads,
      message: "Execution payloads are ready, but live purchase stays disabled until a user token or secure backend token is available."
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "guarded",
    payloads: plan.payloads,
    message: "Payloads prepared with token-aware configuration. Keep secure purchase execution on the backend for production."
  });
}
