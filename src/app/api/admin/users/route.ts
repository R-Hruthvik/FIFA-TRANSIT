import { auth } from '@/lib/auth';
import { clientPromise } from '@/lib/db';
import type { Session } from 'next-auth';
const DB_NAME = process.env.MONGODB_DB || 'stadium_ops';

const API_TIMEOUT = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function GET(request: Request) {
  try {
    const session = (await withTimeout(auth(), API_TIMEOUT)) as Session | null;
    if (!session?.user || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q')?.trim() || '';
    const staffStatus = searchParams.get('staffStatus')?.trim() || '';

    const users = await withTimeout(
      (async () => {
        const mongoClient = await clientPromise;
        const db = mongoClient.db(DB_NAME);
        const usersCollection = db.collection('users');

        let query: Record<string, unknown> = {};
        if (searchTerm) {
          query = {
            $or: [
              { email: { $regex: searchTerm, $options: 'i' } },
              { name: { $regex: searchTerm, $options: 'i' } },
            ],
          };
        }
        if (staffStatus) {
          query.staffStatus = staffStatus;
        }

        return await usersCollection
          .find(query, { projection: { passwordHash: 0, googleId: 0 } })
          .sort({ createdAt: -1 })
          .toArray();
      })(),
      API_TIMEOUT
    );

    return Response.json(users);
  } catch (error: unknown) {
    console.error('Admin users fetch error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id, role } = await request.json();

    if (!id || !role) {
      return Response.json({ error: 'User ID and role are required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['fan', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { id },
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Admin user update error:', error);
    return Response.json({ error: 'Failed to update user' }, { status: 500 });
  }
}