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
import { labels } from "@worker/db/schema";
import { nanoid } from "nanoid";

const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
    { name: "bug", color: "#ef4444" },
    { name: "feature", color: "#4288c9" },
    { name: "question", color: "#a855f7" },
    { name: "skill-issue", color: "#f59e0b" },
    { name: "works-on-my-machine", color: "#14b8a6" },
    { name: "spicy-take", color: "#ec4899" },
    { name: "nice-to-have", color: "#10b981" },
];

interface CreateAuthOptions {
    db: Database;
    secret: string;
    baseURL: string;
    email: SendEmail;
    emailFrom: string;
}

export function createAuth({
    db,
    secret,
    baseURL,
    email,
    emailFrom,
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
                    email,
                    from: emailFrom,
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
                    email,
                    from: emailFrom,
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
                // Only global admins can create orgs. Org ownership then
                // manages itself via the org plugin's own roles.
                allowUserToCreateOrganization: async (user) => {
                    const role = (user as { role?: string }).role;
                    return role === "admin";
                },
                creatorRole: "owner",
                organizationCreation: {
                    afterCreate: async ({ organization: org }) => {
                        await db
                            .insert(labels)
                            .values(
                                DEFAULT_LABELS.map((label) => ({
                                    id: nanoid(),
                                    organizationId: org.id,
                                    name: label.name,
                                    color: label.color,
                                })),
                            )
                            .onConflictDoNothing();
                    },
                },
                sendInvitationEmail: async ({
                    organization: org,
                    invitation,
                }) => {
                    await sendEmail({
                        email,
                        from: emailFrom,
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
