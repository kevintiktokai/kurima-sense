"use client";

import React, { useEffect, useState } from 'react';

interface WeatherData {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    icon: string;
    location?: string;
    forecast?: ForecastDay[];
}

interface ForecastDay {
    day: string;
    high: number;
    low: number;
    icon: string;
}

interface WeatherWidgetProps {
    lat?: number;
    lon?: number;
    compact?: boolean;
}

// Weather code to icon/description mapping (WMO codes)
const weatherCodeMap: Record<number, { icon: string; description: string }> = {
    0: { icon: '☀️', description: 'Clear sky' },
    1: { icon: '🌤️', description: 'Mainly clear' },
    2: { icon: '⛅', description: 'Partly cloudy' },
    3: { icon: '☁️', description: 'Overcast' },
    45: { icon: '🌫️', description: 'Foggy' },
    48: { icon: '🌫️', description: 'Depositing rime fog' },
    51: { icon: '🌧️', description: 'Light drizzle' },
    53: { icon: '🌧️', description: 'Moderate drizzle' },
    55: { icon: '🌧️', description: 'Dense drizzle' },
    61: { icon: '🌧️', description: 'Slight rain' },
    63: { icon: '🌧️', description: 'Moderate rain' },
    65: { icon: '🌧️', description: 'Heavy rain' },
    71: { icon: '🌨️', description: 'Slight snow' },
    73: { icon: '🌨️', description: 'Moderate snow' },
    75: { icon: '❄️', description: 'Heavy snow' },
    80: { icon: '🌦️', description: 'Rain showers' },
    81: { icon: '🌧️', description: 'Moderate showers' },
    82: { icon: '⛈️', description: 'Violent showers' },
    95: { icon: '⛈️', description: 'Thunderstorm' },
    96: { icon: '⛈️', description: 'Thunderstorm with hail' },
    99: { icon: '⛈️', description: 'Severe thunderstorm' },
};

const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// Module-level cache — survives re-mounts and re-renders, TTL 5 minutes
const _weatherCache: Record<string, { data: WeatherData; fetchedAt: number }> = {};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ lat, lon, compact = false }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeather = async (latitude: number, longitude: number) => {
            const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
            const cached = _weatherCache[key];
            if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
                setWeather(cached.data);
                setLoading(false);
                return;
            }

            try {
                // Using Open-Meteo API (free, no API key required)
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
                );

                if (!response.ok) throw new Error('Weather fetch failed');

                const data = await response.json();

                const weatherCode = data.current?.weather_code || 0;
                const weatherInfo = weatherCodeMap[weatherCode] || { icon: '🌡️', description: 'Unknown' };

                const forecast: ForecastDay[] = data.daily?.time?.slice(0, 5).map((date: string, i: number) => ({
                    day: getDayName(date),
                    high: Math.round(data.daily.temperature_2m_max[i]),
                    low: Math.round(data.daily.temperature_2m_min[i]),
                    icon: weatherCodeMap[data.daily.weather_code[i]]?.icon || '🌡️'
                })) || [];

                const weatherResult: WeatherData = {
                    temperature: Math.round(data.current?.temperature_2m || 0),
                    condition: weatherInfo.description,
                    humidity: data.current?.relative_humidity_2m || 0,
                    windSpeed: Math.round(data.current?.wind_speed_10m || 0),
                    icon: weatherInfo.icon,
                    forecast
                };

                _weatherCache[key] = { data: weatherResult, fetchedAt: Date.now() };
                setWeather(weatherResult);
            } catch (err) {
                console.error('Weather error:', err);
                setError('Unable to load weather');
            } finally {
                setLoading(false);
            }
        };

        // Use provided coordinates or get from geolocation
        if (lat && lon) {
            fetchWeather(lat, lon);
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    // Fallback to Zimbabwe (Harare)
                    fetchWeather(-17.8292, 31.0522);
                },
                { timeout: 5000 }
            );
        } else {
            // Fallback to Zimbabwe (Harare)
            fetchWeather(-17.8292, 31.0522);
        }
    }, [lat, lon]);

    if (loading) {
        return (
            <div className="neu-surface p-6 animate-pulse min-h-[180px]">
                <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--ee-bg-pressed)' }} />
                <div className="h-12 w-24 rounded mt-4" style={{ backgroundColor: 'var(--ee-bg-pressed)' }} />
            </div>
        );
    }

    if (error || !weather) {
        return (
            <div className="neu-surface p-6 flex items-center justify-center min-h-[180px]" style={{ color: 'var(--ee-muted)' }}>
                <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>thermostat</span>
                <span style={{ fontFamily: 'var(--font-body)' }}>Weather unavailable</span>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="neu-surface p-4 flex items-center gap-3">
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--ee-sun)', opacity: 0.15 }}
                >
                    <span className="text-2xl">{weather.icon}</span>
                </div>
                <div>
                    <span className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>{weather.temperature}°C</span>
                    <p className="text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{weather.condition}</p>
                </div>
            </div>
        );
    }

    return (
        <div id="weather-widget-main" className="neu-surface p-6 lg:p-8 relative overflow-hidden">
            {/* Gradient sun circle decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10" style={{
                background: 'radial-gradient(circle, rgba(232, 163, 101, 0.2) 0%, transparent 70%)',
            }} />

            {/* Current Weather */}
            <div id="current-weather-section" className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Current Weather</h4>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{weather.temperature}°</span>
                            <span className="text-lg" style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, color: 'var(--ee-muted)' }}>C</span>
                        </div>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{weather.condition}</p>
                    </div>
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(232, 163, 101, 0.25), rgba(232, 163, 101, 0.05))',
                        }}
                    >
                        <span className="text-4xl">{weather.icon}</span>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex gap-6 mb-6">
                    <div>
                        <span className="text-xs font-bold uppercase" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Humidity</span>
                        <p className="text-lg" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-water)' }}>{weather.humidity}%</p>
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Wind</span>
                        <p className="text-lg" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>{weather.windSpeed} km/h</p>
                    </div>
                </div>

                {/* 5-Day Forecast */}
                {weather.forecast && weather.forecast.length > 0 && (
                    <div id="forecast-row" className="rounded-[16px] p-4" style={{ backgroundColor: 'var(--ee-bg)' }}>
                        <div className="flex justify-between">
                            {weather.forecast.map((day, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{day.day}</p>
                                    <span className="text-xl">{day.icon}</span>
                                    <p className="text-xs font-bold mt-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>{day.high}°</p>
                                    <p className="text-[10px]" style={{ color: 'var(--ee-muted)' }}>{day.low}°</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;
