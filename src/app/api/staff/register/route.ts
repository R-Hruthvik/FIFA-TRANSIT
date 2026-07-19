import { auth } from "@/lib/auth";
import { updateUser } from "@/lib/auth/users";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { staffId, organization, role: staffRole, reason: staffReason } = body;

    if (!staffId || !organization || !staffRole || !staffReason) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update user status and request details
    await updateUser(session.user.id, {
      staffStatus: "pending",
      staffRequestedAt: new Date(),
      // Add custom staff application details (typed as any on mongo doc)
      // @ts-expect-error — custom staff application fields on User Document
      staffId,
      organization,
      staffRole,
      staffReason,
    });

    // Send email notification (async, non-blocking)
    sendEmail({
      to: session.user.email || "",
      subject: "FIFA Staff Application Received",
      html: `
        <h1>Application Received</h1>
        <p>Dear ${session.user.name || "User"},</p>
        <p>Your request for staff access is now under review by our administrators.</p>
        <ul>
          <li><strong>Staff ID:</strong> ${staffId}</li>
          <li><strong>Organization:</strong> ${organization}</li>
          <li><strong>Role:</strong> ${staffRole}</li>
        </ul>
        <p>You will receive an email once your application has been processed.</p>
      `,
    }).catch(err => console.error("Failed to send registration email:", err));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Staff registration error:", error);
    return Response.json({ error: "Failed to submit registration" }, { status: 500 });
  }
}
