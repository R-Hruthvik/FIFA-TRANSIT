export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL BODY] ${html.replace(/<[^>]*>/g, "")}`);
    return { success: true, mocked: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "FIFA Operations <noreply@stadium-ops.fifa.com>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", err);
      return { success: false, error: err };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}
