import { contractRegistry, type BarrierAwareContractType, type ContractType } from "@/lib/domain/contracts";

export type BarrierValidationResult = {
  ok: boolean;
  message?: string;
};

const rules: Record<BarrierAwareContractType, { min: number; max: number }> = {
  DIGIT_OVER: { min: 0, max: 8 },
  DIGIT_UNDER: { min: 1, max: 9 },
  DIGIT_MATCH: { min: 0, max: 9 },
  DIGIT_DIFFERS: { min: 0, max: 9 }
};

export function validateBarrier(contractType: ContractType, barrier?: number): BarrierValidationResult {
  const module = contractRegistry[contractType];

  if (!module.requiresBarrier) {
    return { ok: true };
  }

  if (typeof barrier !== "number" || Number.isNaN(barrier)) {
    return { ok: false, message: `${module.label} requires a prediction barrier.` };
  }

  const rule = rules[contractType as BarrierAwareContractType];

  if (barrier < rule.min || barrier > rule.max) {
    return {
      ok: false,
      message: `${module.label} barrier must be between ${rule.min} and ${rule.max}.`
    };
  }

  return { ok: true };
}
