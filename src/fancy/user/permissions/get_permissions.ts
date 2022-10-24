import * as d from "discord-api-types/v9";

type Permissions = bigint;

const all_permissions = 0xFFFFFFFFFFFFFFFFn;

// we need a guild and channel cache for this

export function getPermissions(user: d.APIUser, member: d.APIGuildMember, guild: d.APIGuild, channel: d.APIGuildChannel<
    | d.ChannelType.GuildText
    // | forum thread
>): Permissions {
    if(user.id === guild.owner_id) {
        return all_permissions;
    }

    const roles = member.roles;
    let res_permisssions: Permissions = 0n;
    for(const role_id of roles) {
        const role = guild.roles.find(gr => gr.id === role_id);
        if(role != null) {
            res_permisssions |= BigInt(role.permissions);
        }
    }
    if(res_permisssions & d.PermissionFlagsBits.Administrator) {
        return all_permissions;
    }

    throw new Error("todo finish implementation");

    /*

  memberPermissions(member, checkAdmin) {
    if (checkAdmin && member.id === this.guild.ownerId) {
      return new PermissionsBitField(PermissionsBitField.All).freeze();
    }

    const roles = member.roles.cache;
    const permissions = new PermissionsBitField(roles.map(role => role.permissions));

    if (checkAdmin && permissions.has(PermissionFlagsBits.Administrator)) {
      return new PermissionsBitField(PermissionsBitField.All).freeze();
    }

    const overwrites = this.overwritesFor(member, true, roles);

    return permissions
      .remove(overwrites.everyone?.deny ?? PermissionsBitField.DefaultBit)
      .add(overwrites.everyone?.allow ?? PermissionsBitField.DefaultBit)
      .remove(overwrites.roles.length > 0 ? overwrites.roles.map(role => role.deny) : PermissionsBitField.DefaultBit)
      .add(overwrites.roles.length > 0 ? overwrites.roles.map(role => role.allow) : PermissionsBitField.DefaultBit)
      .remove(overwrites.member?.deny ?? PermissionsBitField.DefaultBit)
      .add(overwrites.member?.allow ?? PermissionsBitField.DefaultBit)
      .freeze();
  }

    */
}