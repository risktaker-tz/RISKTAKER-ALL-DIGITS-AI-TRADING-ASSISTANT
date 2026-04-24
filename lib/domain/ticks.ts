export type TickQuote = {
  symbol: string;
  quote: number;
  display: string;
  epoch: number;
  lastDigit: number;
};

export function extractLastDigit(quote: number | string): number {
  const raw = String(quote).trim();
  const numeric = raw.replace(/[^0-9.]/g, "");
  const parts = numeric.split(".");
  const fraction = parts[1] ?? "";
  const source = fraction || parts[0] || "0";
  const digit = source.replace(/\D/g, "").slice(-1) || "0";
  return Number(digit);
}

export function createTickQuote(args: {
  symbol: string;
  quote: number;
  display?: string;
  epoch: number;
}): TickQuote {
  const display = args.display ?? String(args.quote);

  return {
    symbol: args.symbol,
    quote: args.quote,
    display,
    epoch: args.epoch,
    lastDigit: extractLastDigit(display)
  };
}

export function buildDigitDistribution(ticks: TickQuote[]) {
  const totals = Array.from({ length: 10 }, (_, digit) => ({
    digit,
    count: 0,
    percentage: 0
  }));

  ticks.forEach((tick) => {
    totals[tick.lastDigit].count += 1;
  });

  return totals.map((entry) => ({
    ...entry,
    percentage: ticks.length ? Number(((entry.count / ticks.length) * 100).toFixed(2)) : 0
  }));
}
