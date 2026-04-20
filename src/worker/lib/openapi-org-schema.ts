// Static OpenAPI path definitions for the Better Auth organization plugin routes.
// These routes are handled by the plugin under /api/auth and won't appear in
// chanfana's auto-generated spec, so we document them manually here.

export const organizationApiPaths = {
    "/api/auth/organization/create": {
        post: {
            operationId: "createOrganization",
            tags: ["Organization"],
            summary: "Create a new organization",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["name", "slug"],
                            properties: {
                                name: { type: "string" },
                                slug: { type: "string" },
                                logo: { type: "string", nullable: true },
                                metadata: { type: "object", nullable: true },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Created organization" },
                "401": { description: "Unauthorized" },
            },
        },
    },
    "/api/auth/organization/update": {
        post: {
            operationId: "updateOrganization",
            tags: ["Organization"],
            summary: "Update an organization",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["organizationId"],
                            properties: {
                                organizationId: { type: "string" },
                                name: { type: "string" },
                                slug: { type: "string" },
                                logo: { type: "string", nullable: true },
                                metadata: { type: "object", nullable: true },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Updated organization" },
                "401": { description: "Unauthorized" },
                "403": { description: "Forbidden" },
            },
        },
    },
    "/api/auth/organization/delete": {
        post: {
            operationId: "deleteOrganization",
            tags: ["Organization"],
            summary: "Delete an organization",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["organizationId"],
                            properties: {
                                organizationId: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Deleted" },
                "401": { description: "Unauthorized" },
                "403": { description: "Forbidden" },
            },
        },
    },
    "/api/auth/organization/set-active": {
        post: {
            operationId: "setActiveOrganization",
            tags: ["Organization"],
            summary: "Set the active organization for the current session",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["organizationId"],
                            properties: {
                                organizationId: {
                                    type: "string",
                                    nullable: true,
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Active organization updated" },
                "401": { description: "Unauthorized" },
            },
        },
    },
    "/api/auth/organization/get-full-organization": {
        get: {
            operationId: "getFullOrganization",
            tags: ["Organization"],
            summary:
                "Get the full organization including members and invitations",
            security: [{ session: [] }],
            parameters: [
                {
                    in: "query",
                    name: "organizationId",
                    schema: { type: "string" },
                    required: false,
                },
                {
                    in: "query",
                    name: "organizationSlug",
                    schema: { type: "string" },
                    required: false,
                },
            ],
            responses: {
                "200": { description: "Organization data" },
                "401": { description: "Unauthorized" },
                "404": { description: "Not found" },
            },
        },
    },
    "/api/auth/organization/list-members": {
        get: {
            operationId: "listOrgMembers",
            tags: ["Organization"],
            summary: "List members of an organization",
            security: [{ session: [] }],
            parameters: [
                {
                    in: "query",
                    name: "organizationId",
                    schema: { type: "string" },
                    required: true,
                },
            ],
            responses: {
                "200": { description: "List of members" },
                "401": { description: "Unauthorized" },
            },
        },
    },
    "/api/auth/organization/invite-member": {
        post: {
            operationId: "inviteOrgMember",
            tags: ["Organization"],
            summary: "Invite a user to an organization",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["email", "role"],
                            properties: {
                                email: { type: "string", format: "email" },
                                role: {
                                    type: "string",
                                    enum: ["member", "admin", "owner"],
                                },
                                organizationId: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Invitation sent" },
                "401": { description: "Unauthorized" },
                "403": { description: "Forbidden" },
            },
        },
    },
    "/api/auth/organization/accept-invitation": {
        post: {
            operationId: "acceptOrgInvitation",
            tags: ["Organization"],
            summary: "Accept an organization invitation",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["invitationId"],
                            properties: {
                                invitationId: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Invitation accepted" },
                "401": { description: "Unauthorized" },
                "404": { description: "Invitation not found or expired" },
            },
        },
    },
    "/api/auth/organization/reject-invitation": {
        post: {
            operationId: "rejectOrgInvitation",
            tags: ["Organization"],
            summary: "Reject an organization invitation",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["invitationId"],
                            properties: {
                                invitationId: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Invitation rejected" },
                "401": { description: "Unauthorized" },
            },
        },
    },
    "/api/auth/organization/cancel-invitation": {
        post: {
            operationId: "cancelOrgInvitation",
            tags: ["Organization"],
            summary: "Cancel a pending organization invitation",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["invitationId"],
                            properties: {
                                invitationId: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Invitation cancelled" },
                "401": { description: "Unauthorized" },
                "403": { description: "Forbidden" },
            },
        },
    },
    "/api/auth/organization/remove-member": {
        post: {
            operationId: "removeOrgMember",
            tags: ["Organization"],
            summary: "Remove a member from an organization",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["memberIdOrUserId"],
                            properties: {
                                memberIdOrUserId: { type: "string" },
                                organizationId: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Member removed" },
                "401": { description: "Unauthorized" },
                "403": { description: "Forbidden" },
            },
        },
    },
    "/api/auth/organization/update-member-role": {
        post: {
            operationId: "updateOrgMemberRole",
            tags: ["Organization"],
            summary: "Update a member's role in an organization",
            security: [{ session: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["memberId", "role"],
                            properties: {
                                memberId: { type: "string" },
                                role: {
                                    type: "string",
                                    enum: ["member", "admin", "owner"],
                                },
                                organizationId: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                "200": { description: "Role updated" },
                "401": { description: "Unauthorized" },
                "403": { description: "Forbidden" },
            },
        },
    },
} as const;
