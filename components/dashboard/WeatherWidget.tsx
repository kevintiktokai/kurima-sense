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

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ lat, lon, compact = false }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeather = async (latitude: number, longitude: number) => {
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

                setWeather({
                    temperature: Math.round(data.current?.temperature_2m || 0),
                    condition: weatherInfo.description,
                    humidity: data.current?.relative_humidity_2m || 0,
                    windSpeed: Math.round(data.current?.wind_speed_10m || 0),
                    icon: weatherInfo.icon,
                    forecast
                });
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
            <div className="bg-gradient-to-br from-sky-400 to-blue-500 p-6 rounded-[2rem] text-white animate-pulse min-h-[180px]">
                <div className="h-4 w-20 bg-white/30 rounded mb-4" />
                <div className="h-12 w-24 bg-white/30 rounded" />
            </div>
        );
    }

    if (error || !weather) {
        return (
            <div className="bg-slate-100 p-6 rounded-[2rem] text-slate-400 flex items-center justify-center min-h-[180px]">
                <span>🌡️ Weather unavailable</span>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="bg-gradient-to-br from-sky-400 to-blue-500 p-4 rounded-2xl text-white flex items-center gap-3">
                <span className="text-3xl">{weather.icon}</span>
                <div>
                    <span className="text-2xl font-black">{weather.temperature}°C</span>
                    <p className="text-xs text-white/80">{weather.condition}</p>
                </div>
            </div>
        );
    }

    return (
        <div id="weather-widget-main" className="bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 p-6 lg:p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />

            {/* Current Weather */}
            <div id="current-weather-section" className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Current Weather</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black">{weather.temperature}°</span>
                            <span className="text-lg font-bold text-white/80">C</span>
                        </div>
                        <p className="text-sm font-bold text-white/80 mt-1">{weather.condition}</p>
                    </div>
                    <span className="text-5xl">{weather.icon}</span>
                </div>

                {/* Stats Row */}
                <div className="flex gap-6 mb-6">
                    <div>
                        <span className="text-xs font-bold text-white/50 uppercase">Humidity</span>
                        <p className="text-lg font-black">{weather.humidity}%</p>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-white/50 uppercase">Wind</span>
                        <p className="text-lg font-black">{weather.windSpeed} km/h</p>
                    </div>
                </div>

                {/* 5-Day Forecast */}
                {weather.forecast && weather.forecast.length > 0 && (
                    <div id="forecast-row" className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                        <div className="flex justify-between">
                            {weather.forecast.map((day, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-[10px] font-bold text-white/60 uppercase mb-1">{day.day}</p>
                                    <span className="text-xl">{day.icon}</span>
                                    <p className="text-xs font-bold mt-1">{day.high}°</p>
                                    <p className="text-[10px] text-white/60">{day.low}°</p>
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
