import Mustache from "mustache";
import template from "@worker/emails/email-verification.hbs?raw";

interface EmailVerificationParams {
  url: string;
}

export function renderEmailVerificationEmail(
  params: EmailVerificationParams,
): string {
  return Mustache.render(template, params);
}
