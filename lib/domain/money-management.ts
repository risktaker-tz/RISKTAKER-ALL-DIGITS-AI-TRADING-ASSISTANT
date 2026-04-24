export type MoneyManagementType =
  | "BASE_STAKE"
  | "MARTINGALE"
  | "ANTI_MARTINGALE"
  | "DALEMBERT"
  | "REVERSE_DALEMBERT"
  | "FIBONACCI"
  | "LABOUCHERE"
  | "REVERSE_LABOUCHERE"
  | "PERCENTAGE_RISK"
  | "CUSTOM_PROGRESSION";

export type MoneyManagementConfig = {
  type: MoneyManagementType;
  baseStake: number;
  percentage?: number;
  sequence?: number[];
  customSteps?: number[];
  stepSize?: number;
};

export type MoneyManagementState = {
  currentStake: number;
  streak: number;
  sequenceIndex: number;
  labouchereSequence: number[];
};

export function createMoneyManagementState(config: MoneyManagementConfig): MoneyManagementState {
  return {
    currentStake: config.baseStake,
    streak: 0,
    sequenceIndex: 0,
    labouchereSequence: config.sequence?.length ? [...config.sequence] : [1, 2, 3]
  };
}

export function nextStakeFromResult(
  config: MoneyManagementConfig,
  state: MoneyManagementState,
  outcome: "WIN" | "LOSS",
  balance?: number
): MoneyManagementState {
  const next = { ...state };
  const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21];

  switch (config.type) {
    case "BASE_STAKE":
      next.currentStake = config.baseStake;
      break;
    case "MARTINGALE":
      next.currentStake = outcome === "LOSS" ? state.currentStake * 2 : config.baseStake;
      break;
    case "ANTI_MARTINGALE":
      next.currentStake = outcome === "WIN" ? state.currentStake * 2 : config.baseStake;
      break;
    case "DALEMBERT":
      next.currentStake = Math.max(config.baseStake, state.currentStake + (outcome === "LOSS" ? (config.stepSize ?? 1) : -(config.stepSize ?? 1)));
      break;
    case "REVERSE_DALEMBERT":
      next.currentStake = Math.max(config.baseStake, state.currentStake + (outcome === "WIN" ? (config.stepSize ?? 1) : -(config.stepSize ?? 1)));
      break;
    case "FIBONACCI":
      next.sequenceIndex = outcome === "LOSS" ? Math.min(state.sequenceIndex + 1, fibonacci.length - 1) : Math.max(0, state.sequenceIndex - 2);
      next.currentStake = config.baseStake * fibonacci[next.sequenceIndex];
      break;
    case "LABOUCHERE": {
      const sequence = next.labouchereSequence.length ? [...next.labouchereSequence] : [1, 2, 3];
      const amount = (sequence[0] ?? 0) + (sequence.at(-1) ?? 0);
      if (outcome === "WIN") {
        sequence.shift();
        sequence.pop();
      } else {
        sequence.push(Math.max(1, amount));
      }
      next.labouchereSequence = sequence.length ? sequence : [1, 2, 3];
      next.currentStake = config.baseStake * ((next.labouchereSequence[0] ?? 1) + (next.labouchereSequence.at(-1) ?? 0));
      break;
    }
    case "REVERSE_LABOUCHERE": {
      const sequence = next.labouchereSequence.length ? [...next.labouchereSequence] : [1, 2, 3];
      const amount = (sequence[0] ?? 0) + (sequence.at(-1) ?? 0);
      if (outcome === "WIN") {
        sequence.push(Math.max(1, amount));
      } else {
        sequence.shift();
        sequence.pop();
      }
      next.labouchereSequence = sequence.length ? sequence : [1, 2, 3];
      next.currentStake = config.baseStake * ((next.labouchereSequence[0] ?? 1) + (next.labouchereSequence.at(-1) ?? 0));
      break;
    }
    case "PERCENTAGE_RISK":
      next.currentStake = balance && config.percentage ? Number((balance * (config.percentage / 100)).toFixed(2)) : config.baseStake;
      break;
    case "CUSTOM_PROGRESSION": {
      const steps = config.customSteps?.length ? config.customSteps : [1];
      next.sequenceIndex =
        outcome === "LOSS" ? Math.min(state.sequenceIndex + 1, steps.length - 1) : 0;
      next.currentStake = config.baseStake * steps[next.sequenceIndex];
      break;
    }
  }

  return next;
}
