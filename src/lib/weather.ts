import "server-only";
import type { WeatherDay, WeatherHour, WeatherSnapshot } from "@/lib/weather-shared";

export type { WeatherDay, WeatherHour, WeatherSnapshot } from "@/lib/weather-shared";
export { weatherLabel } from "@/lib/weather-shared";

/** MTC home base — Little Elm, TX. */
export const WEATHER_PLACE = {
  name: "Little Elm, TX",
  latitude: 33.1626,
  longitude: -96.9375,
  timezone: "America/Chicago",
} as const;

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

interface OpenMeteoResponse {
  timezone?: string;
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    is_day: number;
  };
  hourly?: {
    time: number[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
  daily?: {
    time: number[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

export async function getLittleElmWeather(): Promise<WeatherSnapshot | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(WEATHER_PLACE.latitude));
  url.searchParams.set("longitude", String(WEATHER_PLACE.longitude));
  url.searchParams.set("timezone", WEATHER_PLACE.timezone);
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,is_day"
  );
  url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability");
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
  );
  url.searchParams.set("timeformat", "unixtime");

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;
    if (!current || !hourly || !daily) return null;

    const now = Date.now();
    const hours: WeatherHour[] = [];
    for (let i = 0; i < hourly.time.length; i++) {
      const stamp = hourly.time[i] * 1000;
      if (stamp < now - 60 * 60 * 1000) continue;
      hours.push({
        time: new Date(stamp).toISOString(),
        tempF: cToF(hourly.temperature_2m[i]),
        code: hourly.weather_code[i],
        precipChance: hourly.precipitation_probability[i] ?? 0,
      });
      if (hours.length >= 16) break;
    }

    const days: WeatherDay[] = daily.time.map((date, i) => ({
      date: new Date(date * 1000).toISOString(),
      code: daily.weather_code[i],
      highF: cToF(daily.temperature_2m_max[i]),
      lowF: cToF(daily.temperature_2m_min[i]),
      precipChance: daily.precipitation_probability_max[i] ?? 0,
    }));

    return {
      fetchedAt: new Date().toISOString(),
      timezone: data.timezone ?? WEATHER_PLACE.timezone,
      place: WEATHER_PLACE.name,
      current: {
        tempF: cToF(current.temperature_2m),
        feelsF: cToF(current.apparent_temperature),
        code: current.weather_code,
        humidity: current.relative_humidity_2m,
        windMph: kmhToMph(current.wind_speed_10m),
        isDay: current.is_day === 1,
      },
      hours,
      days,
    };
  } catch {
    return null;
  }
}
