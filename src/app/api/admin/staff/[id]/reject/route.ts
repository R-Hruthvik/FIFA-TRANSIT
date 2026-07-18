import { auth } from "@/lib/auth";
import { updateUserStaffStatus, updateUserRole, findUserById } from "@/lib/auth/users";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Fetch user info for email
    const targetUser = await findUserById(id);

    // Update staff status to rejected and ensure role stays/is set to fan
    await updateUserStaffStatus(id, "rejected", session.user.id);
    await updateUserRole(id, "fan");

    if (targetUser) {
      sendEmail({
        to: targetUser.email || "",
        subject: "FIFA Staff Application Status Update",
        html: `
          <h1>Application Update</h1>
          <p>Dear ${targetUser.name || "User"},</p>
          <p>We regret to inform you that your request for staff credentials has been rejected.</p>
          <p>Please contact the operations administrator if you believe this was in error.</p>
        `,
      }).catch(err => console.error("Failed to send rejection email:", err));
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Admin staff rejection error:", error);
    return Response.json({ error: "Failed to reject staff request" }, { status: 500 });
  }
}
