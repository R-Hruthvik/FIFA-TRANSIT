import { auth } from '@/lib/auth';
import { clientPromise } from '@/lib/db';

const DB_NAME = process.env.MONGODB_DB || 'stadium_ops';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    const usersCollection = db.collection('users');

    const totalUsers = await usersCollection.countDocuments({});
    const pendingStaff = await usersCollection.countDocuments({ staffStatus: 'pending' });
    const activeStaff = await usersCollection.countDocuments({ staffStatus: 'approved', role: 'staff' });
    const adminCount = await usersCollection.countDocuments({ role: 'admin' });

    return Response.json({
      totalUsers,
      pendingStaff,
      activeStaff,
      adminCount,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}