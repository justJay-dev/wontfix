import Mustache from "mustache";
import template from "@worker/emails/org-invitation.hbs?raw";

interface OrgInvitationEmailParams {
    url: string;
    organizationName: string;
    role: string;
}

export function renderOrgInvitationEmail(
    params: OrgInvitationEmailParams,
): string {
    return Mustache.render(template, params);
}
