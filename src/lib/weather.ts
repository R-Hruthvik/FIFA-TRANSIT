/**
 * Live weather advisory integration.
 *
 * Supports two providers:
 *  1. Open-Meteo (default, free, no API key needed) — recommended
 *  2. OpenWeatherMap (requires `OPENWEATHER_API_KEY` env var)
 *
 * Provider and stadium coordinates are configurable via admin settings.
 * Returns a `WeatherAdvisory` matching the `StadiumTelemetry` shape.
 */

export interface WeatherAdvisory {
  label: string;
  condition: "clear" | "rain" | "cloudy" | "storm" | "fog" | "snow" | "unknown";
  tempC: number;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m: number;
    weather_code: number;
  };
}

interface OpenWeatherResponse {
  main?: { temp: number };
  weather?: Array<{ id: number; description: string }>;
}

/** Map WMO weather codes (0–99) to our condition enum. */
function wmoCodeToCondition(code: number): WeatherAdvisory["condition"] {
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code <= 49) return "fog";
  if (code <= 59) return "rain";
  if (code <= 69) return "rain";
  if (code <= 79) return "storm";
  if (code <= 82) return "rain";
  if (code <= 86) return "storm";
  if (code <= 99) return "storm";
  return "unknown";
}

function openWeatherIdToCondition(id: number): WeatherAdvisory["condition"] {
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 400) return "rain";
  if (id >= 500 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "fog";
  if (id === 800) return "clear";
  if (id > 800 && id < 900) return "cloudy";
  return "unknown";
}

function conditionLabel(condition: WeatherAdvisory["condition"], tempC: number): string {
  const parts: string[] = [];
  if (condition === "clear") parts.push("Clear skies");
  else if (condition === "cloudy") parts.push("Cloudy");
  else if (condition === "rain") parts.push("Rain");
  else if (condition === "storm") parts.push("Thunderstorms");
  else if (condition === "fog") parts.push("Fog");
  else if (condition === "snow") parts.push("Snow");
  else parts.push("Unknown conditions");

  parts.push(`${Math.round(tempC)}°C`);
  return parts.join(" · ");
}

/**
 * Fetch live weather advisory for stadium coordinates.
 *
 * @param lat Stadium latitude
 * @param lng Stadium longitude
 * @param provider "open-meteo" (default, free) or "openweather" (needs API key)
 */
export async function getWeatherAdvisory(
  lat: number,
  lng: number,
  provider: "open-meteo" | "openweather" = "open-meteo",
): Promise<WeatherAdvisory> {
  if (provider === "openweather") {
    return fetchOpenWeather(lat, lng);
  }

  return fetchOpenMeteo(lat, lng);
}

async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherAdvisory> {
  const fallback: WeatherAdvisory = {
    label: "Weather unavailable",
    condition: "unknown",
    tempC: 0,
  };

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "temperature_2m,weather_code");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return fallback;

    const data: OpenMeteoResponse = await res.json();
    const current = data.current;
    if (!current) return fallback;

    const condition = wmoCodeToCondition(current.weather_code);
    const tempC = current.temperature_2m;
    return {
      label: conditionLabel(condition, tempC),
      condition,
      tempC,
    };
  } catch {
    return fallback;
  }
}

async function fetchOpenWeather(lat: number, lng: number): Promise<WeatherAdvisory> {
  const fallback: WeatherAdvisory = {
    label: "Weather unavailable",
    condition: "unknown",
    tempC: 0,
  };

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return fallback;

  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "metric");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return fallback;

    const data: OpenWeatherResponse = await res.json();
    const weatherId = data.weather?.[0]?.id ?? 0;
    const condition = openWeatherIdToCondition(weatherId);
    const tempC = data.main?.temp ?? 0;
    return {
      label: conditionLabel(condition, tempC),
      condition,
      tempC,
    };
  } catch {
    return fallback;
  }
}
