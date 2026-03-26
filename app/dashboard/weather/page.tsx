"use client";

import React, { useEffect, useState } from 'react';
import { climateApi } from '@/services/climate';
import { api } from '@/services/api';
import type {
    CurrentWeather,
    DailyForecast,
    HourlyForecast,
    AlertsResponse,
    AgriculturalMetrics,
    SprayWindowResponse,
    HistoricalComparison
} from '@/lib/climate-types';
import { getWeatherIcon, getDayName, formatTime } from '@/lib/climate-types';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, ComposedChart, Line } from "recharts";

export default function WeatherPage() {
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState<CurrentWeather | null>(null);
    const [daily, setDaily] = useState<DailyForecast[]>([]);
    const [hourly, setHourly] = useState<HourlyForecast[]>([]);
    const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
    const [agricultural, setAgricultural] = useState<AgriculturalMetrics | null>(null);
    const [sprayWindow, setSprayWindow] = useState<SprayWindowResponse | null>(null);
    const [historical, setHistorical] = useState<HistoricalComparison | null>(null);
    const [selectedDay, setSelectedDay] = useState<number>(0);
    const [fields, setFields] = useState<any[]>([]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>(undefined);
    // Phase 2 individual loading states
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [agriculturalLoading, setAgriculturalLoading] = useState(true);
    const [sprayLoading, setSprayLoading] = useState(true);
    const [historicalLoading, setHistoricalLoading] = useState(true);

    useEffect(() => {
        loadFields();
    }, []);

    useEffect(() => {
        loadClimateData();
    }, [selectedFieldId]);

    const loadFields = async () => {
        try {
            const fieldsData = await api.getFields();
            setFields(fieldsData);
            // Default to first field if available
            if (fieldsData.length > 0) {
                setSelectedFieldId(fieldsData[0].id);
            }
        } catch (e) {
            console.error("Error loading fields:", e);
        }
    };

    const loadClimateData = async () => {
        setLoading(true);
        setAlertsLoading(true);
        setAgriculturalLoading(true);
        setSprayLoading(true);
        setHistoricalLoading(true);

        const options = selectedFieldId ? { field_id: selectedFieldId } : {};

        // Phase 1 — fast: current conditions + forecast (page becomes interactive immediately)
        try {
            const [currentData, forecastData] = await Promise.all([
                climateApi.getCurrentWeather(options),
                climateApi.getForecast(options),
            ]);
            setCurrent(currentData);
            if (forecastData) {
                setDaily(forecastData.daily || []);
                setHourly(forecastData.hourly || []);
            }
        } catch (e) {
            console.error("Error loading phase 1 climate data:", e);
        } finally {
            setLoading(false);
        }

        // Phase 2 — slower: agricultural analytics, each section resolves independently
        Promise.all([
            climateApi.getAlerts(options),
            climateApi.getAgriculturalMetrics(options),
            climateApi.getSprayWindow(options),
            climateApi.getHistoricalComparison(options),
        ]).then(([alertsData, agriData, sprayData, histData]) => {
            setAlerts(alertsData);
            setAlertsLoading(false);
            setAgricultural(agriData);
            setAgriculturalLoading(false);
            setSprayWindow(sprayData);
            setSprayLoading(false);
            setHistorical(histData);
            setHistoricalLoading(false);
        }).catch((e) => {
            console.error("Error loading phase 2 climate data:", e);
            setAlertsLoading(false);
            setAgriculturalLoading(false);
            setSprayLoading(false);
            setHistoricalLoading(false);
        });
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center" style={{ background: 'var(--ee-bg)' }}>
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full animate-spin mx-auto mb-4" style={{ border: '4px solid var(--ee-primary)', borderTopColor: 'transparent' }}></div>
                    <p className="font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Loading Climate Intelligence...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const hourlyChartData = hourly.slice(0, 24).map(h => ({
        time: formatTime(h.time),
        temperature: h.temperature,
        precipitation: h.precipitation_probability || 0
    }));

    const gddData = agricultural?.growing_degree_days?.daily_breakdown || [];

    return (
        <div className="grid grid-cols-12 gap-4 lg:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

            {/* Field Selector */}
            {fields.length > 0 && (
                <div className="col-span-12">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Weather for:</label>
                        <select
                            value={selectedFieldId || ''}
                            onChange={(e) => setSelectedFieldId(e.target.value || undefined)}
                            className="neu-surface rounded-full px-4 py-2 font-semibold focus:outline-none focus:ring-2"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)', background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)', border: 'none', ['--tw-ring-color' as string]: 'var(--ee-primary)' }}
                        >
                            <option value="">My Location (Default)</option>
                            {fields.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Weather Alerts Banner */}
            {alertsLoading ? null : alerts && alerts.has_critical && (
                <div className="col-span-12">
                    <div className="rounded-[24px] p-4 flex items-start gap-4" style={{ background: '#FEF2F2', boxShadow: 'var(--shadow-neu)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#DC2626' }}>warning</span>
                        <div className="flex-1">
                            <h4 className="font-black" style={{ color: '#B91C1C', fontFamily: 'var(--font-heading)' }}>Weather Alerts Active</h4>
                            <div className="space-y-2 mt-2">
                                {alerts.alerts.slice(0, 3).map((alert, i) => (
                                    <div key={i} className="rounded-[16px] p-3" style={{ background: '#FFFFFF', boxShadow: 'var(--shadow-neu-inset)' }}>
                                        <p className="font-bold" style={{ color: '#991B1B', fontFamily: 'var(--font-body)' }}>{alert.title}</p>
                                        <p className="text-sm" style={{ color: '#DC2626' }}>{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Weather Hero */}
            <div className="col-span-12 lg:col-span-8">
                <div className="p-8 lg:p-12 rounded-[24px] text-white relative overflow-hidden min-h-[280px]" style={{ background: 'linear-gradient(135deg, var(--ee-text), #1E2B20)', boxShadow: 'var(--shadow-neu)' }}>
                    {!current || current.temperature == null ? (
                        <div className="relative z-10 flex flex-col items-center justify-center min-h-[200px] text-center">
                            <p className="text-4xl mb-3">🌐</p>
                            <p className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Weather data unavailable</p>
                            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Unable to fetch current conditions. Check your field location or try again.</p>
                            <button onClick={() => loadClimateData()} className="mt-4 px-5 py-2 font-bold rounded-[12px] text-sm transition-colors" style={{ background: 'var(--ee-primary)', color: 'var(--ee-text)' }}>
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-bold text-sm uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>Current Conditions</p>
                                    <div className="flex items-end gap-4">
                                        <span className="text-7xl lg:text-8xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>{Math.round(current.temperature)}°</span>
                                        <span className="text-6xl mb-2">{getWeatherIcon(current.weather_code || 0)}</span>
                                    </div>
                                    <p className="text-2xl font-bold mt-2" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-heading)' }}>{current.weather_description}</p>
                                    <p className="mt-1" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)' }}>Feels like {Math.round(current.feels_like ?? current.temperature)}°C</p>
                                </div>
                                <div className="text-right space-y-3">
                                    <div className="rounded-[16px] px-4 py-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>Humidity</p>
                                        <p className="text-xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>{current.humidity ?? '—'}%</p>
                                    </div>
                                    <div className="rounded-[16px] px-4 py-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>Wind</p>
                                        <p className="text-xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>{current.wind_speed != null ? Math.round(current.wind_speed) : '—'} km/h</p>
                                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{current.wind_direction_text || ''}</p>
                                    </div>
                                    <div className="rounded-[16px] px-4 py-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>UV Index</p>
                                        <p className="text-xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>{current.uv_index ?? '—'}</p>
                                        <p className="text-xs" style={{ color: 'var(--ee-primary)' }}>{current.uv_level || ''}</p>
                                    </div>
                                </div>
                            </div>
                            {current.time && (
                                <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Updated: {new Date(current.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                            )}
                        </div>
                    )}
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none" style={{ background: 'var(--ee-primary)', opacity: 0.12 }}></div>
                </div>
            </div>

            {/* Historical Comparison */}
            <div className="col-span-12 lg:col-span-4">
                <div className="neu-surface rounded-[24px] p-6 h-full" style={{ background: 'var(--ee-surface)' }}>
                    <h4 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-primary)' }}>bar_chart</span>
                        Historical Comparison
                    </h4>
                    {historicalLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-3 w-32 rounded mb-4" style={{ background: 'var(--ee-bg)' }} />
                            <div className="rounded-[16px] p-4 space-y-2" style={{ background: 'var(--ee-bg)' }}>
                                <div className="h-3 w-24 rounded" style={{ background: '#E0DCD6' }} />
                                <div className="h-8 w-20 rounded" style={{ background: '#E0DCD6' }} />
                                <div className="h-3 w-36 rounded" style={{ background: 'var(--ee-bg)' }} />
                            </div>
                            <div className="rounded-[16px] p-4 space-y-2" style={{ background: 'var(--ee-bg)' }}>
                                <div className="h-3 w-24 rounded" style={{ background: '#E0DCD6' }} />
                                <div className="h-8 w-20 rounded" style={{ background: '#E0DCD6' }} />
                                <div className="h-3 w-36 rounded" style={{ background: 'var(--ee-bg)' }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{historical?.comparison_period}</p>
                            <div className="space-y-4">
                                <div className="rounded-[16px] p-4" style={{ background: 'var(--ee-bg)' }}>
                                    <p className="text-sm font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Temperature</p>
                                    <p className="text-2xl font-black" style={{ color: (historical?.deviation?.temperature || 0) > 0 ? 'var(--ee-sun)' : 'var(--ee-water)', fontFamily: 'var(--font-heading)' }}>
                                        {historical?.deviation?.temperature !== undefined && historical?.deviation?.temperature !== null ? (historical.deviation.temperature > 0 ? '+' : '') + historical.deviation.temperature + '°C' : '—'}
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>{historical?.deviation?.temperature_text}</p>
                                </div>
                                <div className="rounded-[16px] p-4" style={{ background: 'var(--ee-bg)' }}>
                                    <p className="text-sm font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Precipitation</p>
                                    <p className="text-2xl font-black" style={{ color: (historical?.deviation?.precipitation || 0) > 0 ? 'var(--ee-water)' : 'var(--ee-sun)', fontFamily: 'var(--font-heading)' }}>
                                        {historical?.deviation?.precipitation !== undefined && historical?.deviation?.precipitation !== null ? (historical.deviation.precipitation > 0 ? '+' : '') + historical.deviation.precipitation + '%' : '—'}
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>{historical?.deviation?.precipitation_text}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 7-Day Forecast */}
            <div className="col-span-12">
                <div className="neu-surface rounded-[24px] p-6 lg:p-8" style={{ background: 'var(--ee-surface)' }}>
                    <h4 className="font-black text-xl mb-6" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>7-Day Forecast</h4>
                    <div className="grid grid-cols-7 gap-2 lg:gap-4">
                        {daily.slice(0, 7).map((day, i) => (
                            <button
                                key={day.date}
                                onClick={() => setSelectedDay(i)}
                                className="p-3 lg:p-4 rounded-[16px] transition-all text-center"
                                style={selectedDay === i
                                    ? { background: 'var(--ee-text)', color: '#FFFFFF', transform: 'scale(1.05)', boxShadow: 'var(--shadow-ambient)' }
                                    : { background: 'var(--ee-bg)', color: 'var(--ee-text)' }
                                }
                            >
                                <p className="text-xs font-bold uppercase" style={{ color: selectedDay === i ? 'var(--ee-primary)' : 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                    {getDayName(day.date, true)}
                                </p>
                                <p className="text-3xl my-2">{getWeatherIcon(day.weather_code)}</p>
                                <p className="font-black text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{Math.round(day.temp_max)}°</p>
                                <p className="text-sm" style={{ color: selectedDay === i ? 'rgba(255,255,255,0.5)' : 'var(--ee-muted)' }}>
                                    {Math.round(day.temp_min)}°
                                </p>
                                {(day.precipitation_probability || 0) > 30 && (
                                    <p className="text-xs font-bold mt-1 flex items-center justify-center gap-0.5" style={{ color: 'var(--ee-water)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>water_drop</span>
                                        {day.precipitation_probability}%
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Selected day details */}
                    {daily[selectedDay] && (
                        <div className="mt-6 pt-6 grid grid-cols-2 lg:grid-cols-5 gap-4" style={{ borderTop: 'none', background: 'transparent' }}>
                            <div className="rounded-[16px] p-4 text-center" style={{ background: 'var(--ee-bg)' }}>
                                <p className="text-xs uppercase" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Sunrise</p>
                                <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{daily[selectedDay].sunrise?.split('T')[1]?.slice(0, 5) || '—'}</p>
                            </div>
                            <div className="rounded-[16px] p-4 text-center" style={{ background: 'var(--ee-bg)' }}>
                                <p className="text-xs uppercase" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Sunset</p>
                                <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{daily[selectedDay].sunset?.split('T')[1]?.slice(0, 5) || '—'}</p>
                            </div>
                            <div className="rounded-[16px] p-4 text-center" style={{ background: 'var(--ee-bg)' }}>
                                <p className="text-xs uppercase" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Rain</p>
                                <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{daily[selectedDay].precipitation || 0}mm</p>
                            </div>
                            <div className="rounded-[16px] p-4 text-center" style={{ background: 'var(--ee-bg)' }}>
                                <p className="text-xs uppercase" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>UV Index</p>
                                <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{daily[selectedDay].uv_index_max}</p>
                            </div>
                            <div className="rounded-[16px] p-4 text-center" style={{ background: 'var(--ee-bg)' }}>
                                <p className="text-xs uppercase" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>ET&#x2080;</p>
                                <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{daily[selectedDay].evapotranspiration?.toFixed(1) || 0}mm</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 24-Hour Temperature & Precipitation Chart */}
            <div className="col-span-12 lg:col-span-8">
                <div className="neu-surface rounded-[24px] p-6 lg:p-8" style={{ background: 'var(--ee-surface)' }}>
                    <h4 className="font-black text-xl mb-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>24-Hour Outlook</h4>
                    <p className="text-sm mb-6" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Temperature and precipitation probability</p>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={hourlyChartData}>
                                <defs>
                                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0fb885" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#0fb885" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: '#8B9D8F' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    yAxisId="temp"
                                    orientation="left"
                                    tick={{ fontSize: 10, fill: '#8B9D8F' }}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={['dataMin - 2', 'dataMax + 2']}
                                />
                                <YAxis
                                    yAxisId="precip"
                                    orientation="right"
                                    tick={{ fontSize: 10, fill: '#8B9D8F' }}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#2D3A30',
                                        borderRadius: '16px',
                                        border: 'none',
                                        color: '#fff',
                                        fontFamily: 'var(--font-body)'
                                    }}
                                    itemStyle={{ color: '#0fb885' }}
                                />
                                <Area
                                    yAxisId="temp"
                                    type="monotone"
                                    dataKey="temperature"
                                    stroke="#2D3A30"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#tempGradient)"
                                    name="Temperature (°C)"
                                />
                                <Bar
                                    yAxisId="precip"
                                    dataKey="precipitation"
                                    fill="#5C9EAD"
                                    fillOpacity={0.5}
                                    radius={[4, 4, 0, 0]}
                                    name="Rain Chance (%)"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Spray Window Optimizer */}
            <div className="col-span-12 lg:col-span-4">
                <div className="neu-surface rounded-[24px] p-6 h-full" style={{ background: 'var(--ee-surface)' }}>
                    <h4 className="font-black text-lg mb-1 flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-primary)' }}>spa</span>
                        Spray Window
                    </h4>
                    <p className="text-xs mb-4" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Optimal times for pesticide/herbicide application</p>

                    {sprayLoading ? (
                        <div className="space-y-3 animate-pulse">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="rounded-[16px] p-3 flex items-center gap-3" style={{ background: 'var(--ee-bg)' }}>
                                    <div className="w-10 h-10 rounded-full" style={{ background: '#E0DCD6' }} />
                                    <div className="space-y-1 flex-1">
                                        <div className="h-3 w-16 rounded" style={{ background: '#E0DCD6' }} />
                                        <div className="h-3 w-24 rounded" style={{ background: 'var(--ee-bg)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sprayWindow?.ideal_windows?.slice(0, 4).map((window, i) => {
                                const startDate = new Date(window.start);
                                const endDate = new Date(window.end);
                                const day = getDayName(window.start, true);
                                const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
                                const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

                                return (
                                    <div key={i} className="rounded-[16px] p-3 flex items-center gap-3" style={{ background: 'rgba(15, 184, 133, 0.08)' }}>
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--ee-primary)' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check</span>
                                        </div>
                                        <div>
                                            <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>{day}</p>
                                            <p className="text-sm" style={{ color: 'var(--ee-primary)' }}>{startTime} - {endTime}</p>
                                        </div>
                                    </div>
                                );
                            })}

                            {(!sprayWindow?.ideal_windows || sprayWindow.ideal_windows.length === 0) && (
                                <div className="rounded-[16px] p-4 text-center" style={{ background: 'rgba(232, 163, 101, 0.1)' }}>
                                    <p className="font-bold flex items-center justify-center gap-1" style={{ color: 'var(--ee-sun)', fontFamily: 'var(--font-body)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
                                        No ideal windows
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--ee-sun)' }}>Check hourly conditions for acceptable times</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 p-3 rounded-[16px] text-xs" style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                        <p className="font-bold mb-1" style={{ color: 'var(--ee-text)' }}>Ideal Conditions:</p>
                        <p>Wind: 3-10 km/h &bull; Temp: 15-28°C &bull; No rain</p>
                    </div>
                </div>
            </div>

            {/* Agricultural Metrics */}
            <div className="col-span-12 lg:col-span-6">
                <div className="neu-surface rounded-[24px] p-6 lg:p-8" style={{ background: 'var(--ee-surface)' }}>
                    <h4 className="font-black text-xl mb-6 flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-primary)' }}>eco</span>
                        Growing Degree Days
                    </h4>

                    {agriculturalLoading ? (
                        <div className="animate-pulse space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-3 w-36 rounded" style={{ background: '#E0DCD6' }} />
                                    <div className="h-3 w-10 rounded" style={{ background: '#E0DCD6' }} />
                                </div>
                                <div className="h-4 rounded-full" style={{ background: 'var(--ee-bg)' }} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="rounded-[16px] p-4 text-center space-y-2" style={{ background: 'var(--ee-bg)' }}>
                                        <div className="h-2 w-16 rounded mx-auto" style={{ background: '#E0DCD6' }} />
                                        <div className="h-8 w-12 rounded mx-auto" style={{ background: '#E0DCD6' }} />
                                        <div className="h-2 w-8 rounded mx-auto" style={{ background: 'var(--ee-bg)' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-6 mb-6">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Progress to Maturity</span>
                                        <span className="text-sm font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                            {agricultural?.growing_degree_days?.progress_percent?.toFixed(0) || 0}%
                                        </span>
                                    </div>
                                    <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--ee-bg)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${agricultural?.growing_degree_days?.progress_percent || 0}%`, background: 'linear-gradient(90deg, var(--ee-primary), #0a9a6e)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-[16px] p-4 text-center" style={{ background: 'rgba(15, 184, 133, 0.1)' }}>
                                    <p className="text-xs uppercase font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Accumulated</p>
                                    <p className="text-2xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{agricultural?.growing_degree_days?.total_gdd?.toLocaleString() || 0}</p>
                                    <p className="text-xs" style={{ color: 'var(--ee-muted)' }}>GDD</p>
                                </div>
                                <div className="rounded-[16px] p-4 text-center" style={{ background: 'var(--ee-bg)' }}>
                                    <p className="text-xs uppercase font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Remaining</p>
                                    <p className="text-2xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{agricultural?.growing_degree_days?.remaining_gdd?.toLocaleString() || 0}</p>
                                    <p className="text-xs" style={{ color: 'var(--ee-muted)' }}>GDD</p>
                                </div>
                                <div className="rounded-[16px] p-4 text-center" style={{ background: 'rgba(15, 184, 133, 0.06)' }}>
                                    <p className="text-xs uppercase font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Est. Maturity</p>
                                    <p className="text-lg font-black" style={{ color: 'var(--ee-primary)', fontFamily: 'var(--font-heading)' }}>
                                        {agricultural?.growing_degree_days?.days_to_maturity ? `${agricultural.growing_degree_days.days_to_maturity}d` : '—'}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--ee-muted)' }}>{agricultural?.growing_degree_days?.status || ''}</p>
                                </div>
                            </div>

                            {gddData.length > 0 && (
                                <div className="mt-6 h-[120px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={gddData}>
                                            <defs>
                                                <linearGradient id="gddGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0fb885" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#0fb885" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#2D3A30', borderRadius: '16px', border: 'none', fontFamily: 'var(--font-body)' }}
                                                labelStyle={{ color: '#0fb885' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="cumulative"
                                                stroke="#0fb885"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#gddGradient)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Water Balance & Soil */}
            <div className="col-span-12 lg:col-span-6">
                <div className="neu-surface rounded-[24px] p-6 lg:p-8" style={{ background: 'var(--ee-surface)' }}>
                    <h4 className="font-black text-xl mb-6 flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-water)' }}>water_drop</span>
                        Water Balance
                    </h4>

                    {agriculturalLoading ? (
                        <div className="animate-pulse space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-[16px] p-4 space-y-2" style={{ background: 'var(--ee-bg)' }}>
                                    <div className="h-2 w-20 rounded" style={{ background: '#E0DCD6' }} />
                                    <div className="h-10 w-16 rounded" style={{ background: '#E0DCD6' }} />
                                </div>
                                <div className="rounded-[16px] p-4 space-y-2" style={{ background: 'var(--ee-bg)' }}>
                                    <div className="h-2 w-20 rounded" style={{ background: '#E0DCD6' }} />
                                    <div className="h-10 w-16 rounded" style={{ background: '#E0DCD6' }} />
                                </div>
                            </div>
                            <div className="h-16 rounded-[16px]" style={{ background: 'var(--ee-bg)' }} />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="h-2 w-16 rounded" style={{ background: '#E0DCD6' }} />
                                    <div className="h-3 rounded-full" style={{ background: 'var(--ee-bg)' }} />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-16 rounded" style={{ background: '#E0DCD6' }} />
                                    <div className="h-8 w-20 rounded" style={{ background: '#E0DCD6' }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="rounded-[16px] p-4" style={{ background: 'rgba(92, 158, 173, 0.1)' }}>
                                    <p className="text-xs uppercase font-bold mb-1" style={{ color: 'var(--ee-water)', fontFamily: 'var(--font-body)' }}>Weekly Rain</p>
                                    <p className="text-3xl font-black" style={{ color: 'var(--ee-water)', fontFamily: 'var(--font-heading)' }}>
                                        {agricultural?.water_balance?.weekly_precipitation?.toFixed(1) || 0}
                                        <span className="text-lg">mm</span>
                                    </p>
                                </div>
                                <div className="rounded-[16px] p-4" style={{ background: 'rgba(232, 163, 101, 0.1)' }}>
                                    <p className="text-xs uppercase font-bold mb-1" style={{ color: 'var(--ee-sun)', fontFamily: 'var(--font-body)' }}>Weekly ET</p>
                                    <p className="text-3xl font-black" style={{ color: 'var(--ee-sun)', fontFamily: 'var(--font-heading)' }}>
                                        {agricultural?.water_balance?.weekly_et?.toFixed(1) || 0}
                                        <span className="text-lg">mm</span>
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-[16px] p-4 mb-6" style={{
                                background: agricultural?.water_balance?.status === 'surplus' ? 'var(--ee-water)' :
                                    agricultural?.water_balance?.status === 'deficit' ? '#D9534F' :
                                        'var(--ee-primary)',
                                boxShadow: 'var(--shadow-ambient)'
                            }}>
                                <p className="font-black text-lg text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                                    Balance: {agricultural?.water_balance?.balance?.toFixed(1) || 0}mm
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                        {agricultural?.water_balance?.status === 'surplus' ? 'water_drop' :
                                            agricultural?.water_balance?.status === 'deficit' ? 'water_loss' : 'check_circle'}
                                    </span>
                                </p>
                                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-body)' }}>{agricultural?.water_balance?.irrigation_recommendation}</p>
                            </div>

                            <h5 className="font-bold mb-3" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>Soil Conditions</h5>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-xs uppercase font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Moisture</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--ee-bg)' }}>
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${agricultural?.moisture?.shallow_pct || 0}%`, background: 'var(--ee-water)' }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{agricultural?.moisture?.shallow_pct?.toFixed(0) || 0}%</span>
                                    </div>
                                    <p className="text-xs" style={{ color: 'var(--ee-muted)' }}>{agricultural?.moisture?.status}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs uppercase font-bold" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Soil Temp</p>
                                    <p className="text-2xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>{agricultural?.soil?.surface?.toFixed(1) || '—'}°C</p>
                                    <p className="text-xs" style={{ color: 'var(--ee-muted)' }}>Surface temperature</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* All Alerts */}
            {!alertsLoading && alerts && alerts.alerts.length > 0 && (
                <div className="col-span-12">
                    <div className="neu-surface rounded-[24px] p-6 lg:p-8" style={{ background: 'var(--ee-surface)' }}>
                        <h4 className="font-black text-xl mb-6 flex items-center gap-2" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--ee-sun)' }}>warning</span>
                            All Weather Alerts
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {alerts.alerts.map((alert, i) => (
                                <div
                                    key={i}
                                    className="rounded-[16px] p-5"
                                    style={{
                                        background: alert.severity === 'high' ? 'rgba(217, 83, 79, 0.08)' : 'rgba(232, 163, 101, 0.1)',
                                        boxShadow: 'var(--shadow-neu-inset)'
                                    }}
                                >
                                    <p className="font-black text-lg mb-1" style={{ color: alert.severity === 'high' ? '#B91C1C' : 'var(--ee-sun)', fontFamily: 'var(--font-heading)' }}>{alert.title}</p>
                                    <p className="text-sm mb-3" style={{ color: alert.severity === 'high' ? '#DC2626' : '#C47A3A', fontFamily: 'var(--font-body)' }}>{alert.message}</p>
                                    <p className="text-xs uppercase font-bold mb-2" style={{ color: alert.severity === 'high' ? '#DC2626' : 'var(--ee-sun)', fontFamily: 'var(--font-body)' }}>Recommendations:</p>
                                    <ul className="text-sm space-y-1">
                                        {alert.recommendations.slice(0, 2).map((rec, j) => (
                                            <li key={j} className="flex items-start gap-2">
                                                <span style={{ color: alert.severity === 'high' ? '#DC2626' : 'var(--ee-sun)' }}>&bull;</span>
                                                <span style={{ color: alert.severity === 'high' ? '#991B1B' : '#9A6830', fontFamily: 'var(--font-body)' }}>{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
