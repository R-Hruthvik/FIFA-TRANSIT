import { getWeatherAdvisory } from "./weather";

describe("Weather Advisory helper", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches Open-Meteo weather data successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 23.5,
          weather_code: 0,
        },
      }),
    });

    const advisory = await getWeatherAdvisory(40.7128, -74.0060, "open-meteo");
    expect(advisory.condition).toBe("clear");
    expect(advisory.tempC).toBe(23.5);
    expect(advisory.label).toBe("Clear skies · 24°C");
  });

  it("handles Open-Meteo failure gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network Error"));

    const advisory = await getWeatherAdvisory(40.7128, -74.0060, "open-meteo");
    expect(advisory.condition).toBe("unknown");
    expect(advisory.tempC).toBe(0);
    expect(advisory.label).toBe("Weather unavailable");
  });

  it("handles OpenWeather failure gracefully if API key is missing", async () => {
    const origKey = process.env.OPENWEATHER_API_KEY;
    delete process.env.OPENWEATHER_API_KEY;

    const advisory = await getWeatherAdvisory(40.7128, -74.0060, "openweather");
    expect(advisory.condition).toBe("unknown");

    process.env.OPENWEATHER_API_KEY = origKey;
  });

  it("fetches OpenWeather data successfully with API key", async () => {
    const origKey = process.env.OPENWEATHER_API_KEY;
    process.env.OPENWEATHER_API_KEY = "test_key";

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        main: { temp: 18.2 },
        weather: [{ id: 500, description: "light rain" }],
      }),
    });

    const advisory = await getWeatherAdvisory(40.7128, -74.0060, "openweather");
    expect(advisory.condition).toBe("rain");
    expect(advisory.tempC).toBe(18.2);
    expect(advisory.label).toBe("Rain · 18°C");

    process.env.OPENWEATHER_API_KEY = origKey;
  });
});
