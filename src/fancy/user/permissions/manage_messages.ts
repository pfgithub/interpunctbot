import * as d from "discord-api-types/v9";
import { getPermissions } from "./get_permissions";

export function canManageMessages(user: d.APIUser, member: d.APIGuildMember, guild: d.APIGuild, channel: d.APIGuildChannel<
    | d.ChannelType.GuildText
    // | forum thread
>): boolean {
    const perms = getPermissions(user, member, guild, channel);
    return (perms & d.PermissionFlagsBits.ManageMessages) != 0n;
}