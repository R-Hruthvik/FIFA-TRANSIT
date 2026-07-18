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

  // Ensure sparse unique indexes - Google index must be sparse to allow multiple null values
  await ensureUniqueIndexes(collection);

  const result = await collection.insertOne(userData as UserDocument);
  return { ...userData, _id: result.insertedId };
}

async function ensureUniqueIndexes(collection: any) {
  try {
    // Check existing indexes to avoid errors on duplicate key creation
    const existingIndexes = await collection.listIndexes().toArray();
    const indexNames = existingIndexes.map((idx: any) => idx.name || '');

    // Ensure unique sparse index on email (case-insensitive) - prevents duplicates
    if (!indexNames.includes('email_1')) {
      await collection.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
    }

    // Non-unique index on googleId. NOT unique because:
    // 1. Multiple users may have googleId:null (email-only signups)
    // 2. MongoDB's unique sparse index still treats null as a value,
    //    causing E11000 duplicate key errors.
    if (!indexNames.includes('googleId_1')) {
      await collection.createIndex({ googleId: 1 }, { sparse: true, name: 'googleId_1' });
    }

  } catch (error) {
    const errorCode = (error as any)?.code;
    const errorMessage = (error as any)?.message || error;

    // Only continue if it's a duplicate key error (index already exists)
    if (errorCode === 11000 && errorMessage.includes('index already exists')) {
      console.log('Index already exists - continuing with user creation');
      return;
    }

    // For other errors, log them but don't fail the user creation
    // This allows the signup to work even if index creation fails
    console.warn('Failed to create indexes, but continuing with user creation:', error);
  }
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