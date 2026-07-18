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

    // Update staff status to approved and set role to staff
    await updateUserStaffStatus(id, "approved", session.user.id);
    await updateUserRole(id, "staff");

    if (targetUser) {
      sendEmail({
        to: targetUser.email || "",
        subject: "FIFA Staff Application Approved",
        html: `
          <h1>Application Approved</h1>
          <p>Dear ${targetUser.name || "User"},</p>
          <p>Congratulations! Your application for staff credentials has been approved.</p>
          <p>You can now access the Staff Hub from the main Command Center dashboard.</p>
        `,
      }).catch(err => console.error("Failed to send approval email:", err));
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Admin staff approval error:", error);
    return Response.json({ error: "Failed to approve staff request" }, { status: 500 });
  }
}
