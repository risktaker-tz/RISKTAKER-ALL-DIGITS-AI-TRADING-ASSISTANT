"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  Play,
  Power,
  Radar,
  Shield,
  StopCircle,
  TrendingUp
} from "lucide-react";
import { contractRegistry } from "@/lib/domain/contracts";
import { chooseBestMarket, scoreMarket, type MarketScore } from "@/lib/domain/market-analyzer";
import { buildDigitDistribution, extractLastDigit, type TickQuote } from "@/lib/domain/ticks";
import { validateStrategyConfig, type StrategyConfig } from "@/lib/domain/strategy";

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

const markets = ["R_10", "R_25", "R_50", "R_75", "R_100"];

const defaultPrompt =
  "Analyze R_10 and R_25. Trade differs from 5 and over 7 with 5 ticks, stake 2, martingale, stop loss 20, take profit 35.";

const defaultStrategy: StrategyConfig = {
  markets: ["R_10", "R_25"],
  modules: [
    { type: "DIGIT_DIFFERS", barrier: 5 },
    { type: "DIGIT_OVER", barrier: 7 }
  ],
  tickDuration: 5,
  stake: 2,
  moneyManagement: {
    type: "MARTINGALE",
    baseStake: 2
  },
  stopLoss: 20,
  takeProfit: 35,
  confirmed: false
};

function formatModule(module: StrategyConfig["modules"][number]) {
  return `${contractRegistry[module.type].label}${typeof module.barrier === "number" ? ` ${module.barrier}` : ""}`;
}

function cardTitle(icon: React.ReactNode, label: string, detail?: string) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-pulse">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">{label}</h2>
          {detail ? <p className="text-xs text-slate-400">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [strategy, setStrategy] = useState<StrategyConfig>(defaultStrategy);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [assistantOutputs, setAssistantOutputs] = useState<AssistantOutputs>({});
  const [connected, setConnected] = useState(false);
  const [tradingActive, setTradingActive] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionPL, setSessionPL] = useState(0);
  const [balance, setBalance] = useState(1000);
  const [distributionRange, setDistributionRange] = useState(1000);
  const [tickMap, setTickMap] = useState<Record<string, TickQuote[]>>({});
  const [signalFlash, setSignalFlash] = useState<{ market: string; module: string; digit: number } | null>(null);
  const [marketScores, setMarketScores] = useState<MarketScore[]>([]);
  const [busy, setBusy] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const lastExecutionRef = useRef<number>(0);

  const validation = useMemo(() => validateStrategyConfig(strategy), [strategy]);

  const bestMarket = useMemo(() => chooseBestMarket(marketScores), [marketScores]);

  const currentDistribution = useMemo(() => {
    const focus = bestMarket?.symbol ?? strategy.markets[0];
    return focus ? buildDigitDistribution((tickMap[focus] ?? []).slice(-distributionRange)) : [];
  }, [bestMarket?.symbol, distributionRange, strategy.markets, tickMap]);

  useEffect(() => {
    if (!connected) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
    socketRef.current = ws;

    ws.onopen = () => {
      strategy.markets.forEach((market) => {
        ws.send(JSON.stringify({ ticks: market, subscribe: 1 }));
      });
      pushNotice("success", "Live tick feed connected.");
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { msg_type?: string; tick?: { quote: number; epoch: number; symbol: string } };

      if (payload.msg_type === "tick" && payload.tick) {
        setTickMap((current) => {
          const nextTick: TickQuote = {
            symbol: payload.tick!.symbol,
            quote: payload.tick!.quote,
            epoch: payload.tick!.epoch
          };

          const history = [...(current[nextTick.symbol] ?? []), nextTick].slice(-200000);
          return { ...current, [nextTick.symbol]: history };
        });
      }
    };

    ws.onerror = () => {
      pushNotice("error", "Market websocket error.");
    };

    ws.onclose = () => {
      setConnected(false);
      pushNotice("warning", "Live tick feed disconnected.");
    };

    return () => ws.close();
  }, [connected, strategy.markets]);

  useEffect(() => {
    const scores = strategy.markets
      .map((market) => {
        const ticks = tickMap[market] ?? [];
        if (!ticks.length) return null;
        return scoreMarket(market, ticks.slice(-Math.max(20, strategy.tickDuration * 10)), strategy.modules);
      })
      .filter((entry): entry is MarketScore => Boolean(entry));

    setMarketScores(scores);
  }, [strategy.markets, strategy.modules, strategy.tickDuration, tickMap]);

  useEffect(() => {
    if (!tradingActive || !strategy.confirmed || !bestMarket) {
      return;
    }

    const recentTicks = tickMap[bestMarket.symbol] ?? [];
    const latest = recentTicks.at(-1);

    if (!latest) {
      return;
    }

    const lastDigit = extractLastDigit(latest.quote);
    const readyModules = strategy.modules.filter((module) =>
      contractRegistry[module.type].entryCondition(lastDigit, module.barrier)
    );

    if (!readyModules.length) {
      return;
    }

    const now = Date.now();
    if (now - lastExecutionRef.current < 4000) {
      return;
    }

    lastExecutionRef.current = now;
    const ready = readyModules[0];
    setSignalFlash({ market: bestMarket.symbol, module: formatModule(ready), digit: lastDigit });
    void executeTrade(bestMarket.symbol, ready);
  }, [bestMarket, strategy, tickMap, tradingActive]);

  useEffect(() => {
    if (!signalFlash) return;
    const timer = setTimeout(() => setSignalFlash(null), 2200);
    return () => clearTimeout(timer);
  }, [signalFlash]);

  function pushNotice(tone: NotificationItem["tone"], message: string) {
    setNotifications((current) => [{ id: crypto.randomUUID(), tone, message }, ...current].slice(0, 8));
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
    setBusy(true);

    try {
      const builder = await callAssistant("STRATEGY_BUILDER_AI", { prompt });
      const mergedStrategy: StrategyConfig = {
        markets: builder.markets?.length ? builder.markets : strategy.markets,
        modules: builder.modules?.length ? builder.modules : strategy.modules,
        tickDuration: builder.tickDuration ?? strategy.tickDuration,
        stake: builder.stake ?? strategy.stake,
        moneyManagement: builder.moneyManagement?.type
          ? {
              type: builder.moneyManagement.type,
              baseStake: builder.moneyManagement.baseStake ?? builder.stake ?? strategy.stake
            }
          : strategy.moneyManagement,
        stopLoss: builder.stopLoss ?? strategy.stopLoss,
        takeProfit: builder.takeProfit ?? strategy.takeProfit,
        confirmed: false
      };

      setStrategy(mergedStrategy);

      const validator = await callAssistant("STRATEGY_VALIDATOR_AI", { prompt, strategy: mergedStrategy });
      const risk = await callAssistant("RISK_MANAGER_AI", { prompt, strategy: mergedStrategy });
      const market = await callAssistant("MARKET_ANALYZER_AI", {
        prompt,
        strategy: mergedStrategy,
        context: { scores: marketScores }
      });
      const execution = await callAssistant("EXECUTION_ASSISTANT_AI", {
        prompt,
        strategy: mergedStrategy,
        context: { blockers: validator.issues ?? [] }
      });

      setAssistantOutputs({ builder, validator, risk, market, execution });

      if ((validator.issues ?? []).length) {
        pushNotice("warning", "Validation found setup issues that must be fixed before execution.");
      } else {
        pushNotice("success", "Assistant flow completed. Review the setup and confirm.");
      }
    } catch {
      pushNotice("error", "Assistant flow failed. Check provider settings or use manual editing.");
    } finally {
      setBusy(false);
    }
  }

  async function executeTrade(market: string, module: StrategyConfig["modules"][number]) {
    const response = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...strategy,
        markets: [market],
        modules: [module],
        confirmed: strategy.confirmed
      })
    });

    const result = await response.json();

    if (!response.ok) {
      pushNotice("error", (result.issues ?? ["Execution blocked."]).join(" "));
      setTradingActive(false);
      return;
    }

    pushNotice(
      "info",
      `${module.type} on ${market} prepared. ${result.message}`
    );
  }

  return (
    <main className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid-bg absolute inset-0 opacity-30" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[28px] border p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex rounded-full border border-pulse/30 bg-pulse/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-pulse">
                AI Configurator / Real Tick Engine
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                RISK TAKER DIGIT AI
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Prebuilt digit modules, strict barrier validation, assistant-backed strategy composition, and a guarded confirmation flow before any execution request.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Live Balance" value={`$${balance.toFixed(2)}`} accent="pulse" />
              <MetricCard label="Active Stake" value={`$${strategy.stake.toFixed(2)}`} accent="flare" />
              <MetricCard label="Session P/L" value={`${sessionPL >= 0 ? "+" : ""}$${sessionPL.toFixed(2)}`} accent={sessionPL >= 0 ? "pulse" : "ember"} />
              <MetricCard label="Best Market" value={bestMarket?.symbol ?? "Waiting"} accent="gold" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="grid gap-6">
            <Panel>
              {cardTitle(<Bot className="size-5" />, "Assistant Panel", "Natural language to structured config")}
              <div className="mt-5 grid gap-4">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="min-h-36 w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-100 outline-none transition focus:border-pulse/60"
                  placeholder="Example: Trade differs from 5 on R_10 with 5 ticks and stake 2"
                />

                <div className="flex flex-wrap gap-3">
                  <ActionButton onClick={runAssistantFlow} busy={busy} icon={<Cpu className="size-4" />}>
                    Build Strategy
                  </ActionButton>
                  <GhostButton onClick={() => setPrompt(defaultPrompt)}>Load Demo Prompt</GhostButton>
                  <GhostButton onClick={() => setShowConfirmation(true)}>Review Confirmation</GhostButton>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <AssistantCard title="Builder" lines={(assistantOutputs.builder?.notes as string[]) ?? ["Awaiting parse"]} />
                  <AssistantCard
                    title="Validator"
                    lines={
                      ((assistantOutputs.validator?.issues as string[])?.length
                        ? (assistantOutputs.validator?.issues as string[])
                        : ["No validation issues reported"]) ?? []
                    }
                    tone={(assistantOutputs.validator?.valid as boolean) === false ? "warning" : "success"}
                  />
                  <AssistantCard title="Risk Manager" lines={(assistantOutputs.risk?.recommendations as string[]) ?? ["Awaiting risk guidance"]} />
                  <AssistantCard title="Execution Assistant" lines={(assistantOutputs.execution?.summaryLines as string[]) ?? ["Awaiting summary"]} />
                </div>
              </div>
            </Panel>

            <Panel>
              {cardTitle(<Shield className="size-5" />, "Control Panel", "Execution stays locked until confirmation")}
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <LabeledInput
                  label="Stake"
                  value={strategy.stake}
                  onChange={(value) => setStrategy((current) => ({ ...current, stake: Number(value) || 0, moneyManagement: current.moneyManagement ? { ...current.moneyManagement, baseStake: Number(value) || 0 } : current.moneyManagement }))}
                  type="number"
                />
                <LabeledInput
                  label="Stop Loss"
                  value={strategy.stopLoss ?? ""}
                  onChange={(value) => setStrategy((current) => ({ ...current, stopLoss: Number(value) || undefined }))}
                  type="number"
                />
                <LabeledInput
                  label="Take Profit"
                  value={strategy.takeProfit ?? ""}
                  onChange={(value) => setStrategy((current) => ({ ...current, takeProfit: Number(value) || undefined }))}
                  type="number"
                />
                <LabeledInput
                  label="Ticks (1-20)"
                  value={strategy.tickDuration}
                  onChange={(value) => setStrategy((current) => ({ ...current, tickDuration: Math.min(20, Math.max(1, Number(value) || 1)) }))}
                  type="number"
                />
                <SelectField
                  label="Money Management"
                  value={strategy.moneyManagement?.type ?? "BASE_STAKE"}
                  onChange={(value) =>
                    setStrategy((current) => ({
                      ...current,
                      moneyManagement: {
                        type: value as NonNullable<StrategyConfig["moneyManagement"]>["type"],
                        baseStake: current.stake
                      }
                    }))
                  }
                  options={[
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
                  ]}
                />
                <LabeledInput
                  label="Distribution Range"
                  value={distributionRange}
                  onChange={(value) => setDistributionRange(Math.min(200000, Math.max(20, Number(value) || 20)))}
                  type="number"
                />
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Markets</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {markets.map((market) => {
                      const active = strategy.markets.includes(market);
                      return (
                        <button
                          key={market}
                          onClick={() =>
                            setStrategy((current) => ({
                              ...current,
                              markets: active
                                ? current.markets.filter((entry) => entry !== market)
                                : [...current.markets, market]
                            }))
                          }
                          className={`rounded-full px-3 py-1.5 text-xs transition ${active ? "bg-flare text-white" : "bg-white/5 text-slate-300"}`}
                        >
                          {market}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Modules</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {strategy.modules.map((module) => (
                      <span key={`${module.type}-${module.barrier}`} className="rounded-full bg-pulse/10 px-3 py-1.5 text-xs text-pulse">
                        {formatModule(module)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => setConnected((value) => !value)}
                  icon={<Power className="size-4" />}
                  tone={connected ? "danger" : "primary"}
                >
                  {connected ? "Disconnect API" : "Connect API"}
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    if (!strategy.confirmed) {
                      setShowConfirmation(true);
                      pushNotice("warning", "Confirm your setup before starting trading.");
                      return;
                    }
                    if (!validation.valid) {
                      pushNotice("error", validation.issues.join(" "));
                      return;
                    }
                    setTradingActive((value) => !value);
                  }}
                  icon={tradingActive ? <StopCircle className="size-4" /> : <Play className="size-4" />}
                  tone={tradingActive ? "danger" : "primary"}
                >
                  {tradingActive ? "Stop Trading" : "Start Trading"}
                </ActionButton>
                <GhostButton onClick={() => setNotifications([])}>Clear Logs</GhostButton>
              </div>
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel>
                {cardTitle(<Radar className="size-5" />, "Signal Overlay", "Live 7 ticks, readiness highlights")}
                <div className="mt-5 grid gap-3">
                  {(bestMarket ? (tickMap[bestMarket.symbol] ?? []).slice(-7) : []).map((tick) => {
                    const digit = extractLastDigit(tick.quote);
                    const hot = strategy.modules.some((module) =>
                      contractRegistry[module.type].entryCondition(digit, module.barrier)
                    );
                    return (
                      <div
                        key={tick.epoch}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${hot ? "border-pulse/50 bg-pulse/10" : "border-white/10 bg-black/15"}`}
                      >
                        <span className="text-sm text-slate-200">{tick.quote.toFixed(5)}</span>
                        <span className={`text-lg font-semibold ${hot ? "text-pulse" : "text-slate-300"}`}>{digit}</span>
                      </div>
                    );
                  })}

                  <AnimatePresence>
                    {signalFlash ? (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -18 }}
                        className="rounded-3xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold"
                      >
                        READY -> EXECUTING on {signalFlash.market} with {signalFlash.module} at digit {signalFlash.digit}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </Panel>

              <Panel>
                {cardTitle(<TrendingUp className="size-5" />, "Distribution Overlay", "Digit frequency across live range")}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {currentDistribution.map((item) => (
                    <div key={item.digit} className="rounded-3xl border border-white/10 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Digit {item.digit}</p>
                      <p className="mt-2 text-xl font-semibold text-white">{item.percentage}%</p>
                      <p className="text-xs text-slate-400">{item.count} ticks</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </section>

          <aside className="grid gap-6">
            <Panel>
              {cardTitle(<CircleDollarSign className="size-5" />, "Account Panel", "Always-on session context")}
              <div className="mt-5 grid gap-3">
                <SummaryRow label="Balance" value={`$${balance.toFixed(2)}`} />
                <SummaryRow label="Active Stake" value={`$${strategy.stake.toFixed(2)}`} />
                <SummaryRow label="Strategy" value={strategy.modules.map(formatModule).join(", ")} />
                <SummaryRow label="Markets" value={strategy.markets.join(", ")} />
                <SummaryRow label="Session P/L" value={`${sessionPL >= 0 ? "+" : ""}$${sessionPL.toFixed(2)}`} />
                <SummaryRow label="Status" value={tradingActive ? "Trading Active" : "Idle"} />
              </div>
            </Panel>

            <Panel>
              {cardTitle(<Cpu className="size-5" />, "Multi-Market Analyzer", "Scores all selected markets")}
              <div className="mt-5 space-y-3">
                {marketScores.length ? (
                  marketScores.map((score) => (
                    <div key={score.symbol} className="rounded-3xl border border-white/10 bg-black/15 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white">{score.symbol}</p>
                        <p className="text-sm text-pulse">{score.score}%</p>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{score.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Connect the live tick feed to score markets.</p>
                )}
              </div>
            </Panel>

            <Panel>
              {cardTitle(<AlertTriangle className="size-5" />, "Notifications", "Execution, MM, and validation events")}
              <div className="mt-5 max-h-[360px] space-y-3 overflow-auto pr-1 scrollbar-thin">
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
                  <p className="text-sm text-slate-400">No notifications yet.</p>
                )}
              </div>
            </Panel>
          </aside>
        </div>
      </div>

      <footer className="relative mx-auto mt-8 max-w-7xl rounded-[28px] border border-white/10 bg-black/20 p-5 text-sm leading-6 text-slate-300 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">Risk Disclaimer</p>
        <p className="mt-3">
          Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products.
        </p>
        <p className="mt-3">You may lose some or all of the money you invest in the trade.</p>
        <p>If your trade involves currency conversion, exchange rates will affect your profit and loss.</p>
        <p>You should never trade with borrowed money or with money that you cannot afford to lose.</p>
      </footer>

      <AnimatePresence>
        {showConfirmation ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="glass-panel w-full max-w-2xl rounded-[28px] border p-6"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-6 text-pulse" />
                <div>
                  <h3 className="text-2xl font-semibold text-white">Confirm your setup</h3>
                  <p className="text-sm text-slate-400">Execution remains blocked until you confirm.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <SummaryTile label="Markets" value={strategy.markets.join(", ")} />
                <SummaryTile label="Contract Types" value={strategy.modules.map((module) => contractRegistry[module.type].label).join(", ")} />
                <SummaryTile label="Barriers" value={strategy.modules.map((module) => `${module.type}: ${module.barrier ?? "N/A"}`).join(" | ")} />
                <SummaryTile label="Tick Duration" value={`${strategy.tickDuration} ticks`} />
                <SummaryTile label="Stake" value={`$${strategy.stake.toFixed(2)}`} />
                <SummaryTile label="Money Management" value={strategy.moneyManagement?.type ?? "BASE_STAKE"} />
                <SummaryTile label="Stop Loss" value={strategy.stopLoss ? `$${strategy.stopLoss}` : "Not set"} />
                <SummaryTile label="Take Profit" value={strategy.takeProfit ? `$${strategy.takeProfit}` : "Not set"} />
              </div>

              {!validation.valid ? (
                <div className="mt-5 rounded-3xl border border-ember/40 bg-ember/10 p-4 text-sm text-ember">
                  {validation.issues.join(" ")}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => {
                    if (!validation.valid) {
                      pushNotice("error", validation.issues.join(" "));
                      return;
                    }
                    setStrategy((current) => ({ ...current, confirmed: true }));
                    setShowConfirmation(false);
                    pushNotice("success", "Setup confirmed. Trading can now be started.");
                  }}
                  icon={<CheckCircle2 className="size-4" />}
                >
                  YES - START
                </ActionButton>
                <GhostButton
                  onClick={() => {
                    setStrategy((current) => ({ ...current, confirmed: false }));
                    setShowConfirmation(false);
                  }}
                >
                  EDIT
                </GhostButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="glass-panel rounded-[28px] border p-5 sm:p-6">{children}</section>;
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: "pulse" | "flare" | "ember" | "gold" }) {
  const accentClass =
    accent === "pulse"
      ? "text-pulse"
      : accent === "flare"
        ? "text-flare"
        : accent === "ember"
          ? "text-ember"
          : "text-gold";

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  icon,
  tone = "primary",
  busy = false
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  tone?: "primary" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
        tone === "danger"
          ? "bg-ember text-white hover:bg-rose-500"
          : "bg-gradient-to-r from-pulse to-flare text-slate-950 hover:opacity-90"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {icon}
      {busy ? "Working..." : children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function LabeledInput({
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

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-3 w-full bg-transparent text-base text-white outline-none">
        {options.map((option) => (
          <option key={option} value={option} className="bg-slate-950">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssistantCard({ title, lines, tone = "default" }: { title: string; lines: string[]; tone?: "default" | "success" | "warning" }) {
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-white">{value}</span>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
