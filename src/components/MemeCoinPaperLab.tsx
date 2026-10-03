import React, { useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Check, Clock3, Database, FileUp, FlaskConical, Info, ShieldCheck, Sparkles, X } from "lucide-react";
import { BacktestResult, Candle, PaperConfig, makeDemoCandles, parseCandleCsv, runPaperBacktest } from "../utils/paperTrading";

interface MemeCoinPaperLabProps {
  onClose: () => void;
}

const initialConfig: PaperConfig = {
  fastPeriod: 12,
  slowPeriod: 36,
  volumeMultiplier: 1.25,
  useVolumeFilter: true,
  stopLossPct: 16,
  feePct: 0.5,
  slippagePct: 0.75,
  positionSizePct: 10,
  startingBalance: 1000,
};

const money = (value: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const date = (value: number) => new Date(value).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });

function EquityChart({ result, startingBalance }: { result: BacktestResult; startingBalance: number }) {
  const chart = useMemo(() => {
    if (!result.equityCurve.length) return { path: "", baselineY: 150, min: 0, max: 1 };
    const values = result.equityCurve.map((p) => p.equity);
    const min = Math.min(...values, startingBalance) * 0.98;
    const max = Math.max(...values, startingBalance) * 1.02;
    const span = Math.max(1, max - min);
    const points = values.map((value, index) => {
      const x = 12 + (index / Math.max(1, values.length - 1)) * 696;
      const y = 156 - ((value - min) / span) * 138;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { path: points.join(" "), baselineY: 156 - ((startingBalance - min) / span) * 138, min, max };
  }, [result.equityCurve, startingBalance]);
  const isPositive = result.returnPct >= 0;
  return (
    <div className="mcl-chart-wrap">
      <div className="mcl-chart-legend"><span><i className={isPositive ? "up" : "down"} /> Strategie</span><span><i className="baseline" /> Startkapital</span></div>
      <svg className="mcl-chart" viewBox="0 0 720 180" role="img" aria-label="Simulierter Verlauf des Kontostands">
        <defs>
          <linearGradient id="mcl-equity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={isPositive ? "#a6d87b" : "#f28a70"} stopOpacity=".2" /><stop offset="100%" stopColor={isPositive ? "#a6d87b" : "#f28a70"} stopOpacity="0" /></linearGradient>
        </defs>
        {[35, 75, 115, 155].map((y) => <line key={y} x1="10" x2="710" y1={y} y2={y} className="mcl-grid-line" />)}
        <line x1="10" x2="710" y1={chart.baselineY} y2={chart.baselineY} className="mcl-baseline" />
        {chart.path && <>
          <polyline points={`12,156 ${chart.path} 708,156`} fill="url(#mcl-equity-fill)" stroke="none" />
          <polyline points={chart.path} fill="none" className={isPositive ? "mcl-equity up" : "mcl-equity down"} />
        </>}
      </svg>
      <div className="mcl-chart-axis"><span>{result.equityCurve[0] ? date(result.equityCurve[0].time) : "—"}</span><span>{result.equityCurve.at(-1) ? date(result.equityCurve.at(-1)!.time) : "—"}</span></div>
    </div>
  );
}

export const MemeCoinPaperLab: React.FC<MemeCoinPaperLabProps> = ({ onClose }) => {
  const [candles, setCandles] = useState<Candle[]>(() => makeDemoCandles());
  const [config, setConfig] = useState<PaperConfig>(initialConfig);
  const [strategy, setStrategy] = useState<"momentum-volume" | "trend">("momentum-volume");
  const [source, setSource] = useState<"demo" | "csv">("demo");
  const [sourceName, setSourceName] = useState("Synthetische Demo · kein echter Markt");
  const [error, setError] = useState("");
  const [result, setResult] = useState<BacktestResult>(() => runPaperBacktest(makeDemoCandles(), { ...initialConfig, useVolumeFilter: true }));

  const update = (key: keyof PaperConfig, value: number) => setConfig((current) => ({ ...current, [key]: value }));
  const run = (nextCandles = candles, nextConfig = config, nextStrategy = strategy) => {
    if (nextCandles.length < nextConfig.slowPeriod + 2) {
      setError(`Für diese Einstellungen werden mindestens ${nextConfig.slowPeriod + 2} Kerzen benötigt.`);
      return;
    }
    if (nextConfig.fastPeriod < 2 || nextConfig.slowPeriod <= nextConfig.fastPeriod) {
      setError("Der langsame Durchschnitt muss größer als der schnelle sein.");
      return;
    }
    setError("");
    setResult(runPaperBacktest(nextCandles, { ...nextConfig, useVolumeFilter: nextStrategy === "momentum-volume" }));
  };

  const loadDemo = () => {
    const demo = makeDemoCandles();
    setCandles(demo);
    setSource("demo");
    setSourceName("Synthetische Demo · kein echter Markt");
    setError("");
    run(demo, config, strategy);
  };

  const loadCsv = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = parseCandleCsv(await file.text());
      setCandles(parsed);
      setSource("csv");
      setSourceName(file.name);
      run(parsed, config, strategy);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "CSV konnte nicht gelesen werden.");
    }
  };

  const changeStrategy = (value: "momentum-volume" | "trend") => {
    setStrategy(value);
    run(candles, config, value);
  };

  const metricCards = [
    { label: "Netto-Rendite", value: pct(result.returnPct), detail: `Endstand ${money(result.finalBalance)}`, positive: result.returnPct >= 0, icon: result.returnPct >= 0 ? ArrowUpRight : ArrowDownRight },
    { label: "Max. Rückgang", value: `-${result.maxDrawdownPct.toFixed(2)}%`, detail: "Peak bis Tief im Verlauf", positive: false, icon: Activity },
    { label: "Trefferquote", value: `${result.winRatePct.toFixed(1)}%`, detail: `${result.trades.filter((trade) => trade.pnl > 0).length} Gewinner`, positive: result.winRatePct >= 50, icon: Check },
    { label: "Abgeschlossene Trades", value: String(result.trades.length), detail: `Buy & Hold ${pct(result.buyAndHoldPct)}`, positive: null, icon: BarChart3 },
  ];

  return (
    <div className="mcl-overlay" role="dialog" aria-modal="true" aria-labelledby="mcl-title">
      <div className="mcl-shell">
        <header className="mcl-header">
          <div className="mcl-brand-mark"><FlaskConical size={18} /></div>
          <div className="mcl-heading"><div className="mcl-eyebrow">PAPAYAOS · RESEARCH WORKSPACE</div><h1 id="mcl-title">Meme Coin Paper Lab</h1></div>
          <span className="mcl-paper-pill"><span /> PAPER TRADING · KEINE ORDERS</span>
          <button className="mcl-close" onClick={onClose} aria-label="Paper Lab schließen"><X size={19} /></button>
        </header>

        <div className="mcl-notice"><ShieldCheck size={17} /><span>Simulation mit historischen Kerzen. Ergebnisse sind keine Gewinnprognose; echte Ausführung und X-Signale sind noch nicht verbunden.</span><button onClick={() => setSourceName("Synthetische Demo · kein echter Markt")} aria-label="Hinweis zur Simulation"><Info size={16} /></button></div>

        <main className="mcl-content">
          <section className="mcl-controls">
            <div className="mcl-section-head"><div><div className="mcl-eyebrow">01 / DATENQUELLE</div><h2>Marktdaten</h2></div><span className="mcl-candle-count">{candles.length} Kerzen</span></div>
            <div className="mcl-source-box">
              <div className="mcl-source-icon"><Database size={17} /></div><div className="mcl-source-copy"><strong>{source === "demo" ? "Beispielmarkt" : "CSV importiert"}</strong><span>{sourceName}</span></div>
              <label className="mcl-upload-button"><FileUp size={15} /> CSV laden<input type="file" accept=".csv,text/csv" onChange={(event) => void loadCsv(event.target.files?.[0])} /></label>
            </div>
            <button className="mcl-demo-link" onClick={loadDemo}><Sparkles size={14} /> Demo-Daten erneut laden</button>
            <p className="mcl-csv-hint">CSV-Spalten: <code>time, open, high, low, close, volume</code></p>

            <div className="mcl-divider" />
            <div className="mcl-section-head"><div><div className="mcl-eyebrow">02 / STRATEGIE</div><h2>Regeln testen</h2></div></div>
            <label className="mcl-field-label">Strategie</label>
            <div className="mcl-strategy-tabs">
              <button className={strategy === "momentum-volume" ? "active" : ""} onClick={() => changeStrategy("momentum-volume")}>Momentum + Volumen</button>
              <button className={strategy === "trend" ? "active" : ""} onClick={() => changeStrategy("trend")}>Trendfolge</button>
            </div>
            <p className="mcl-strategy-desc">Long-Einstieg beim SMA-Crossover, Ausstieg beim Trendbruch oder Trailing Stop. Einstieg erfolgt frühestens zur nächsten Kerze.</p>

            <div className="mcl-input-grid">
              <label><span>Schneller SMA</span><div className="mcl-number-field"><input type="number" min="2" max="100" value={config.fastPeriod} onChange={(e) => update("fastPeriod", Number(e.target.value))} /><small>Kerzen</small></div></label>
              <label><span>Langsamer SMA</span><div className="mcl-number-field"><input type="number" min="3" max="300" value={config.slowPeriod} onChange={(e) => update("slowPeriod", Number(e.target.value))} /><small>Kerzen</small></div></label>
              {strategy === "momentum-volume" && <label><span>Volumenfilter</span><div className="mcl-number-field"><input type="number" min="0.5" max="10" step="0.05" value={config.volumeMultiplier} onChange={(e) => update("volumeMultiplier", Number(e.target.value))} /><small>× Mittel</small></div></label>}
              <label><span>Trailing Stop</span><div className="mcl-number-field"><input type="number" min="1" max="80" step="1" value={config.stopLossPct} onChange={(e) => update("stopLossPct", Number(e.target.value))} /><small>%</small></div></label>
              <label><span>Ordergröße</span><div className="mcl-number-field"><input type="number" min="1" max="100" value={config.positionSizePct} onChange={(e) => update("positionSizePct", Number(e.target.value))} /><small>% Equity</small></div></label>
              <label><span>Startkapital</span><div className="mcl-number-field"><input type="number" min="1" step="100" value={config.startingBalance} onChange={(e) => update("startingBalance", Number(e.target.value))} /><small>USD</small></div></label>
            </div>
            <div className="mcl-cost-row"><label><span>Gebühr je Seite</span><input type="number" min="0" max="10" step="0.05" value={config.feePct} onChange={(e) => update("feePct", Number(e.target.value))} />%</label><label><span>Slippage je Seite</span><input type="number" min="0" max="25" step="0.05" value={config.slippagePct} onChange={(e) => update("slippagePct", Number(e.target.value))} />%</label></div>
            <button className="mcl-run-button" onClick={() => run()}><Activity size={16} /> Backtest berechnen</button>
            {error && <div className="mcl-error" role="alert"><AlertTriangle size={15} />{error}</div>}
          </section>

          <section className="mcl-results">
            <div className="mcl-result-top"><div><div className="mcl-eyebrow">SIMULATIONSERGEBNIS</div><h2>Strategie-Überblick</h2></div><span className="mcl-date-range"><Clock3 size={14} /> {candles[0] ? date(candles[0].time) : "—"} — {candles.at(-1) ? date(candles.at(-1)!.time) : "—"}</span></div>
            {source === "demo" && <div className="mcl-demo-warning"><AlertTriangle size={15} />Künstliche Daten: Diese Kennzahlen sagen nichts über reale Märkte aus.</div>}
            <div className="mcl-metrics">{metricCards.map(({ label, value, detail, positive, icon: Icon }) => <div className="mcl-metric" key={label}><div className="mcl-metric-top"><span>{label}</span><Icon size={16} /></div><strong className={positive === null ? "" : positive ? "positive" : "negative"}>{value}</strong><small>{detail}</small></div>)}</div>
            <div className="mcl-chart-card"><div className="mcl-chart-heading"><div><h3>Kontostand im Zeitverlauf</h3><span>Netto nach Gebühren & geschätzter Slippage</span></div><strong className={result.returnPct >= 0 ? "positive" : "negative"}>{money(result.finalBalance)}</strong></div><EquityChart result={result} startingBalance={config.startingBalance} /></div>
            <div className="mcl-bottom-grid">
              <div className="mcl-insight-card"><div className="mcl-eyebrow">RISIKO-KENNZAHL</div><strong>{result.profitFactor === null ? "—" : result.profitFactor === Infinity ? "∞" : result.profitFactor.toFixed(2)}</strong><span>Profit Factor · Bruttogewinn geteilt durch Bruttoverlust</span></div>
              <div className="mcl-insight-card"><div className="mcl-eyebrow">PAPER-SCHUTZ</div><strong className="paper-ready"><ShieldCheck size={17} /> Nur Simulation</strong><span>Kein Wallet verbunden · keine Signatur · keine echten Orders</span></div>
            </div>
            <div className="mcl-trades-card"><div className="mcl-trades-heading"><h3>Letzte simulierte Trades</h3><span>{result.trades.length} gesamt</span></div>{result.trades.length ? <div className="mcl-trade-list">{[...result.trades].reverse().slice(0, 6).map((trade, index) => <div className="mcl-trade-row" key={`${trade.entryTime}-${index}`}><span className={trade.pnl >= 0 ? "trade-dot win" : "trade-dot loss"} /><span className="mcl-trade-date">{date(trade.entryTime)}</span><span className="mcl-trade-reason">{trade.reason}</span><strong className={trade.pnl >= 0 ? "positive" : "negative"}>{money(trade.pnl)} <small>({pct(trade.returnPct)})</small></strong></div>)}</div> : <div className="mcl-empty-trades">Noch keine Trades mit diesen Regeln. Passe SMA oder Volumenfilter an.</div>}</div>
          </section>
        </main>

        <footer className="mcl-footer"><span><ShieldCheck size={14} /> Paper-only · Keine Verbindung zu Wallets oder Börsen</span><span>Die Simulation ignoriert Liquiditätsänderungen, MEV und Token-Rugs.</span></footer>
      </div>
    </div>
  );
};

