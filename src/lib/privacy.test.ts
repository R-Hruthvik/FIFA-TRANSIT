import { pseudonymize, anonymizeAndAggregate, hasConsent, recordConsent } from "./privacy";

const mockDbStore = new Map<string, any>();

jest.mock("@/lib/db", () => {
  const mockCollection = {
    findOne: jest.fn().mockImplementation(async (query) => {
      return mockDbStore.get(query.userId) || null;
    }),
    updateOne: jest.fn().mockImplementation(async (query, update) => {
      mockDbStore.set(query.userId, { ...query, ...update.$set });
      return { modifiedCount: 1 };
    }),
    aggregate: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { gateId: "gate1", hourBucket: "2026-07-19-20", eventCount: 2, uniquePseudonyms: 2 },
      ]),
    }),
    bulkWrite: jest.fn().mockResolvedValue({}),
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
  };
});

describe("Privacy helper utilities", () => {
  it("generates stable pseudonyms", () => {
    const p1 = pseudonymize("user123", "salt_value");
    const p2 = pseudonymize("user123", "salt_value");
    const p3 = pseudonymize("user456", "salt_value");

    expect(p1).toBe(p2);
    expect(p1).not.toBe(p3);
    expect(p1.startsWith("anon_")).toBe(true);
  });

  it("manages user consent", async () => {
    mockDbStore.clear();
    let optIn = await hasConsent("user1");
    expect(optIn).toBe(false);

    await recordConsent("user1", true);
    optIn = await hasConsent("user1");
    expect(optIn).toBe(true);

    await recordConsent("user1", false);
    optIn = await hasConsent("user1");
    expect(optIn).toBe(false);
  });

  it("aggregates anonymized analytics data", async () => {
    await expect(anonymizeAndAggregate()).resolves.not.toThrow();
  });
});
