import { getSettings, getDefaultGates, getDefaultBeacons, getDefaultGateIds } from "./settings";

jest.mock("@/lib/db", () => {
  const mockCollection = {
    findOne: jest.fn().mockImplementation(async (query) => {
      return {
        _id: "global",
        featureFlags: { enableOneTap: true },
      };
    }),
  };

  const mockDb = {
    collection: () => mockCollection,
  };

  const mockClient = {
    db: () => mockDb,
    connect: jest.fn().mockResolvedValue({}),
  };

  return {
    clientPromise: Promise.resolve(mockClient),
    GLOBAL_SETTINGS_ID: "global",
  };
});

describe("App Settings loader", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...origEnv };
  });

  afterAll(() => {
    process.env = origEnv;
  });

  it("should return settings with merged defaults and loaded db configs", async () => {
    process.env.GEMINI_API_KEY = "test_gemini";
    process.env.GOOGLE_MAPS_API_KEY = "test_maps";

    const settings = await getSettings();
    
    expect(settings.featureFlags.enableOneTap).toBe(true);
    expect(settings.featureFlags.enableRealMatchData).toBe(false);
    expect(settings.aiProvider.secret.apiKeySet).toBe(true);
    expect(settings.maps.secret.apiKeySet).toBe(true);
    expect(settings.email.secret.apiKeySet).toBe(false);
  });

  it("should provide default gate configurations", () => {
    const gates = getDefaultGates();
    expect(gates.length).toBe(8);

    const beacons = getDefaultBeacons();
    expect(beacons.length).toBe(8);

    const gateIds = getDefaultGateIds();
    expect(gateIds.length).toBe(8);
  });
});
