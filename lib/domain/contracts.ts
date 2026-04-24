export type ContractType =
  | "DIGIT_MATCH"
  | "DIGIT_DIFFERS"
  | "DIGIT_OVER"
  | "DIGIT_UNDER"
  | "DIGIT_EVEN"
  | "DIGIT_ODD";

export type BarrierAwareContractType =
  | "DIGIT_MATCH"
  | "DIGIT_DIFFERS"
  | "DIGIT_OVER"
  | "DIGIT_UNDER";

export type ContractModule = {
  type: ContractType;
  label: string;
  requiresBarrier: boolean;
  validTickDurations: number[];
  requiredInputs: string[];
  buildPayload: (args: {
    symbol: string;
    amount: number;
    duration: number;
    barrier?: number;
    currency?: string;
  }) => Record<string, string | number>;
  evaluateResult: (lastDigit: number, barrier?: number) => boolean;
  entryCondition: (lastDigit: number, barrier?: number) => boolean;
};

const supportedDurations = Array.from({ length: 20 }, (_, index) => index + 1);

const basePayload = (contract_type: string, args: {
  symbol: string;
  amount: number;
  duration: number;
  barrier?: number;
  currency?: string;
}) => ({
  amount: args.amount,
  basis: "stake",
  contract_type,
  currency: args.currency ?? "USD",
  duration: args.duration,
  duration_unit: "t",
  symbol: args.symbol,
  ...(typeof args.barrier === "number" ? { barrier: args.barrier } : {})
});

export const contractRegistry: Record<ContractType, ContractModule> = {
  DIGIT_MATCH: {
    type: "DIGIT_MATCH",
    label: "Digit Match",
    requiresBarrier: true,
    validTickDurations: supportedDurations,
    requiredInputs: ["market", "stake", "tickDuration", "barrier"],
    buildPayload: (args) => basePayload("DIGITMATCH", args),
    evaluateResult: (lastDigit, barrier) => lastDigit === barrier,
    entryCondition: (lastDigit, barrier) => lastDigit === barrier
  },
  DIGIT_DIFFERS: {
    type: "DIGIT_DIFFERS",
    label: "Digit Differs",
    requiresBarrier: true,
    validTickDurations: supportedDurations,
    requiredInputs: ["market", "stake", "tickDuration", "barrier"],
    buildPayload: (args) => basePayload("DIGITDIFF", args),
    evaluateResult: (lastDigit, barrier) => lastDigit !== barrier,
    entryCondition: (lastDigit, barrier) => lastDigit !== barrier
  },
  DIGIT_OVER: {
    type: "DIGIT_OVER",
    label: "Digit Over",
    requiresBarrier: true,
    validTickDurations: supportedDurations,
    requiredInputs: ["market", "stake", "tickDuration", "barrier"],
    buildPayload: (args) => basePayload("DIGITOVER", args),
    evaluateResult: (lastDigit, barrier) => lastDigit > (barrier ?? -1),
    entryCondition: (lastDigit, barrier) => lastDigit > (barrier ?? -1)
  },
  DIGIT_UNDER: {
    type: "DIGIT_UNDER",
    label: "Digit Under",
    requiresBarrier: true,
    validTickDurations: supportedDurations,
    requiredInputs: ["market", "stake", "tickDuration", "barrier"],
    buildPayload: (args) => basePayload("DIGITUNDER", args),
    evaluateResult: (lastDigit, barrier) => lastDigit < (barrier ?? 10),
    entryCondition: (lastDigit, barrier) => lastDigit < (barrier ?? 10)
  },
  DIGIT_EVEN: {
    type: "DIGIT_EVEN",
    label: "Digit Even",
    requiresBarrier: false,
    validTickDurations: supportedDurations,
    requiredInputs: ["market", "stake", "tickDuration"],
    buildPayload: (args) => basePayload("DIGITEVEN", args),
    evaluateResult: (lastDigit) => lastDigit % 2 === 0,
    entryCondition: (lastDigit) => lastDigit % 2 === 0
  },
  DIGIT_ODD: {
    type: "DIGIT_ODD",
    label: "Digit Odd",
    requiresBarrier: false,
    validTickDurations: supportedDurations,
    requiredInputs: ["market", "stake", "tickDuration"],
    buildPayload: (args) => basePayload("DIGITODD", args),
    evaluateResult: (lastDigit) => lastDigit % 2 === 1,
    entryCondition: (lastDigit) => lastDigit % 2 === 1
  }
};

export const contractAliases: Record<string, ContractType> = {
  match: "DIGIT_MATCH",
  differs: "DIGIT_DIFFERS",
  differ: "DIGIT_DIFFERS",
  over: "DIGIT_OVER",
  under: "DIGIT_UNDER",
  even: "DIGIT_EVEN",
  odd: "DIGIT_ODD"
};
