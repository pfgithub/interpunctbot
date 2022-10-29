import * as d from "discord-api-types/v10";

export function hasRole(member: d.APIGuildMember, role_id: string): boolean {
    return member.roles.includes(role_id);
}