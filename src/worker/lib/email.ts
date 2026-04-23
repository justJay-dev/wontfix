interface SendEmailParams {
  email: SendEmail;
  from: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({
  email,
  from,
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> {
  await email.send({ from, to, subject, html });
}
