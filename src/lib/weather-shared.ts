export type WeatherHour = {
  time: string;
  tempF: number;
  code: number;
  precipChance: number;
};

export type WeatherDay = {
  date: string;
  code: number;
  highF: number;
  lowF: number;
  precipChance: number;
};

export type WeatherSnapshot = {
  fetchedAt: string;
  timezone: string;
  place: string;
  current: {
    tempF: number;
    feelsF: number;
    code: number;
    humidity: number;
    windMph: number;
    isDay: boolean;
  };
  hours: WeatherHour[];
  days: WeatherDay[];
};

export function weatherLabel(code: number, isDay = true): string {
  if (code === 0) return isDay ? "Clear" : "Clear night";
  if (code <= 3) return code === 1 ? "Mostly clear" : code === 2 ? "Partly cloudy" : "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorms";
  return "Fair";
}
