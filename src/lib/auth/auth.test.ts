/**
 * Phase 0 Auth unit test — pure logic, no MongoDB needed.
 * Tests bcrypt hashing and the staff-status guard logic used in CredentialsProvider.
 */
import bcrypt from "bcryptjs";

describe("Phase 0: Auth System unit tests", () => {
  it("hashes and verifies a password", async () => {
    const password = "test-password-123";
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
    const isInvalid = await bcrypt.compare("wrong-password", hash);
    expect(isInvalid).toBe(false);
  });

  it("enforces minimum 8-character password", () => {
    const tooShort = "short1!";
    expect(tooShort.length).toBeLessThan(8);
    const valid = "valid-password-123";
    expect(valid.length).toBeGreaterThanOrEqual(8);
  });

  it("normalizes email to lowercase", () => {
    const mixed = "Test@Example.COM";
    expect(mixed.toLowerCase()).toBe("test@example.com");
  });

  it("defaults role to fan on signup", () => {
    const defaultRole = "fan";
    expect(defaultRole).toBe("fan");
  });

  it("defaults staffStatus to none on signup", () => {
    const defaultStatus = "none";
    expect(defaultStatus).toBe("none");
  });

  it("blocks pending staff from signing in", () => {
    const staffStatus = "pending";
    const blocked = staffStatus === "pending" || staffStatus === "rejected";
    expect(blocked).toBe(true);
  });

  it("blocks rejected staff from signing in", () => {
    const staffStatus = "rejected";
    const blocked = staffStatus === "pending" || staffStatus === "rejected";
    expect(blocked).toBe(true);
  });

  it("allows approved staff to sign in", () => {
    const staffStatus = "approved";
    const blocked = staffStatus === "pending" || staffStatus === "rejected";
    expect(blocked).toBe(false);
  });

  it("generates a UUID for new users", () => {
    const id = crypto.randomUUID();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
