interface SendEmailParams {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const DEFAULT_FROM = "App <no-reply@your-app.example.com>";

export async function sendEmail({
  apiKey,
  to,
  subject,
  html,
  from = DEFAULT_FROM,
}: SendEmailParams): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${body}`);
  }
}
