/**
 * @jest-environment node
 */
import { findUserByEmail, findUserById, createUser, updateUserRole } from "@/lib/auth/users";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-const
let mockUserStore: Record<string, any> = {};

const mockUsersCollection = {
  createIndex: jest.fn().mockResolvedValue("email_1"),
  deleteOne: jest.fn().mockImplementation((q) => {
    delete mockUserStore[q.id];
    return Promise.resolve({ deletedCount: 1 });
  }),
  findOne: jest.fn().mockImplementation((q) => {
    if (q.id) {
      return Promise.resolve(mockUserStore[q.id] || null);
    }
    const found = Object.values(mockUserStore)[0];
    return Promise.resolve(found || null);
  }),
  insertOne: jest.fn().mockImplementation((doc) => {
    mockUserStore[doc.id] = doc;
    return Promise.resolve({ insertedId: doc.id });
  }),
  updateOne: jest.fn().mockImplementation((q, update) => {
    if (mockUserStore[q.id] && update.$set) {
      Object.assign(mockUserStore[q.id], update.$set);
    }
    return Promise.resolve({ modifiedCount: 1 });
  }),
  listIndexes: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
};

jest.mock("@/lib/db", () => ({
  clientPromise: Promise.resolve({
    db: () => ({
      collection: () => mockUsersCollection,
    }),
  }),
}));

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

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
