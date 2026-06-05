'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Satellite, TrendingUp, CloudRain, Sprout, Info } from 'lucide-react';

/*
 * Hero centerpiece — an explainable, confidence-scored product artifact.
 * Embodies the brand thesis: explainability over prediction, determinism
 * over hand-waving. Everything here is clearly-labelled DEMO DATA generated
 * deterministically (no Math.random — keeps SSR/CSR markup stable, no
 * hydration mismatch). Motion is calm, staggered on load, and fully disabled
 * under prefers-reduced-motion.
 */

const GRID_COLS = 16;
const GRID_ROWS = 10;
const SEASON_WEEKS = 7;

// Deterministic NDVI field: a smooth vegetation surface that greens up as the
// season progresses, with a persistent moisture-stressed patch in one corner.
function ndviAt(col: number, row: number, week: number): number {
    const cx = col / (GRID_COLS - 1);
    const cy = row / (GRID_ROWS - 1);
    const seasonGrowth = 0.25 + (week / (SEASON_WEEKS - 1)) * 0.6; // 0.25 → 0.85
    const field =
        0.5 +
        0.28 * Math.sin(cx * 3.1 + 0.6) * Math.cos(cy * 2.7 + 0.3) +
        0.12 * Math.sin((cx + cy) * 5.0);
    // Moisture-stressed corner (top-right) lags the rest of the field.
    const stress = Math.max(0, 1 - Math.hypot(cx - 0.92, cy - 0.12) * 2.4) * 0.45;
    const v = field * seasonGrowth - stress;
    return Math.min(0.95, Math.max(0.05, v));
}

// NDVI → earthy color ramp: bare soil (clay) → senescent → vigorous canopy.
function ndviColor(v: number): string {
    if (v < 0.2) return '#9C8466';      // bare soil / clay
    if (v < 0.35) return '#B6A24E';     // sparse
    if (v < 0.5) return '#7FAE4B';      // emerging
    if (v < 0.65) return '#3E9A57';     // developing canopy
    if (v < 0.8) return '#1C7E4E';      // vigorous
    return '#0B5E3A';                   // peak canopy
}

// Yield confidence band (demo) — tonnes/ha across the season to harvest.
const yieldSeries = [
    { wk: 'Wk1', low: 0.6, mid: 0.9, high: 1.2 },
    { wk: 'Wk2', low: 1.2, mid: 1.7, high: 2.2 },
    { wk: 'Wk3', low: 2.0, mid: 2.7, high: 3.4 },
    { wk: 'Wk4', low: 2.9, mid: 3.7, high: 4.6 },
    { wk: 'Wk5', low: 3.6, mid: 4.6, high: 5.6 },
    { wk: 'Wk6', low: 4.1, mid: 5.2, high: 6.4 },
    { wk: 'Harvest', low: 4.4, mid: 5.6, high: 7.0 },
];

const reasoningFactors = [
    { icon: Satellite, label: 'NDVI trend', detail: '+12% over 14 days — canopy closing on schedule', weight: 'High' },
    { icon: CloudRain, label: 'Rainfall vs 10-yr normal', detail: '−18% this month — mild moisture deficit', weight: 'Medium' },
    { icon: Sprout, label: 'Growth stage', detail: 'V8–V10, calibrated to Natural Region II maize', weight: 'High' },
];

export default function HeroArtifact() {
    const reduceMotion = useReducedMotion();
    const [week, setWeek] = useState(SEASON_WEEKS - 1);

    // Calm season cycle. Paused entirely under reduced-motion (shows full season).
    useEffect(() => {
        if (reduceMotion) {
            setWeek(SEASON_WEEKS - 1);
            return;
        }
        const id = setInterval(() => {
            setWeek((w) => (w + 1) % SEASON_WEEKS);
        }, 2200);
        return () => clearInterval(id);
    }, [reduceMotion]);

    const cells = useMemo(() => {
        const out: { key: string; v: number; col: number; row: number }[] = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                out.push({ key: `${r}-${c}`, v: ndviAt(c, r, week), col: c, row: r });
            }
        }
        return out;
    }, [week]);

    const meanNdvi = useMemo(
        () => cells.reduce((s, c) => s + c.v, 0) / cells.length,
        [cells]
    );

    // Build the confidence-band area path (bespoke SVG — light, no chart lib).
    const chart = useMemo(() => {
        const w = 320;
        const h = 132;
        const maxY = 7.5;
        const x = (i: number) => (i / (yieldSeries.length - 1)) * w;
        const y = (v: number) => h - (v / maxY) * h;
        const line = (key: 'low' | 'mid' | 'high') =>
            yieldSeries.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d[key])}`).join(' ');
        const band =
            yieldSeries.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.high)}`).join(' ') +
            ' ' +
            yieldSeries
                .slice()
                .reverse()
                .map((d, i) => `L${x(yieldSeries.length - 1 - i)},${y(d.low)}`)
                .join(' ') +
            ' Z';
        return { w, h, band, mid: line('mid'), x, y };
    }, []);

    const container = {
        hidden: {},
        show: {
            transition: { staggerChildren: reduceMotion ? 0 : 0.12, delayChildren: 0.1 },
        },
    };
    const item = {
        hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="loam-panel relative w-full max-w-[560px] p-4 sm:p-5 lg:p-6 overflow-hidden"
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}
            aria-label="Demonstration of KurimaSense field intelligence (sample data)"
        >
            <div className="bg-grain absolute inset-0 opacity-[0.04] pointer-events-none" aria-hidden />

            {/* Panel header */}
            <motion.div variants={item} className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(45,212,167,0.14)' }}
                    >
                        <Satellite size={18} style={{ color: 'var(--ee-green-bright)' }} aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#F4F1ED', fontFamily: 'var(--font-body)' }}>
                            Field 3 · Mazowe
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-widest truncate" style={{ color: 'var(--ee-loam-muted)' }}>
                            Maize · Natural Region II
                        </p>
                    </div>
                </div>
                <span
                    className="flex-shrink-0 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ color: 'var(--ee-clay)', border: '1px solid var(--ee-loam-line)' }}
                >
                    Demo data
                </span>
            </motion.div>

            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* NDVI field tile */}
                <motion.div variants={item} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ee-loam-muted)' }}>
                            NDVI · canopy vigor
                        </span>
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--ee-green-bright)' }}>
                            wk {week + 1}/{SEASON_WEEKS}
                        </span>
                    </div>
                    <div
                        className="grid gap-[2px] rounded-md overflow-hidden"
                        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
                        role="img"
                        aria-label={`Satellite NDVI field map, season week ${week + 1} of ${SEASON_WEEKS}`}
                    >
                        {cells.map((cell) => (
                            <div
                                key={cell.key}
                                className="aspect-square"
                                style={{
                                    backgroundColor: ndviColor(cell.v),
                                    transition: reduceMotion ? undefined : 'background-color 1.1s ease',
                                }}
                            />
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                        <span className="text-[10px]" style={{ color: 'var(--ee-loam-muted)' }}>
                            mean <span className="font-bold tabular-nums" style={{ color: '#F4F1ED' }}>{meanNdvi.toFixed(2)}</span>
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--ee-clay)' }}>
                            ⚠ moisture-stressed corner
                        </span>
                    </div>
                </motion.div>

                {/* Yield forecast w/ confidence band */}
                <motion.div variants={item} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ee-loam-muted)' }}>
                            Yield forecast
                        </span>
                        <TrendingUp size={13} style={{ color: 'var(--ee-green-bright)' }} aria-hidden />
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-2xl font-bold tabular-nums" style={{ color: '#F4F1ED', fontFamily: 'var(--font-heading)' }}>5.6</span>
                        <span className="text-[11px]" style={{ color: 'var(--ee-loam-muted)' }}>t/ha expected</span>
                    </div>
                    <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="w-full h-[88px]" preserveAspectRatio="none" aria-hidden>
                        <defs>
                            <linearGradient id="ks-band" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2DD4A7" stopOpacity="0.32" />
                                <stop offset="100%" stopColor="#2DD4A7" stopOpacity="0.04" />
                            </linearGradient>
                        </defs>
                        <path d={chart.band} fill="url(#ks-band)" />
                        <motion.path
                            d={chart.mid}
                            fill="none"
                            stroke="#2DD4A7"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            initial={reduceMotion ? undefined : { pathLength: 0 }}
                            animate={reduceMotion ? undefined : { pathLength: 1 }}
                            transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.5 }}
                        />
                    </svg>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--ee-loam-muted)' }}>
                        range <span className="tabular-nums">4.4–7.0</span> t/ha · 80% band
                    </p>
                </motion.div>
            </div>

            {/* Explainable confidence strip */}
            <motion.div variants={item} className="relative mt-3 sm:mt-4 rounded-xl p-3.5" style={{ backgroundColor: 'rgba(45,212,167,0.06)', border: '1px solid var(--ee-loam-line)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Info size={14} style={{ color: 'var(--ee-green-bright)' }} aria-hidden />
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#F4F1ED' }}>
                            Why this forecast
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ee-loam-muted)' }}>Confidence</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--ee-green-bright)' }}>82%</span>
                    </div>
                </div>

                {/* Confidence meter */}
                <div className="h-1.5 rounded-full mb-3.5 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: 'var(--ee-green-bright)' }}
                        initial={reduceMotion ? undefined : { width: 0 }}
                        animate={{ width: '82%' }}
                        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.6 }}
                    />
                </div>

                <ul className="space-y-2.5">
                    {reasoningFactors.map((f) => (
                        <li key={f.label} className="flex items-start gap-2.5">
                            <f.icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--ee-clay)' }} aria-hidden />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold" style={{ color: '#F4F1ED' }}>{f.label}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: 'var(--ee-clay)', backgroundColor: 'rgba(200,169,138,0.12)' }}>{f.weight}</span>
                                </div>
                                <p className="text-[11px] leading-snug" style={{ color: 'var(--ee-loam-muted)' }}>{f.detail}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </motion.div>
        </motion.div>
    );
}
