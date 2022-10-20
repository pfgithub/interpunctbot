clean up copy/pasted code:

```
const autodeleteLimit = await db.getAutodeleteLimit();
if ((await db.getAutodelete()).rules.length >= autodeleteLimit)
    return renderError(u(
        "This server has reached its autodelete limit (" +
            autodeleteLimit +
            ").\n> To increase this limit, ask on the support server\n> Make sure to include your server id which is `"+guild.id+"`\n> https://discord.gg/fYFZCaG25k",
    )); // !!!
const autodeleteID = await db.addAutodelete(autodelete_rule);
return renderEphemeral(
    Message({
        text: u("These types of messages will be automatically deleted after " +
        durationFormat(ev.args.time) +
        ".\n> To remove this rule, `ip!autodelete remove " +
        autodeleteID +
        "`"),
    }),
    {visibility: "public"},
);
```

clean up copy/pasted code:

```
if(!sender.permissions.has("MANAGE_GUILD")) {
    const db = new Database(guild.id);
    const mng_bot_role = await db.getManageBotRole();
    if(mng_bot_role.role === "" || !ev.interaction.member.roles.includes(mng_bot_role.role)) {
        return renderError(u("You need permission to MANAGE_GUILD or have <@&"+mng_bot_role.role+"> to use this command."));
    }
}
if(!sender.permissions.has("MANAGE_MESSAGES")) {
    return renderError(u("You need permission to MANAGE_MESSAGES to use this command."));
}
```