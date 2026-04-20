import { createAccessControl } from "better-auth/plugins/access";

const statement = {
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
} as const;

const ac = createAccessControl(statement);

export const admin = ac.newRole({
    organization: ["update"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
});
export const owner = ac.newRole({
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
});

export { ac };
