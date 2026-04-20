import Mustache from "mustache";
import template from "@worker/emails/password-reset.hbs?raw";

interface PasswordResetEmailParams {
  url: string;
}

export function renderPasswordResetEmail(
  params: PasswordResetEmailParams,
): string {
  return Mustache.render(template, params);
}
