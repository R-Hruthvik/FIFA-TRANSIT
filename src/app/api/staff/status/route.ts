import { auth } from "@/lib/auth";
import { findUserById } from "@/lib/auth/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const user = await findUserById(session.user.id);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      role: user.role,
      staffStatus: user.staffStatus,
      staffRequestedAt: user.staffRequestedAt,
      approvedAt: user.approvedAt,
    });
  } catch (error) {
    console.error("Staff status fetch error:", error);
    return Response.json({ error: "Failed to fetch staff status" }, { status: 500 });
  }
}
