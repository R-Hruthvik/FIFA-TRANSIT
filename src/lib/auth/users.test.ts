import { findUserByEmail, findUserById, createUser, updateUserRole } from "@/lib/auth/users";
import { clientPromise } from "@/lib/db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

describe("Auth user CRUD", () => {
  let testUserId: string;

  beforeAll(async () => {
    const client = await clientPromise;
    await client.db(DB_NAME).collection("users").createIndex(
      { email: 1 }, { unique: true }
    );
  });

  afterAll(async () => {
    const client = await clientPromise;
    if (testUserId) {
      await client.db(DB_NAME).collection("users").deleteOne({ id: testUserId });
    }
  });

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
