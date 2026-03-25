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
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-brand-lime border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading Climate Intelligence...</p>
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
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Weather for:</label>
                        <select
                            value={selectedFieldId || ''}
                            onChange={(e) => setSelectedFieldId(e.target.value || undefined)}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-brand-dark font-semibold focus:outline-none focus:ring-2 focus:ring-brand-lime"
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
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-4">
                        <div className="text-3xl">⚠️</div>
                        <div className="flex-1">
                            <h4 className="font-black text-red-700">Weather Alerts Active</h4>
                            <div className="space-y-2 mt-2">
                                {alerts.alerts.slice(0, 3).map((alert, i) => (
                                    <div key={i} className="bg-white rounded-xl p-3 border border-red-100">
                                        <p className="font-bold text-red-800">{alert.title}</p>
                                        <p className="text-sm text-red-600">{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Weather Hero */}
            <div className="col-span-12 lg:col-span-8">
                <div className="bg-gradient-to-br from-brand-dark to-[#1a2616] p-8 lg:p-12 rounded-[2.5rem] text-white relative overflow-hidden min-h-[280px]">
                    <div className="relative z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-white/60 font-bold text-sm uppercase tracking-widest mb-2">Current Conditions</p>
                                <div className="flex items-end gap-4">
                                    <span className="text-7xl lg:text-8xl font-black">{Math.round(current?.temperature || 0)}°</span>
                                    <span className="text-6xl mb-2">{getWeatherIcon(current?.weather_code || 0)}</span>
                                </div>
                                <p className="text-2xl font-bold text-brand-lime mt-2">{current?.weather_description}</p>
                                <p className="text-white/70 mt-1">Feels like {Math.round(current?.feels_like || 0)}°C</p>
                            </div>
                            <div className="text-right space-y-3">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                    <p className="text-xs text-white/60 uppercase">Humidity</p>
                                    <p className="text-xl font-black">{current?.humidity}%</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                    <p className="text-xs text-white/60 uppercase">Wind</p>
                                    <p className="text-xl font-black">{Math.round(current?.wind_speed || 0)} km/h</p>
                                    <p className="text-xs text-white/60">{current?.wind_direction_text}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                    <p className="text-xs text-white/60 uppercase">UV Index</p>
                                    <p className="text-xl font-black">{current?.uv_index}</p>
                                    <p className="text-xs text-brand-lime">{current?.uv_level}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime opacity-10 rounded-full blur-[80px] pointer-events-none"></div>
                </div>
            </div>

            {/* Historical Comparison */}
            <div className="col-span-12 lg:col-span-4">
                <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-slate-100 h-full">
                    <h4 className="font-black text-brand-dark text-lg mb-4">📊 Historical Comparison</h4>
                    {historicalLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-3 w-32 bg-slate-100 rounded mb-4" />
                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <div className="h-3 w-24 bg-slate-200 rounded" />
                                <div className="h-8 w-20 bg-slate-200 rounded" />
                                <div className="h-3 w-36 bg-slate-100 rounded" />
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <div className="h-3 w-24 bg-slate-200 rounded" />
                                <div className="h-8 w-20 bg-slate-200 rounded" />
                                <div className="h-3 w-36 bg-slate-100 rounded" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">{historical?.comparison_period}</p>
                            <div className="space-y-4">
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-sm text-slate-500 font-medium">Temperature</p>
                                    <p className={`text-2xl font-black ${(historical?.deviation?.temperature || 0) > 0 ? 'text-orange-500' : 'text-blue-500'}`}>
                                        {historical?.deviation?.temperature !== undefined && historical?.deviation?.temperature !== null ? (historical.deviation.temperature > 0 ? '+' : '') + historical.deviation.temperature + '°C' : '—'}
                                    </p>
                                    <p className="text-sm text-slate-600">{historical?.deviation?.temperature_text}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-sm text-slate-500 font-medium">Precipitation</p>
                                    <p className={`text-2xl font-black ${(historical?.deviation?.precipitation || 0) > 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                                        {historical?.deviation?.precipitation !== undefined && historical?.deviation?.precipitation !== null ? (historical.deviation.precipitation > 0 ? '+' : '') + historical.deviation.precipitation + '%' : '—'}
                                    </p>
                                    <p className="text-sm text-slate-600">{historical?.deviation?.precipitation_text}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 7-Day Forecast */}
            <div className="col-span-12">
                <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-lg border border-slate-100">
                    <h4 className="font-black text-brand-dark text-xl mb-6">7-Day Forecast</h4>
                    <div className="grid grid-cols-7 gap-2 lg:gap-4">
                        {daily.slice(0, 7).map((day, i) => (
                            <button
                                key={day.date}
                                onClick={() => setSelectedDay(i)}
                                className={`p-3 lg:p-4 rounded-2xl transition-all text-center ${selectedDay === i
                                    ? 'bg-brand-dark text-white scale-105 shadow-xl'
                                    : 'bg-slate-50 hover:bg-slate-100 text-brand-dark'
                                    }`}
                            >
                                <p className={`text-xs font-bold uppercase ${selectedDay === i ? 'text-brand-lime' : 'text-slate-400'}`}>
                                    {getDayName(day.date, true)}
                                </p>
                                <p className="text-3xl my-2">{getWeatherIcon(day.weather_code)}</p>
                                <p className="font-black text-lg">{Math.round(day.temp_max)}°</p>
                                <p className={`text-sm ${selectedDay === i ? 'text-white/60' : 'text-slate-400'}`}>
                                    {Math.round(day.temp_min)}°
                                </p>
                                {(day.precipitation_probability || 0) > 30 && (
                                    <p className="text-xs text-blue-500 font-bold mt-1">💧 {day.precipitation_probability}%</p>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Selected day details */}
                    {daily[selectedDay] && (
                        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-400 uppercase">Sunrise</p>
                                <p className="font-bold text-brand-dark">{daily[selectedDay].sunrise?.split('T')[1]?.slice(0, 5) || '—'}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-400 uppercase">Sunset</p>
                                <p className="font-bold text-brand-dark">{daily[selectedDay].sunset?.split('T')[1]?.slice(0, 5) || '—'}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-400 uppercase">Rain</p>
                                <p className="font-bold text-brand-dark">{daily[selectedDay].precipitation || 0}mm</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-400 uppercase">UV Index</p>
                                <p className="font-bold text-brand-dark">{daily[selectedDay].uv_index_max}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-400 uppercase">ET₀</p>
                                <p className="font-bold text-brand-dark">{daily[selectedDay].evapotranspiration?.toFixed(1) || 0}mm</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 24-Hour Temperature & Precipitation Chart */}
            <div className="col-span-12 lg:col-span-8">
                <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-lg border border-slate-100">
                    <h4 className="font-black text-brand-dark text-xl mb-2">24-Hour Outlook</h4>
                    <p className="text-sm text-slate-400 mb-6">Temperature and precipitation probability</p>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={hourlyChartData}>
                                <defs>
                                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D7F26C" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#D7F26C" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    yAxisId="temp"
                                    orientation="left"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={['dataMin - 2', 'dataMax + 2']}
                                />
                                <YAxis
                                    yAxisId="precip"
                                    orientation="right"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#2D3A26',
                                        borderRadius: '1rem',
                                        border: 'none',
                                        color: '#fff'
                                    }}
                                    itemStyle={{ color: '#D7F26C' }}
                                />
                                <Area
                                    yAxisId="temp"
                                    type="monotone"
                                    dataKey="temperature"
                                    stroke="#2D3A26"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#tempGradient)"
                                    name="Temperature (°C)"
                                />
                                <Bar
                                    yAxisId="precip"
                                    dataKey="precipitation"
                                    fill="#3b82f6"
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
                <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-slate-100 h-full">
                    <h4 className="font-black text-brand-dark text-lg mb-1">🌿 Spray Window</h4>
                    <p className="text-xs text-slate-400 mb-4">Optimal times for pesticide/herbicide application</p>

                    {sprayLoading ? (
                        <div className="space-y-3 animate-pulse">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-200 rounded-full" />
                                    <div className="space-y-1 flex-1">
                                        <div className="h-3 w-16 bg-slate-200 rounded" />
                                        <div className="h-3 w-24 bg-slate-100 rounded" />
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
                                    <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                                            ✓
                                        </div>
                                        <div>
                                            <p className="font-bold text-emerald-800">{day}</p>
                                            <p className="text-sm text-emerald-600">{startTime} - {endTime}</p>
                                        </div>
                                    </div>
                                );
                            })}

                            {(!sprayWindow?.ideal_windows || sprayWindow.ideal_windows.length === 0) && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                    <p className="text-amber-800 font-bold">⚠️ No ideal windows</p>
                                    <p className="text-sm text-amber-600">Check hourly conditions for acceptable times</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                        <p className="font-bold text-slate-700 mb-1">Ideal Conditions:</p>
                        <p>Wind: 3-10 km/h • Temp: 15-28°C • No rain</p>
                    </div>
                </div>
            </div>

            {/* Agricultural Metrics */}
            <div className="col-span-12 lg:col-span-6">
                <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-lg border border-slate-100">
                    <h4 className="font-black text-brand-dark text-xl mb-6">🌱 Growing Degree Days</h4>

                    {agriculturalLoading ? (
                        <div className="animate-pulse space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-3 w-36 bg-slate-200 rounded" />
                                    <div className="h-3 w-10 bg-slate-200 rounded" />
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="bg-slate-50 rounded-xl p-4 text-center space-y-2">
                                        <div className="h-2 w-16 bg-slate-200 rounded mx-auto" />
                                        <div className="h-8 w-12 bg-slate-200 rounded mx-auto" />
                                        <div className="h-2 w-8 bg-slate-100 rounded mx-auto" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-6 mb-6">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-bold text-slate-500">Progress to Maturity</span>
                                        <span className="text-sm font-black text-brand-dark">
                                            {agricultural?.growing_degree_days?.progress_percent?.toFixed(0) || 0}%
                                        </span>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-brand-lime to-emerald-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${agricultural?.growing_degree_days?.progress_percent || 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-brand-lime/20 rounded-xl p-4 text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Accumulated</p>
                                    <p className="text-2xl font-black text-brand-dark">{agricultural?.growing_degree_days?.total_gdd?.toLocaleString() || 0}</p>
                                    <p className="text-xs text-slate-400">GDD</p>
                                </div>
                                <div className="bg-slate-100 rounded-xl p-4 text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Remaining</p>
                                    <p className="text-2xl font-black text-brand-dark">{agricultural?.growing_degree_days?.remaining_gdd?.toLocaleString() || 0}</p>
                                    <p className="text-xs text-slate-400">GDD</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Est. Maturity</p>
                                    <p className="text-lg font-black text-emerald-600">
                                        {agricultural?.growing_degree_days?.days_to_maturity ? `${agricultural.growing_degree_days.days_to_maturity}d` : '—'}
                                    </p>
                                    <p className="text-xs text-slate-400">{agricultural?.growing_degree_days?.status || ''}</p>
                                </div>
                            </div>

                            {gddData.length > 0 && (
                                <div className="mt-6 h-[120px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={gddData}>
                                            <defs>
                                                <linearGradient id="gddGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#2D3A26', borderRadius: '0.5rem', border: 'none' }}
                                                labelStyle={{ color: '#D7F26C' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="cumulative"
                                                stroke="#22c55e"
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
                <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-lg border border-slate-100">
                    <h4 className="font-black text-brand-dark text-xl mb-6">💧 Water Balance</h4>

                    {agriculturalLoading ? (
                        <div className="animate-pulse space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                    <div className="h-2 w-20 bg-slate-200 rounded" />
                                    <div className="h-10 w-16 bg-slate-200 rounded" />
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                    <div className="h-2 w-20 bg-slate-200 rounded" />
                                    <div className="h-10 w-16 bg-slate-200 rounded" />
                                </div>
                            </div>
                            <div className="h-16 bg-slate-100 rounded-xl" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="h-2 w-16 bg-slate-200 rounded" />
                                    <div className="h-3 bg-slate-100 rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-16 bg-slate-200 rounded" />
                                    <div className="h-8 w-20 bg-slate-200 rounded" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50 rounded-xl p-4">
                                    <p className="text-xs text-blue-600 uppercase font-bold mb-1">Weekly Rain</p>
                                    <p className="text-3xl font-black text-blue-700">
                                        {agricultural?.water_balance?.weekly_precipitation?.toFixed(1) || 0}
                                        <span className="text-lg">mm</span>
                                    </p>
                                </div>
                                <div className="bg-orange-50 rounded-xl p-4">
                                    <p className="text-xs text-orange-600 uppercase font-bold mb-1">Weekly ET</p>
                                    <p className="text-3xl font-black text-orange-700">
                                        {agricultural?.water_balance?.weekly_et?.toFixed(1) || 0}
                                        <span className="text-lg">mm</span>
                                    </p>
                                </div>
                            </div>

                            <div className={`rounded-xl p-4 mb-6 ${agricultural?.water_balance?.status === 'surplus' ? 'bg-blue-600 border-blue-700' :
                                agricultural?.water_balance?.status === 'deficit' ? 'bg-red-600 border-red-700' :
                                    'bg-emerald-600 border-emerald-700'
                                } border-2`}>
                                <p className="font-black text-lg text-white">
                                    Balance: {agricultural?.water_balance?.balance?.toFixed(1) || 0}mm
                                    <span className="ml-2">
                                        {agricultural?.water_balance?.status === 'surplus' ? '💧' :
                                            agricultural?.water_balance?.status === 'deficit' ? '🏜️' : '✅'}
                                    </span>
                                </p>
                                <p className="text-sm mt-1 text-white/90">{agricultural?.water_balance?.irrigation_recommendation}</p>
                            </div>

                            <h5 className="font-bold text-slate-700 mb-3">Soil Conditions</h5>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Moisture</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-sky-500 rounded-full"
                                                style={{ width: `${agricultural?.moisture?.shallow_pct || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold">{agricultural?.moisture?.shallow_pct?.toFixed(0) || 0}%</span>
                                    </div>
                                    <p className="text-xs text-slate-400">{agricultural?.moisture?.status}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Soil Temp</p>
                                    <p className="text-2xl font-black text-brand-dark">{agricultural?.soil?.surface?.toFixed(1) || '—'}°C</p>
                                    <p className="text-xs text-slate-400">Surface temperature</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* All Alerts */}
            {!alertsLoading && alerts && alerts.alerts.length > 0 && (
                <div className="col-span-12">
                    <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-lg border border-slate-100">
                        <h4 className="font-black text-brand-dark text-xl mb-6">⚠️ All Weather Alerts</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {alerts.alerts.map((alert, i) => (
                                <div
                                    key={i}
                                    className={`rounded-2xl p-5 ${alert.severity === 'high' ? 'bg-red-100 border-2 border-red-300' :
                                        'bg-amber-100 border-2 border-amber-300'
                                        }`}
                                >
                                    <p className={`font-black text-lg mb-1 ${alert.severity === 'high' ? 'text-red-800' : 'text-amber-900'}`}>{alert.title}</p>
                                    <p className={`text-sm mb-3 ${alert.severity === 'high' ? 'text-red-700' : 'text-amber-800'}`}>{alert.message}</p>
                                    <p className={`text-xs uppercase font-bold mb-2 ${alert.severity === 'high' ? 'text-red-600' : 'text-amber-700'}`}>Recommendations:</p>
                                    <ul className="text-sm space-y-1">
                                        {alert.recommendations.slice(0, 2).map((rec, j) => (
                                            <li key={j} className="flex items-start gap-2">
                                                <span className={`${alert.severity === 'high' ? 'text-red-500' : 'text-amber-600'}`}>•</span>
                                                <span className={`${alert.severity === 'high' ? 'text-red-700' : 'text-amber-800'}`}>{rec}</span>
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
