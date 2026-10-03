export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PaperConfig {
  fastPeriod: number;
  slowPeriod: number;
  volumeMultiplier: number;
  useVolumeFilter?: boolean;
  stopLossPct: number;
  feePct: number;
  slippagePct: number;
  positionSizePct: number;
  startingBalance: number;
}

export interface PaperTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  returnPct: number;
  reason: "Trendbruch" | "Trailing Stop" | "Datenende";
}

export interface EquityPoint {
  time: number;
  equity: number;
}

export interface BacktestResult {
  trades: PaperTrade[];
  equityCurve: EquityPoint[];
  finalBalance: number;
  returnPct: number;
  buyAndHoldPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  profitFactor: number | null;
}

const parseTime = (value: string): number => {
  const raw = value.trim().replace(/^"|"$/g, "");
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parseNumber = (value: string): number => {
  const cleaned = value.trim().replace(/^"|"$/g, "").replace(/\s/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return Number(cleaned);
};

export function parseCandleCsv(csv: string): Candle[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 3) throw new Error("Die CSV braucht eine Kopfzeile und mindestens zwei Kerzen.");
  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const split = (line: string) => line.split(delimiter).map((part) => part.trim());
  const headers = split(lines[0]).map((header) => header.toLowerCase().replace(/[ _-]/g, ""));
  const find = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const columns = {
    time: find("time", "date", "datetime", "timestamp", "opentime"),
    open: find("open", "o"),
    high: find("high", "h"),
    low: find("low", "l"),
    close: find("close", "c", "price"),
    volume: find("volume", "vol", "v"),
  };
  if (Object.values(columns).some((index) => index < 0)) {
    throw new Error("Benötigte Spalten: time/date, open, high, low, close und volume.");
  }

  const candles = lines.slice(1).map((line) => {
    const cells = split(line);
    return {
      time: parseTime(cells[columns.time] || ""),
      open: parseNumber(cells[columns.open] || ""),
      high: parseNumber(cells[columns.high] || ""),
      low: parseNumber(cells[columns.low] || ""),
      close: parseNumber(cells[columns.close] || ""),
      volume: parseNumber(cells[columns.volume] || ""),
    };
  }).filter((candle) => Object.values(candle).every(Number.isFinite));

  candles.sort((a, b) => a.time - b.time);
  if (candles.length < 2) throw new Error("In der CSV wurden nicht genug gültige Kerzen gefunden.");
  if (candles.some((c) => c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 || c.volume < 0 || c.high < c.low)) {
    throw new Error("Die CSV enthält ungültige Preise oder Volumenwerte.");
  }
  return candles;
}

export function makeDemoCandles(count = 280): Candle[] {
  // Deterministic illustrative prices, deliberately not presented as market history.
  let seed = 271828;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const candles: Candle[] = [];
  let close = 0.0000012;
  for (let i = 0; i < count; i += 1) {
    const regime = i < 55 ? -0.002 : i < 150 ? 0.014 : i < 205 ? -0.012 : 0.005;
    const swing = (random() - 0.48) * 0.075;
    const open = close;
    close = Math.max(0.00000008, close * (1 + regime + swing));
    const wick = random() * 0.035;
    const spike = random() > 0.94 ? 2.8 + random() * 5 : 0.75 + random() * 0.55;
    candles.push({
      time: Date.UTC(2025, 0, 1) + i * 60 * 60 * 1000,
      open,
      high: Math.max(open, close) * (1 + wick),
      low: Math.min(open, close) * (1 - wick),
      close,
      volume: (45000 + random() * 65000) * spike,
    });
  }
  return candles;
}

const average = (values: number[], end: number, period: number) => {
  if (end - period + 1 < 0) return NaN;
  let total = 0;
  for (let i = end - period + 1; i <= end; i += 1) total += values[i];
  return total / period;
};

export function runPaperBacktest(candles: Candle[], config: PaperConfig): BacktestResult {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const trades: PaperTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  let balance = config.startingBalance;
  let position: null | { entryIndex: number; entryPrice: number; stake: number; highest: number } = null;
  const fee = config.feePct / 100;
  const slippage = config.slippagePct / 100;
  const stop = config.stopLossPct / 100;
  let pendingEntry = false;
  let pendingTrendExit = false;

  const netReturn = (entry: number, exit: number) =>
    ((exit * (1 - slippage) * (1 - fee)) / (entry * (1 + slippage) * (1 + fee))) - 1;

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];
    const fast = average(closes, i, config.fastPeriod);
    const slow = average(closes, i, config.slowPeriod);
    const volumeBaseline = average(volumes, i - 1, Math.min(20, i));

    if (pendingTrendExit && position) {
      const tradeReturn = netReturn(position.entryPrice, candle.open);
      const pnl = position.stake * tradeReturn;
      balance += pnl;
      trades.push({
        entryTime: candles[position.entryIndex].time,
        exitTime: candle.time,
        entryPrice: position.entryPrice,
        exitPrice: candle.open,
        pnl,
        returnPct: tradeReturn * 100,
        reason: "Trendbruch",
      });
      position = null;
      pendingTrendExit = false;
    }

    if (pendingEntry && !position) {
      position = {
        entryIndex: i,
        entryPrice: candle.open,
        stake: balance * (config.positionSizePct / 100),
        highest: candle.open,
      };
      pendingEntry = false;
    }

    if (position) {
      position.highest = Math.max(position.highest, candle.high);
      const stopPrice = position.highest * (1 - stop);
      let exitPrice: number | undefined;
      let exitIndex = i;
      let reason: PaperTrade["reason"] | undefined;
      if (candle.low <= stopPrice) {
        exitPrice = candle.open < stopPrice ? candle.open : stopPrice;
        reason = "Trailing Stop";
      } else if (Number.isFinite(fast) && Number.isFinite(slow) && fast < slow) {
        if (i < candles.length - 1) pendingTrendExit = true;
        else {
          exitPrice = candle.close;
          reason = "Datenende";
        }
      } else if (i === candles.length - 1) {
        exitPrice = candle.close;
        reason = "Datenende";
      }
      if (exitPrice !== undefined && reason) {
        const tradeReturn = netReturn(position.entryPrice, exitPrice);
        const pnl = position.stake * tradeReturn;
        balance += pnl;
        trades.push({
          entryTime: candles[position.entryIndex].time,
          exitTime: candles[exitIndex].time,
          entryPrice: position.entryPrice,
          exitPrice,
          pnl,
          returnPct: tradeReturn * 100,
          reason,
        });
        position = null;
      }
    } else if (
      i < candles.length - 1 &&
      Number.isFinite(fast) && Number.isFinite(slow) &&
      fast > slow &&
      (!config.useVolumeFilter || (Number.isFinite(volumeBaseline) && volumeBaseline > 0 && candle.volume >= volumeBaseline * config.volumeMultiplier))
    ) {
      pendingEntry = true;
    }

    const markedEquity = position
      ? balance + position.stake * netReturn(position.entryPrice, candle.close)
      : balance;
    equityCurve.push({ time: candle.time, equity: markedEquity });
  }

  const finalBalance = equityCurve.at(-1)?.equity ?? balance;
  let peak = config.startingBalance;
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    if (peak > 0) maxDrawdownPct = Math.max(maxDrawdownPct, ((peak - point.equity) / peak) * 100);
  }
  const winners = trades.filter((trade) => trade.pnl > 0);
  const grossProfit = winners.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(trades.filter((trade) => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));
  const holdReturn = netReturn(candles[0].open, candles.at(-1)!.close);

  return {
    trades,
    equityCurve,
    finalBalance,
    returnPct: ((finalBalance / config.startingBalance) - 1) * 100,
    buyAndHoldPct: holdReturn * 100,
    maxDrawdownPct,
    winRatePct: trades.length ? (winners.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
  };
}

