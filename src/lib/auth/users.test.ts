/**
 * @jest-environment node
 */
import { findUserByEmail, findUserById, createUser, updateUserRole } from "@/lib/auth/users";

// In-memory mock database store for isolating tests
const mockUsersTable = new Map<string, any>();

jest.mock("@/lib/db", () => {
  const mockCollection = {
    createIndex: jest.fn().mockResolvedValue("index_created"),
    listIndexes: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    }),
    deleteOne: jest.fn().mockImplementation(async (query) => {
      mockUsersTable.delete(query.id);
      return { deletedCount: 1 };
    }),
    insertOne: jest.fn().mockImplementation(async (userData) => {
      mockUsersTable.set(userData.id, { ...userData, _id: "mock_object_id" });
      return { insertedId: "mock_object_id" };
    }),
    findOne: jest.fn().mockImplementation(async (query) => {
      if (query.email && query.email.$regex) {
        // Safe regex parsing for lookup mock
        const regexStr = query.email.$regex.source || query.email.$regex.toString();
        const email = regexStr.replace(/^\^/, '').replace(/\$$/, '');
        for (const user of mockUsersTable.values()) {
          if (user.email.toLowerCase() === email.toLowerCase()) {
            return user;
          }
        }
        return null;
      }
      if (query.id) {
        return mockUsersTable.get(query.id) || null;
      }
      return null;
    }),
    updateOne: jest.fn().mockImplementation(async (query, update) => {
      const user = mockUsersTable.get(query.id);
      if (user && update.$set) {
        Object.assign(user, update.$set);
      }
      return { modifiedCount: 1 };
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
    getUserCollection: jest.fn().mockResolvedValue(mockCollection),
  };
});

describe("Auth user CRUD", () => {
  let testUserId: string;

  it("creates a user and finds by email", async () => {
    const user = await createUser({
      id: crypto.randomUUID(),
      email: "test-phase0@fifa.test",
      emailVerified: null,
      name: "Phase 0 Test",
      image: null,
      googleId: null,
      passwordHash: "hashed",
      role: "fan",
      staffStatus: "none",
      staffRequestedAt: null,
      approvedAt: null,
      approvedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignIn: new Date(),
    });
    testUserId = user.id;

    const found = await findUserByEmail("test-phase0@fifa.test");
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Phase 0 Test");
    expect(found!.role).toBe("fan");
  });

  it("updates user role", async () => {
    await updateUserRole(testUserId, "admin");
    const found = await findUserById(testUserId);
    expect(found).not.toBeNull();
    expect(found!.role).toBe("admin");
  });
});
