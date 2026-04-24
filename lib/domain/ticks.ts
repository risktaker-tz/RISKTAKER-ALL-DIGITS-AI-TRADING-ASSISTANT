export type TickQuote = {
  symbol: string;
  quote: number;
  epoch: number;
};

export function extractLastDigit(quote: number): number {
  const normalized = quote.toFixed(5).replace(".", "");
  return Number(normalized.at(-1) ?? "0");
}

export function buildDigitDistribution(ticks: TickQuote[]) {
  const totals = Array.from({ length: 10 }, (_, digit) => ({
    digit,
    count: 0,
    percentage: 0
  }));

  ticks.forEach((tick) => {
    totals[extractLastDigit(tick.quote)].count += 1;
  });

  return totals.map((entry) => ({
    ...entry,
    percentage: ticks.length ? Number(((entry.count / ticks.length) * 100).toFixed(2)) : 0
  }));
}
