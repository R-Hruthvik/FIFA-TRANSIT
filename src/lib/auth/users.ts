import { clientPromise } from "@/lib/db";
import { UserDocument, Role, StaffStatus } from "@/types/auth";
import { ObjectId } from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const USERS_COLL = "users";

async function getUsersCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserDocument>(USERS_COLL);
}

export async function findUserByEmail(email: string) {
  const collection = await getUsersCollection();
  // Case-insensitive email lookup
  return collection.findOne({
    email: { $regex: new RegExp(`^${email}$`, "i") }
  });
}

export async function findUserById(id: string) {
  const collection = await getUsersCollection();
  return collection.findOne({ id });
}

export async function createUser(userData: Omit<UserDocument, "_id">) {
  const collection = await getUsersCollection();

  // Ensure unique index on email (lowercase) and sparse unique on googleId
  await collection.createIndex({ email: 1 }, { unique: true });
  await collection.createIndex({ googleId: 1 }, { unique: true, sparse: true });

  const result = await collection.insertOne(userData as UserDocument);
  return { ...userData, _id: result.insertedId };
}

export async function updateUserRole(id: string, role: Role) {
  const collection = await getUsersCollection();
  return collection.updateOne(
    { id },
    { $set: { role, updatedAt: new Date() } }
  );
}

export async function updateUserStaffStatus(
  id: string,
  staffStatus: StaffStatus,
  adminId?: string
) {
  const collection = await getUsersCollection();
  const update: Record<string, unknown> = {
    staffStatus,
    updatedAt: new Date(),
  };

  if (staffStatus === "approved" && adminId) {
    update.approvedAt = new Date();
    update.approvedBy = adminId;
  } else if (staffStatus === "pending") {
    update.staffRequestedAt = new Date();
  }

  return collection.updateOne({ id }, { $set: update });
}

export async function updateLastSignIn(id: string) {
  const collection = await getUsersCollection();
  return collection.updateOne(
    { id },
    { $set: { lastSignIn: new Date(), updatedAt: new Date() } }
  );
}

export async function getUserCollection() {
  return getUsersCollection();
}

export async function findUserByGoogleId(googleId: string) {
  const collection = await getUsersCollection();
  return collection.findOne({ googleId });
}

export async function updateUser(id: string, updates: Partial<UserDocument>) {
  const collection = await getUsersCollection();
  return collection.updateOne(
    { id },
    { $set: { ...updates, updatedAt: new Date() } }
  );
}