import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const { name, email, subject, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error: dbError } = await (supabase as any).from("contact_submissions").insert({
    name,
    email,
    subject,
    message,
  });

  if (dbError) {
    console.error("[contact] db error:", dbError);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL ?? "sales@strataset.com.au";

  if (apiKey) {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    // Strip CR/LF to prevent header injection in subject/replyTo
    const safeSubject = subject.replace(/[\r\n]/g, " ");
    const safeReplyTo = email.replace(/[\r\n]/g, "");

    const resend = new Resend(apiKey);
    const { error: emailError } = await resend.emails.send({
      from: "ByLawsIndex <noreply@bylawsindex.com>",
      to: toEmail,
      replyTo: safeReplyTo,
      subject: `Contact form: ${safeSubject}`,
      text: `New contact form submission from ${name} <${email}>\n\nSubject: ${subject}\n\n${message}`,
      html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>
<p><strong>Subject:</strong> ${esc(subject)}</p>
<hr />
<p style="white-space:pre-wrap">${esc(message)}</p>`,
    });

    if (emailError) {
      console.error("[contact] resend error:", emailError);
      // Still return ok — the submission was saved to DB
    }
  } else {
    console.warn("[contact] RESEND_API_KEY not set — email not sent");
  }

  return NextResponse.json({ ok: true });
}
