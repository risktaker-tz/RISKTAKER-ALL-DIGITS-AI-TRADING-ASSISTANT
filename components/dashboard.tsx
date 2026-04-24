"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  Play,
  Power,
  Radar,
  Settings2,
  Shield,
  Siren,
  Sparkles,
  StopCircle
} from "lucide-react";
import { contractRegistry, type ContractType } from "@/lib/domain/contracts";
import { chooseBestMarket, scoreMarket, type MarketScore } from "@/lib/domain/market-analyzer";
import { createTickQuote, buildDigitDistribution, type TickQuote } from "@/lib/domain/ticks";
import { validateBarrier } from "@/lib/domain/barriers";
import { validateStrategyConfig, type StrategyConfig } from "@/lib/domain/strategy";
import type { MoneyManagementType } from "@/lib/domain/money-management";

type NotificationItem = {
  id: string;
  tone: "info" | "success" | "warning" | "error";
  message: string;
};

type AssistantOutputs = {
  builder?: Record<string, unknown>;
  validator?: Record<string, unknown>;
  risk?: Record<string, unknown>;
  market?: Record<string, unknown>;
  execution?: Record<string, unknown>;
};

type SetupDraft = {
  token: string;
  tokenConnected: boolean;
  wizardStep: number;
  wizardComplete: boolean;
  prompt: string;
  distributionRange: number;
  strategy: StrategyConfig;
};

type DerivMessage = {
  msg_type?: string;
  error?: { message?: string };
  authorize?: { balance?: number; currency?: string; loginid?: string };
  tick?: { quote: number; epoch: number; symbol: string };
  proposal?: { id?: string; display_value?: string; payout?: string };
  buy?: { contract_id?: number; transaction_id?: number; buy_price?: number };
  proposal_open_contract?: {
    contract_id?: number;
    status?: "open" | "won" | "lost" | "sold";
    is_sold?: 0 | 1;
    profit?: number;
    buy_price?: number;
    payout?: number;
    underlying?: string;
  };
  echo_req?: Record<string, unknown>;
  req_id?: number;
};

type PendingProposal = {
  market: string;
  module: StrategyConfig["modules"][number];
};

const STORAGE_KEY = "risk-taker-digit-ai.session.v2";
const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=1089";
const MARKETS = ["R_10", "R_25", "R_50", "R_75", "R_100"];
const MONEY_MANAGEMENT_OPTIONS: MoneyManagementType[] = [
  "BASE_STAKE",
  "MARTINGALE",
  "ANTI_MARTINGALE",
  "DALEMBERT",
  "REVERSE_DALEMBERT",
  "FIBONACCI",
  "LABOUCHERE",
  "REVERSE_LABOUCHERE",
  "PERCENTAGE_RISK",
  "CUSTOM_PROGRESSION"
];

const defaultStrategy: StrategyConfig = {
  markets: ["R_10"],
  modules: [{ type: "DIGIT_DIFFERS", barrier: 5 }],
  tickDuration: 5,
  stake: 1,
  moneyManagement: {
    type: "BASE_STAKE",
    baseStake: 1
  },
  stopLoss: 10,
  takeProfit: 20,
  confirmed: false
};

const defaultPrompt =
  "Trade differs from 5 on R_10 with 5 ticks, stake 1, base stake, stop loss 10, take profit 20.";

const defaultDraft: SetupDraft = {
  token: "",
  tokenConnected: false,
  wizardStep: 0,
  wizardComplete: false,
  prompt: defaultPrompt,
  distributionRange: 1000,
  strategy: defaultStrategy
};

function formatModule(module: StrategyConfig["modules"][number]) {
  return `${contractRegistry[module.type].label}${typeof module.barrier === "number" ? ` ${module.barrier}` : ""}`;
}

export function Dashboard() {
  const [draft, setDraft] = useState<SetupDraft>(defaultDraft);
  const [assistantOutputs, setAssistantOutputs] = useState<AssistantOutputs>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tickMap, setTickMap] = useState<Record<string, TickQuote[]>>({});
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loginId, setLoginId] = useState("");
  const [connected, setConnected] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [tradingActive, setTradingActive] = useState(false);
  const [showWizard, setShowWizard] = useState(true);
  const [signalFlash, setSignalFlash] = useState<{ market: string; module: string; digit: number } | null>(null);
  const [sessionPL, setSessionPL] = useState(0);
  const [activeContractCount, setActiveContractCount] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const subscribedMarketsRef = useRef<Set<string>>(new Set());
  const reqIdRef = useRef(1);
  const lastExecutionRef = useRef(0);
  const pendingProposalsRef = useRef<Record<number, PendingProposal>>({});

  const strategy = draft.strategy;
  const validation = useMemo(() => validateStrategyConfig(strategy), [strategy]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved) as SetupDraft;
      setDraft((current) => ({
        ...current,
        ...parsed,
        strategy: { ...current.strategy, ...parsed.strategy }
      }));
      setShowWizard(!parsed.wizardComplete);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!draft.tokenConnected || !draft.token.trim()) {
      disconnectSocket();
      return;
    }

    connectSocket(draft.token);

    return () => {
      disconnectSocket();
    };
  }, [draft.tokenConnected, draft.token]);

  useEffect(() => {
    if (!connected || !socketRef.current) {
      return;
    }

    strategy.markets.forEach((market) => {
      if (!subscribedMarketsRef.current.has(market)) {
        socketRef.current?.send(JSON.stringify({ ticks: market, subscribe: 1 }));
        subscribedMarketsRef.current.add(market);
      }
    });
  }, [connected, strategy.markets]);

  const marketScores = useMemo(() => {
    return strategy.markets
      .map((market) => {
        const ticks = tickMap[market] ?? [];
        if (!ticks.length) {
          return null;
        }

        return scoreMarket(market, ticks.slice(-Math.max(30, draft.strategy.tickDuration * 12)), strategy.modules);
      })
      .filter((entry): entry is MarketScore => Boolean(entry));
  }, [draft.strategy.tickDuration, strategy.markets, strategy.modules, tickMap]);

  const bestMarket = useMemo(() => chooseBestMarket(marketScores), [marketScores]);

  const focusTicks = useMemo(() => {
    const focus = bestMarket?.symbol ?? strategy.markets[0];
    return focus ? tickMap[focus] ?? [] : [];
  }, [bestMarket?.symbol, strategy.markets, tickMap]);

  const distribution = useMemo(() => {
    return buildDigitDistribution(focusTicks.slice(-draft.distributionRange));
  }, [draft.distributionRange, focusTicks]);

  useEffect(() => {
    if (!tradingActive || !strategy.confirmed || !connected || !bestMarket) {
      return;
    }

    const latest = (tickMap[bestMarket.symbol] ?? []).at(-1);
    if (!latest) {
      return;
    }

    const ready = strategy.modules.find((module) =>
      contractRegistry[module.type].entryCondition(latest.lastDigit, module.barrier)
    );

    if (!ready) {
      return;
    }

    if (Date.now() - lastExecutionRef.current < 4000) {
      return;
    }

    lastExecutionRef.current = Date.now();
    setSignalFlash({ market: bestMarket.symbol, module: formatModule(ready), digit: latest.lastDigit });
    executeTrade(bestMarket.symbol, ready);
  }, [bestMarket, connected, strategy, tickMap, tradingActive]);

  useEffect(() => {
    if (!signalFlash) {
      return;
    }

    const timer = window.setTimeout(() => setSignalFlash(null), 2400);
    return () => window.clearTimeout(timer);
  }, [signalFlash]);

  function nextReqId() {
    reqIdRef.current += 1;
    return reqIdRef.current;
  }

  function pushNotice(tone: NotificationItem["tone"], message: string) {
    setNotifications((current) => [{ id: crypto.randomUUID(), tone, message }, ...current].slice(0, 10));
  }

  function persistStep(step: number) {
    setDraft((current) => ({ ...current, wizardStep: step }));
  }

  function disconnectSocket() {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    subscribedMarketsRef.current = new Set();
    setConnected(false);
    setAuthorizing(false);
    setTradingActive(false);
    setActiveContractCount(0);
  }

  function connectSocket(token: string) {
    if (!token.trim()) {
      pushNotice("error", "API token is required.");
      return;
    }

    disconnectSocket();
    setAuthorizing(true);

    const ws = new WebSocket(DERIV_WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token.trim() }));
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as DerivMessage;
      const rawQuote = extractRawQuote(event.data);

      if (payload.error?.message) {
        pushNotice("error", payload.error.message);
        setAuthorizing(false);
        if (payload.msg_type === "authorize") {
          setDraft((current) => ({ ...current, tokenConnected: false }));
        }
        return;
      }

      if (payload.msg_type === "authorize") {
        setConnected(true);
        setAuthorizing(false);
        setBalance(payload.authorize?.balance ?? null);
        setCurrency(payload.authorize?.currency ?? "USD");
        setLoginId(payload.authorize?.loginid ?? "");
        setDraft((current) => ({
          ...current,
          tokenConnected: true,
          wizardStep: Math.max(current.wizardStep, 1)
        }));
        setShowWizard(true);
        pushNotice("success", "API token connected. AI assistant is ready.");
        return;
      }

      if (payload.msg_type === "tick" && payload.tick) {
        const nextTick = createTickQuote({
          symbol: payload.tick.symbol,
          quote: payload.tick.quote,
          display: rawQuote ?? String(payload.tick.quote),
          epoch: payload.tick.epoch
        });

        setTickMap((current) => ({
          ...current,
          [nextTick.symbol]: [...(current[nextTick.symbol] ?? []), nextTick].slice(-200000)
        }));
        return;
      }

      if (payload.msg_type === "proposal") {
        const pending = payload.req_id ? pendingProposalsRef.current[payload.req_id] : undefined;
        if (!pending || !payload.proposal?.id) {
          return;
        }

        if (payload.req_id) {
          delete pendingProposalsRef.current[payload.req_id];
        }

        ws.send(
          JSON.stringify({
            buy: payload.proposal.id,
            price: strategy.stake
          })
        );
        pushNotice("info", `Proposal ready for ${pending.market}. Sending buy request.`);
        return;
      }

      if (payload.msg_type === "buy") {
        const contractId = payload.buy?.contract_id;
        if (!contractId) {
          return;
        }

        setActiveContractCount((value) => value + 1);
        ws.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }));
        pushNotice("success", `Trade executed. Contract #${contractId} is now active.`);
        return;
      }

      if (payload.msg_type === "proposal_open_contract" && payload.proposal_open_contract) {
        const contract = payload.proposal_open_contract;

        if (contract.is_sold === 1 || contract.status === "won" || contract.status === "lost" || contract.status === "sold") {
          setActiveContractCount((value) => Math.max(0, value - 1));
          const profit = Number(contract.profit ?? 0);
          setSessionPL((value) => Number((value + profit).toFixed(2)));
          setBalance((value) => (value === null ? value : Number((value + profit).toFixed(2))));
          pushNotice(
            profit >= 0 ? "success" : "warning",
            `Contract ${contract.contract_id} ${profit >= 0 ? "won" : "closed at a loss"} ${Math.abs(profit).toFixed(2)} ${currency}.`
          );
        }
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setAuthorizing(false);
      if (draft.tokenConnected) {
        pushNotice("warning", "API connection closed.");
      }
    };

    ws.onerror = () => {
      pushNotice("error", "Connection error while reaching Deriv websocket.");
      setAuthorizing(false);
    };
  }

  async function callAssistant(name: string, payload: Record<string, unknown>) {
    const response = await fetch("/api/assistants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistant: name, ...payload })
    });

    return response.json();
  }

  async function runAssistantFlow() {
    setAssistantBusy(true);

    try {
      const builder = await callAssistant("STRATEGY_BUILDER_AI", { prompt: draft.prompt });
      const mergedModules = Array.isArray(builder.modules) ? sanitizeModules(builder.modules) : strategy.modules;

      const mergedStrategy: StrategyConfig = {
        markets: Array.isArray(builder.markets) && builder.markets.length ? sanitizeMarkets(builder.markets) : strategy.markets,
        modules: mergedModules.length ? mergedModules : strategy.modules,
        tickDuration: typeof builder.tickDuration === "number" ? builder.tickDuration : strategy.tickDuration,
        stake: typeof builder.stake === "number" ? builder.stake : strategy.stake,
        moneyManagement: builder.moneyManagement?.type
          ? {
              type: builder.moneyManagement.type as MoneyManagementType,
              baseStake:
                typeof builder.moneyManagement.baseStake === "number"
                  ? builder.moneyManagement.baseStake
                  : typeof builder.stake === "number"
                    ? builder.stake
                    : strategy.stake
            }
          : strategy.moneyManagement,
        stopLoss: typeof builder.stopLoss === "number" ? builder.stopLoss : strategy.stopLoss,
        takeProfit: typeof builder.takeProfit === "number" ? builder.takeProfit : strategy.takeProfit,
        confirmed: false
      };

      const validator = await callAssistant("STRATEGY_VALIDATOR_AI", {
        prompt: draft.prompt,
        strategy: mergedStrategy
      });
      const risk = await callAssistant("RISK_MANAGER_AI", {
        prompt: draft.prompt,
        strategy: mergedStrategy
      });
      const market = await callAssistant("MARKET_ANALYZER_AI", {
        prompt: draft.prompt,
        strategy: mergedStrategy,
        context: { scores: marketScores }
      });
      const execution = await callAssistant("EXECUTION_ASSISTANT_AI", {
        prompt: draft.prompt,
        strategy: mergedStrategy,
        context: { blockers: validator.issues ?? [] }
      });

      setDraft((current) => ({
        ...current,
        strategy: mergedStrategy,
        wizardStep: Math.max(current.wizardStep, 2)
      }));
      setAssistantOutputs({ builder, validator, risk, market, execution });

      if ((validator.issues as string[] | undefined)?.length) {
        pushNotice("warning", "Strategy assistant found issues that need correction before final confirmation.");
      } else {
        pushNotice("success", "Strategy parsed and saved. Review the next stage to finalize the session.");
      }
    } catch {
      pushNotice("error", "Assistant flow failed. Check model settings and try again.");
    } finally {
      setAssistantBusy(false);
    }
  }

  function executeTrade(market: string, module: StrategyConfig["modules"][number]) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      pushNotice("error", "API connection is not active.");
      setTradingActive(false);
      return;
    }

    const barrierCheck = validateBarrier(module.type, module.barrier);
    if (!barrierCheck.ok) {
      pushNotice("error", barrierCheck.message ?? "Invalid barrier.");
      setTradingActive(false);
      return;
    }

    const reqId = nextReqId();
    pendingProposalsRef.current[reqId] = { market, module };

    socketRef.current.send(
      JSON.stringify({
        proposal: 1,
        amount: strategy.stake,
        basis: "stake",
        contract_type: contractTypeToDeriv(module.type),
        currency,
        duration: strategy.tickDuration,
        duration_unit: "t",
        symbol: market,
        ...(typeof module.barrier === "number" ? { barrier: module.barrier } : {}),
        req_id: reqId
      })
    );
  }

  function confirmSessionSetup() {
    if (!validation.valid) {
      pushNotice("error", validation.issues.join(" "));
      return;
    }

    setDraft((current) => ({
      ...current,
      strategy: { ...current.strategy, confirmed: true },
      wizardStep: 3,
      wizardComplete: true
    }));
    setShowWizard(false);
    pushNotice("success", "Setup saved. You can now start trading from the compact console.");
  }

  const latestTicks = focusTicks.slice(-7);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="grid-bg absolute inset-0 opacity-30" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-4">
        <section className="glass-panel rounded-[30px] border p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-pulse/30 bg-pulse/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-pulse">
                Token First / Assistant Led / Mobile Ready
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                RISK TAKER DIGIT AI
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Users connect with their own Deriv token, complete a guided setup in fading stages, then operate from a clean live console with only core activity and override controls.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Account" value={loginId || "Not Connected"} accent="flare" />
              <StatCard label="Balance" value={balance === null ? "--" : `${currency} ${balance.toFixed(2)}`} accent="pulse" />
              <StatCard label="Status" value={tradingActive ? "Trading" : connected ? "Connected" : "Locked"} accent={tradingActive ? "gold" : connected ? "pulse" : "ember"} />
              <StatCard label="Open Trades" value={String(activeContractCount)} accent="gold" />
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="grid gap-4">
            <GlassCard
              icon={<Bot className="size-5" />}
              title="Strategy Snapshot"
              subtitle="Assistant-defined setup with quick override access"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryPill label="Markets" value={strategy.markets.join(", ")} />
                <SummaryPill label="Contracts" value={strategy.modules.map(formatModule).join(", ")} />
                <SummaryPill label="Ticks" value={`${strategy.tickDuration} ticks`} />
                <SummaryPill label="Money Management" value={strategy.moneyManagement?.type ?? "BASE_STAKE"} />
                <SummaryPill label="Stake" value={`${currency} ${strategy.stake.toFixed(2)}`} />
                <SummaryPill
                  label="Session Guards"
                  value={`SL ${strategy.stopLoss ?? "--"} / TP ${strategy.takeProfit ?? "--"}`}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <PrimaryButton onClick={() => setShowWizard(true)} icon={<Settings2 className="size-4" />}>
                  Edit Setup
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setDraft((current) => ({
                      ...current,
                      strategy: { ...current.strategy, confirmed: false },
                      wizardComplete: false,
                      wizardStep: 2
                    }));
                    setShowWizard(true);
                  }}
                >
                  Reconfirm
                </SecondaryButton>
              </div>
            </GlassCard>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
              <GlassCard
                icon={<Radar className="size-5" />}
                title="Live Signal Strip"
                subtitle="Last 7 real ticks with strict last-digit mapping"
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {latestTicks.length ? (
                    latestTicks.map((tick) => {
                      const hot = strategy.modules.some((module) =>
                        contractRegistry[module.type].entryCondition(tick.lastDigit, module.barrier)
                      );

                      return (
                      <div
                          key={`${tick.symbol}-${tick.epoch}`}
                          className={`rounded-3xl border px-4 py-3 ${
                            hot ? "border-pulse/40 bg-pulse/10" : "border-white/10 bg-black/15"
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{tick.symbol}</p>
                          <p className="mt-2 text-base text-slate-200">{tick.display}</p>
                          <p className={`mt-1 text-2xl font-semibold ${hot ? "text-pulse" : "text-white"}`}>
                            {tick.lastDigit}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="col-span-full text-sm text-slate-400">
                      Connect a valid token and allow the bot to subscribe to real ticks.
                    </p>
                  )}
                </div>

                <AnimatePresence>
                  {signalFlash ? (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      className="mt-4 rounded-3xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold"
                    >
                      READY {"->"} EXECUTING on {signalFlash.market} with {signalFlash.module} at digit {signalFlash.digit}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </GlassCard>

              <GlassCard
                icon={<Sparkles className="size-5" />}
                title="Digit Distribution"
                subtitle={`Last ${draft.distributionRange} ticks from the focused market`}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {distribution.map((item) => (
                    <div key={item.digit} className="rounded-3xl border border-white/10 bg-black/15 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Digit {item.digit}</p>
                      <p className="mt-2 text-xl font-semibold text-white">{item.percentage}%</p>
                      <div className="mt-2 h-2 rounded-full bg-white/5">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-pulse to-flare"
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{item.count} hits</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </section>

          <aside className="grid gap-4">
            <GlassCard
              icon={<Shield className="size-5" />}
              title="Best Market Analyzer"
              subtitle="Scores selected markets without predicting outcomes"
            >
              <div className="space-y-3">
                {marketScores.length ? (
                  marketScores.map((score) => (
                    <div key={score.symbol} className="rounded-3xl border border-white/10 bg-black/15 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{score.symbol}</p>
                        <p className="text-sm text-pulse">{score.score}%</p>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{score.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Market scores appear after the connection starts streaming ticks.</p>
                )}
              </div>
            </GlassCard>

            <GlassCard
              icon={<Siren className="size-5" />}
              title="Active Notifications"
              subtitle="Only live events and important overrides stay visible"
            >
              <div className="max-h-[420px] space-y-3 overflow-auto pr-1 scrollbar-thin">
                {notifications.length ? (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-3xl border p-4 text-sm ${
                        item.tone === "success"
                          ? "border-pulse/40 bg-pulse/10 text-pulse"
                          : item.tone === "warning"
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : item.tone === "error"
                              ? "border-ember/40 bg-ember/10 text-ember"
                              : "border-flare/40 bg-flare/10 text-sky-200"
                      }`}
                    >
                      {item.message}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No active notifications yet.</p>
                )}
              </div>
            </GlassCard>
          </aside>
        </div>

        <section className="glass-panel sticky bottom-4 z-30 rounded-[28px] border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Quick Overrides</p>
              <p className="mt-1 text-sm text-slate-200">
                {strategy.confirmed ? "Session confirmed." : "Session not confirmed yet."} Stake {currency} {strategy.stake.toFixed(2)} | SL {strategy.stopLoss ?? "--"} | TP {strategy.takeProfit ?? "--"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <PrimaryButton
                onClick={() => {
                  if (!strategy.confirmed) {
                    setShowWizard(true);
                    pushNotice("warning", "Finish the confirmation stages before starting.");
                    return;
                  }

                  if (!connected) {
                    setShowWizard(true);
                    pushNotice("warning", "Connect a valid token before starting.");
                    return;
                  }

                  if (!validation.valid) {
                    pushNotice("error", validation.issues.join(" "));
                    return;
                  }

                  setTradingActive((value) => !value);
                }}
                icon={tradingActive ? <StopCircle className="size-4" /> : <Play className="size-4" />}
              >
                {tradingActive ? "Stop Trading" : "Start Trading"}
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowWizard(true)} icon={<Settings2 className="size-4" />}>
                Open Setup
              </SecondaryButton>
              <SecondaryButton
                onClick={() => {
                  if (connected) {
                    disconnectSocket();
                    setDraft((current) => ({ ...current, tokenConnected: false, wizardComplete: false }));
                  } else {
                    setShowWizard(true);
                  }
                }}
                icon={<Power className="size-4" />}
              >
                {connected ? "Disconnect" : "Connect"}
              </SecondaryButton>
            </div>
          </div>
        </section>

        <footer className="rounded-[28px] border border-white/10 bg-black/20 p-5 text-sm leading-6 text-slate-300 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Risk Disclaimer</p>
          <p className="mt-3">
            Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products.
          </p>
          <p className="mt-3">You may lose some or all of the money you invest in the trade.</p>
          <p>If your trade involves currency conversion, exchange rates will affect your profit and loss.</p>
          <p>You should never trade with borrowed money or with money that you cannot afford to lose.</p>
        </footer>
      </div>

      <AnimatePresence>
        {showWizard ? (
          <WizardModal
            draft={draft}
            assistantOutputs={assistantOutputs}
            assistantBusy={assistantBusy}
            connected={connected}
            authorizing={authorizing}
            validation={validation}
            onClose={() => {
              if (draft.wizardComplete) {
                setShowWizard(false);
              }
            }}
            onPromptChange={(value) => setDraft((current) => ({ ...current, prompt: value }))}
            onTokenChange={(value) => setDraft((current) => ({ ...current, token: value }))}
            onConnect={() => {
              setDraft((current) => ({ ...current, tokenConnected: true }));
            }}
            onCompose={runAssistantFlow}
            onStepChange={persistStep}
            onDistributionChange={(value) =>
              setDraft((current) => ({
                ...current,
                distributionRange: Math.max(20, Math.min(200000, value))
              }))
            }
            onStrategyChange={(next) =>
              setDraft((current) => ({
                ...current,
                strategy: typeof next === "function" ? next(current.strategy) : next
              }))
            }
            onConfirm={confirmSessionSetup}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function WizardModal({
  draft,
  assistantOutputs,
  assistantBusy,
  connected,
  authorizing,
  validation,
  onClose,
  onTokenChange,
  onPromptChange,
  onConnect,
  onCompose,
  onStepChange,
  onDistributionChange,
  onStrategyChange,
  onConfirm
}: {
  draft: SetupDraft;
  assistantOutputs: AssistantOutputs;
  assistantBusy: boolean;
  connected: boolean;
  authorizing: boolean;
  validation: ReturnType<typeof validateStrategyConfig>;
  onClose: () => void;
  onTokenChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onConnect: () => void;
  onCompose: () => void;
  onStepChange: (step: number) => void;
  onDistributionChange: (value: number) => void;
  onStrategyChange: (next: StrategyConfig | ((current: StrategyConfig) => StrategyConfig)) => void;
  onConfirm: () => void;
}) {
  const step = draft.wizardStep;
  const strategy = draft.strategy;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        className="glass-panel w-full max-w-4xl rounded-[32px] border p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-pulse">Guided Setup</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">One clean flow, then a compact trading console</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["API", "Assistant", "Session", "Confirm"].map((label, index) => {
              const active = index === step;
              const done = index < step || (draft.wizardComplete && index <= 3);

              return (
                <div
                  key={label}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    active ? "bg-pulse text-slate-950" : done ? "bg-pulse/10 text-pulse" : "bg-white/5 text-slate-400"
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <WizardPane
                key="api"
                icon={<KeyRound className="size-6 text-pulse" />}
                title="Connect Deriv token"
                description="The user enters the API token once here. It is saved locally in the browser so the final bot screen stays clean."
              >
                <div className="grid gap-4">
                  <label className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <span className="text-xs uppercase tracking-[0.24em] text-slate-400">API Token</span>
                    <input
                      type="password"
                      value={draft.token}
                      onChange={(event) => onTokenChange(event.target.value)}
                      className="mt-3 w-full bg-transparent text-white outline-none"
                      placeholder="Paste Deriv API token"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <PrimaryButton onClick={onConnect} disabled={!draft.token.trim() || authorizing} icon={authorizing ? <LoaderCircle className="size-4 animate-spin" /> : <Power className="size-4" />}>
                      {connected ? "Connected" : authorizing ? "Connecting..." : "Connect Token"}
                    </PrimaryButton>
                    {connected ? (
                      <SecondaryButton onClick={() => onStepChange(1)} icon={<ChevronRight className="size-4" />}>
                        Continue
                      </SecondaryButton>
                    ) : null}
                  </div>
                </div>
              </WizardPane>
            ) : null}

            {step === 1 ? (
              <WizardPane
                key="assistant"
                icon={<Bot className="size-6 text-pulse" />}
                title="Let the AI build the strategy"
                description="After token connection, the assistant fades in and translates the user's idea into structured modules, barriers, stake, ticks, and session rules."
              >
                <div className="grid gap-4">
                  <textarea
                    value={draft.prompt}
                    onChange={(event) => onPromptChange(event.target.value)}
                    className="min-h-40 rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                    placeholder="Example: Trade differs from 5 and over 7 on R_10 with 5 ticks, stake 1, martingale, stop loss 10, take profit 20."
                  />

                  <div className="flex flex-wrap gap-3">
                    <PrimaryButton onClick={onCompose} disabled={assistantBusy} icon={assistantBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}>
                      {assistantBusy ? "Composing..." : "Build Strategy"}
                    </PrimaryButton>
                    <SecondaryButton onClick={() => onStepChange(2)} icon={<ChevronRight className="size-4" />}>
                      Continue
                    </SecondaryButton>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniAssistantCard
                      title="Builder"
                      lines={(assistantOutputs.builder?.notes as string[]) ?? ["Assistant output will appear here."]}
                    />
                    <MiniAssistantCard
                      title="Validator"
                      lines={
                        ((assistantOutputs.validator?.issues as string[] | undefined)?.length
                          ? (assistantOutputs.validator?.issues as string[])
                          : ["No blocking validation issues reported"]) ?? []
                      }
                      tone={(assistantOutputs.validator?.valid as boolean) === false ? "warning" : "success"}
                    />
                    <MiniAssistantCard
                      title="Risk"
                      lines={(assistantOutputs.risk?.recommendations as string[]) ?? ["Risk guidance will appear here."]}
                    />
                    <MiniAssistantCard
                      title="Execution"
                      lines={(assistantOutputs.execution?.summaryLines as string[]) ?? ["Execution summary will appear here."]}
                    />
                  </div>
                </div>
              </WizardPane>
            ) : null}

            {step === 2 ? (
              <WizardPane
                key="session"
                icon={<Settings2 className="size-6 text-pulse" />}
                title="Finalize session inputs"
                description="This stage keeps overrides in one place. Once confirmed, these controls collapse into the background and the bot stays neat."
              >
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Stake" value={strategy.stake} type="number" onChange={(value) => onStrategyChange((current) => ({
                      ...current,
                      stake: Number(value) || 0,
                      moneyManagement: current.moneyManagement ? { ...current.moneyManagement, baseStake: Number(value) || 0 } : current.moneyManagement
                    }))} />
                    <Field label="Stop Loss" value={strategy.stopLoss ?? ""} type="number" onChange={(value) => onStrategyChange((current) => ({ ...current, stopLoss: Number(value) || undefined }))} />
                    <Field label="Take Profit" value={strategy.takeProfit ?? ""} type="number" onChange={(value) => onStrategyChange((current) => ({ ...current, takeProfit: Number(value) || undefined }))} />
                    <Field label="Ticks (1-20)" value={strategy.tickDuration} type="number" onChange={(value) => onStrategyChange((current) => ({ ...current, tickDuration: Math.max(1, Math.min(20, Number(value) || 1)) }))} />
                    <SelectField
                      label="Money Management"
                      value={strategy.moneyManagement?.type ?? "BASE_STAKE"}
                      options={MONEY_MANAGEMENT_OPTIONS}
                      onChange={(value) => onStrategyChange((current) => ({
                        ...current,
                        moneyManagement: {
                          type: value as MoneyManagementType,
                          baseStake: current.stake
                        }
                      }))}
                    />
                    <Field label="Distribution Range" value={draft.distributionRange} type="number" onChange={(value) => onDistributionChange(Number(value) || 20)} />
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Markets</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {MARKETS.map((market) => {
                          const active = strategy.markets.includes(market);
                          return (
                            <button
                              key={market}
                              onClick={() =>
                                onStrategyChange((current) => ({
                                  ...current,
                                  markets: active
                                    ? current.markets.filter((entry) => entry !== market)
                                    : [...current.markets, market]
                                }))
                              }
                              className={`rounded-full px-3 py-1.5 text-xs ${
                                active ? "bg-flare text-white" : "bg-white/5 text-slate-300"
                              }`}
                            >
                              {market}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {strategy.modules.map((module, index) => {
                      const requiresBarrier = contractRegistry[module.type].requiresBarrier;
                      const barrierState = validateBarrier(module.type, module.barrier);

                      return (
                        <div key={`${module.type}-${index}`} className="rounded-3xl border border-white/10 bg-black/15 p-4">
                          <p className="text-sm font-medium text-white">{contractRegistry[module.type].label}</p>
                          <p className="mt-1 text-xs text-slate-400">{requiresBarrier ? "Barrier required" : "No barrier required"}</p>
                          {requiresBarrier ? (
                            <label className="mt-3 block rounded-2xl border border-white/10 bg-black/20 p-3">
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Barrier</span>
                              <input
                                type="number"
                                value={module.barrier ?? ""}
                                onChange={(event) =>
                                  onStrategyChange((current) => ({
                                    ...current,
                                    modules: current.modules.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, barrier: Number(event.target.value) }
                                        : entry
                                    )
                                  }))
                                }
                                className="mt-2 w-full bg-transparent text-white outline-none"
                              />
                            </label>
                          ) : null}
                          {!barrierState.ok ? <p className="mt-3 text-xs text-ember">{barrierState.message}</p> : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <SecondaryButton onClick={() => onStepChange(1)}>Back</SecondaryButton>
                    <PrimaryButton onClick={() => onStepChange(3)} icon={<ChevronRight className="size-4" />}>
                      Continue
                    </PrimaryButton>
                  </div>
                </div>
              </WizardPane>
            ) : null}

            {step === 3 ? (
              <WizardPane
                key="confirm"
                icon={<CheckCircle2 className="size-6 text-pulse" />}
                title="Confirm and collapse setup"
                description="After this final confirmation, the bot keeps only essential live activity on screen and saves the setup in the background."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryPill label="Markets" value={strategy.markets.join(", ")} />
                  <SummaryPill label="Contracts" value={strategy.modules.map(formatModule).join(", ")} />
                  <SummaryPill label="Ticks" value={`${strategy.tickDuration} ticks`} />
                  <SummaryPill label="Stake" value={String(strategy.stake)} />
                  <SummaryPill label="Money Management" value={strategy.moneyManagement?.type ?? "BASE_STAKE"} />
                  <SummaryPill label="Session Guards" value={`SL ${strategy.stopLoss ?? "--"} / TP ${strategy.takeProfit ?? "--"}`} />
                </div>

                {!validation.valid ? (
                  <div className="mt-4 rounded-3xl border border-ember/40 bg-ember/10 p-4 text-sm text-ember">
                    {validation.issues.join(" ")}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <SecondaryButton onClick={() => onStepChange(2)}>Back</SecondaryButton>
                  <PrimaryButton onClick={onConfirm} disabled={!connected || !validation.valid} icon={<CheckCircle2 className="size-4" />}>
                    Finish Setup
                  </PrimaryButton>
                  {draft.wizardComplete ? <SecondaryButton onClick={onClose}>Close</SecondaryButton> : null}
                </div>
              </WizardPane>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WizardPane({
  icon,
  title,
  description,
  children
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">{icon}</div>
        <div>
          <h3 className="text-2xl font-semibold text-white">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </motion.div>
  );
}

function GlassCard({
  icon,
  title,
  subtitle,
  children
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel rounded-[28px] border p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-pulse">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent: "pulse" | "flare" | "gold" | "ember";
}) {
  const accentClass =
    accent === "pulse"
      ? "text-pulse"
      : accent === "flare"
        ? "text-flare"
        : accent === "gold"
          ? "text-gold"
          : "text-ember";

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-base font-semibold sm:text-lg ${accentClass}`}>{value}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  icon,
  disabled = false
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pulse to-flare px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  icon
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
    >
      {icon}
      {children}
    </button>
  );
}

function MiniAssistantCard({
  title,
  lines,
  tone = "default"
}: {
  title: string;
  lines: string[];
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div
      className={`rounded-3xl border p-4 ${
        tone === "success"
          ? "border-pulse/40 bg-pulse/10"
          : tone === "warning"
            ? "border-gold/40 bg-gold/10"
            : "border-white/10 bg-black/15"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-200">
        {lines.slice(0, 4).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type: string;
}) {
  return (
    <label className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full bg-transparent text-base text-white outline-none"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-3 w-full bg-transparent text-base text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-slate-950">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function sanitizeMarkets(input: string[]) {
  const normalized = input.map((entry) => entry.toUpperCase());
  return normalized.filter((entry, index) => MARKETS.includes(entry) && normalized.indexOf(entry) === index);
}

function sanitizeModules(input: Array<{ type: string; barrier?: number }>): StrategyConfig["modules"] {
  return input
    .map((entry) => ({
      type: entry.type as ContractType,
      barrier: typeof entry.barrier === "number" ? entry.barrier : undefined
    }))
    .filter((entry) => entry.type in contractRegistry);
}

function contractTypeToDeriv(type: ContractType) {
  switch (type) {
    case "DIGIT_MATCH":
      return "DIGITMATCH";
    case "DIGIT_DIFFERS":
      return "DIGITDIFF";
    case "DIGIT_OVER":
      return "DIGITOVER";
    case "DIGIT_UNDER":
      return "DIGITUNDER";
    case "DIGIT_EVEN":
      return "DIGITEVEN";
    case "DIGIT_ODD":
      return "DIGITODD";
  }
}

function extractRawQuote(message: string) {
  const match = message.match(/"quote"\s*:\s*([0-9.]+)/);
  return match?.[1];
}
