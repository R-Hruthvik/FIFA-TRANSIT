import { auth } from '@/lib/auth';
import { clientPromise } from '@/lib/db';
const DB_NAME = process.env.MONGODB_DB || 'stadium_ops';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q')?.trim() || '';

    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    const usersCollection = db.collection('users');

    let query: any = {};
    if (searchTerm) {
      query = {
        $or: [
          { email: { $regex: searchTerm, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } },
        ],
      };
    }

    const users = await usersCollection
      .find(query, { projection: { passwordHash: 0, googleId: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json(users);
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
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