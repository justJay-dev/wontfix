import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import * as schema from "@worker/db/schema";
import type { Database } from "@worker/db/client";
import { sendEmail } from "@worker/lib/email";
import { hashPassword, verifyPassword } from "@worker/lib/password";
import { renderPasswordResetEmail } from "@worker/emails/password-reset";
import { renderEmailVerificationEmail } from "@worker/emails/email-verification";
import { renderOrgInvitationEmail } from "@worker/emails/org-invitation";
import { ac, admin as orgAdmin, owner } from "@worker/lib/access-control";

interface CreateAuthOptions {
    db: Database;
    secret: string;
    baseURL: string;
    resendApiKey: string;
}

export function createAuth({
    db,
    secret,
    baseURL,
    resendApiKey,
}: CreateAuthOptions) {
    return betterAuth({
        baseURL,
        secret,
        database: drizzleAdapter(db, {
            provider: "sqlite",
            schema: {
                user: schema.users,
                session: schema.sessions,
                account: schema.accounts,
                verification: schema.verifications,
                organization: schema.organizations,
                member: schema.members,
                invitation: schema.invitations,
            },
        }),
        emailAndPassword: {
            enabled: true,
            password: {
                hash: hashPassword,
                verify: verifyPassword,
            },
            sendResetPassword: async ({ user, url }) => {
                await sendEmail({
                    apiKey: resendApiKey,
                    to: user.email,
                    subject: "Reset your password",
                    html: renderPasswordResetEmail({ url }),
                });
            },
        },
        emailVerification: {
            sendOnSignUp: true,
            sendVerificationEmail: async ({ user, url }) => {
                await sendEmail({
                    apiKey: resendApiKey,
                    to: user.email,
                    subject: "Verify your email",
                    html: renderEmailVerificationEmail({ url }),
                });
            },
        },
        plugins: [
            admin({
                defaultRole: "user",
                adminRoles: ["admin"],
            }),
            organization({
                ac,
                roles: { admin: orgAdmin, owner },
                allowUserToCreateOrganization: false,
                creatorRole: "owner",
                sendInvitationEmail: async ({
                    organization: org,
                    invitation,
                }) => {
                    await sendEmail({
                        apiKey: resendApiKey,
                        to: invitation.email,
                        subject: `You've been invited to join ${org.name}`,
                        html: renderOrgInvitationEmail({
                            url: `${baseURL}/app/invite/${invitation.id}`,
                            organizationName: org.name,
                            role: invitation.role,
                        }),
                    });
                },
            }),
        ],
        trustedOrigins: async (request) => {
            const origin = request?.headers.get("origin");
            return origin ? [origin] : [];
        },
    });
}
