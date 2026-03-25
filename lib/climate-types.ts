/**
 * Climate Intelligence Types for KurimaSense
 */

// Location types
export interface Location {
    lat: number;
    lon: number;
}

// Current weather response
export interface CurrentWeather {
    temperature: number;
    feels_like: number;
    humidity: number;
    precipitation: number;
    weather_code: number;
    weather_description: string;
    wind_speed: number;
    wind_direction: number;
    wind_direction_text: string;
    uv_index: number;
    uv_level: string;
    cloud_cover: number;
    pressure: number;
    time: string;
    timezone: string;
    location: Location;
}

// Hourly forecast item
export interface HourlyForecast {
    time: string;
    temperature: number;
    humidity: number;
    precipitation_probability: number;
    precipitation: number;
    weather_code: number;
    wind_speed: number;
    uv_index: number;
}

// Daily forecast item
export interface DailyForecast {
    date: string;
    temp_max: number;
    temp_min: number;
    feels_like_max: number;
    feels_like_min: number;
    precipitation: number;
    precipitation_probability: number;
    weather_code: number;
    weather_description: string;
    weather_icon: string;
    sunrise: string;
    sunset: string;
    uv_index_max: number;
    wind_speed_max: number;
    evapotranspiration: number;
}

// Forecast response
export interface ForecastResponse {
    location: Location;
    daily: DailyForecast[];
    hourly: HourlyForecast[];
    timezone: string;
}

// Soil temperature data
export interface SoilTemperature {
    surface: number;
    depth_6cm: number;
    depth_18cm: number;
    unit: string;
}

// Soil moisture data
export interface SoilMoisture {
    surface_pct: number;
    shallow_pct: number;
    deep_pct: number;
    status: string;
}

// Evapotranspiration data
export interface Evapotranspiration {
    today: number;
    avg_daily: number;
    weekly_total: number;
    unit: string;
}

// Water balance data
export interface WaterBalance {
    weekly_precipitation: number;
    weekly_et: number;
    balance: number;
    status: 'surplus' | 'balanced' | 'deficit';
    irrigation_recommendation: string;
}

// Growing Degree Days data
export interface GrowingDegreeDays {
    location: Location;
    base_temperature: number;
    start_date: string;
    end_date: string;
    total_gdd: number;
    crop_requirement: number;
    progress_percent: number;
    remaining_gdd: number;
    daily_avg_gdd: number;
    days_to_maturity: number | null;
    estimated_maturity_date: string | null;
    daily_breakdown: { date: string; gdd: number; cumulative: number }[];
    status: string;
}

// Agricultural metrics response
export interface AgriculturalMetrics {
    location: Location;
    soil: SoilTemperature;
    moisture: SoilMoisture;
    evapotranspiration: Evapotranspiration;
    water_balance: WaterBalance;
    growing_degree_days: GrowingDegreeDays;
}

// Weather alert
export interface WeatherAlert {
    type: 'frost' | 'heat' | 'wind' | 'rain' | 'uv';
    severity: 'high' | 'medium' | 'low';
    date: string;
    title: string;
    message: string;
    recommendations: string[];
}

// Alerts response
export interface AlertsResponse {
    location: Location;
    generated_at: string;
    alert_count: number;
    has_critical: boolean;
    alerts: WeatherAlert[];
}

// Spray window hourly status
export interface SprayHourStatus {
    time: string;
    status: 'ideal' | 'acceptable' | 'avoid';
    temperature: number;
    wind_speed: number;
    precipitation_probability: number;
    humidity: number;
    reasons: string[];
}

// Ideal spray window
export interface IdealWindow {
    start: string;
    end: string;
    status: 'ideal';
}

// Spray window response
export interface SprayWindowResponse {
    location: Location;
    generated_at: string;
    ideal_conditions: {
        wind_speed: string;
        temperature: string;
        humidity: string;
        precipitation_probability: string;
    };
    ideal_windows: IdealWindow[];
    hourly_breakdown: SprayHourStatus[];
}

// Historical comparison
export interface HistoricalComparison {
    location: Location;
    comparison_period: string;
    current: {
        temperature: number;
        avg_temp_max: number;
        avg_temp_min: number;
        avg_daily_precip: number;
    };
    historical: {
        avg_temp_max: number;
        avg_temp_min: number;
        avg_daily_precip: number;
    };
    deviation: {
        temperature: number | null;
        temperature_text: string;
        precipitation: number | null;
        precipitation_text: string;
    };
}

// Full climate data response
export interface FullClimateData {
    current: CurrentWeather;
    hourly: { hourly: HourlyForecast[] };
    daily: { daily: DailyForecast[] };
    agricultural: AgriculturalMetrics;
    alerts: AlertsResponse;
    historical: HistoricalComparison;
    generated_at: string;
}

// Helper function to get weather icon from code
export function getWeatherIcon(code: number): string {
    if (code === 0) return '☀️';
    if ([1, 2].includes(code)) return '🌤️';
    if (code === 3) return '☁️';
    if ([45, 48].includes(code)) return '🌫️';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
    if ([66, 67].includes(code)) return '🌨️';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
    if ([95, 96, 99].includes(code)) return '⛈️';
    return '🌡️';
}

// Helper to format day name from date string
export function getDayName(dateString: string, short = false): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: short ? 'short' : 'long' });
}

// Helper to format time from ISO string
export function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}
