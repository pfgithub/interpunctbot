# inter·punct bot

[Invite Me](https://discordapp.com/api/oauth2/authorize?client_id=433078185555656705&permissions=268445780&scope=bot) | [DiscordBots Link](https://discordbots.org/bot/433078185555656705)

<!-- [![Discuss](https://img.shields.io/discord/446481361692524545.svg)](https://discord.gg/j7qpZdE) -->

# Feature Tutorials

## Change the prefix

If you wish to change the ip!prefix, use

    ip!settings prefix <new prefix>
    <new prefix>settings prefix ip!

It even supports emoji prefixes :laughingcrying:

If you mess up the prefix, just use

    @inter·punct settings prefix <new prefix>

When PMing the bot, no prefix is required.

## Spaced Channel Names

If you wish to have spaces in your channel names, use

    ip!channels spacing space

To undo this, use

    ip!channels spacing dash

## Per-role emojis

When it talks about roles, it needs a role ID. Roles are annoying and there is no easy way to get an ID. Use `ip!settings listRoles` to get a list of all roles and IDs.

Add an rankmoji

    ip!settings rankmoji add <roleid> :my_great_emoji:

Remove a rankmoji

    ip!settings rankmoji remove :my_great_emoji:
    ip!settings rankmoji remove <roleid>

Rankmojis support messages and edits. They do not support reactions.

### Ranking people with emojis

If a rankmoji channel is set, MANAGE_ROLES people can rank people using rankmojis in the channel

    ip!settings rankmoji channel #channel you can rank people on

To rank someone, react to their message with a rankmoji containing the role you want to add, then click the check mark that appears

Act fast, you only have 10 seconds. *tick* *tick* *tick* *tick*

## Logging

If you wish to be able to download a log of all the things people say on your server, enable logging

    ip!settings logging true

To download the logs, use

    ip!log download

To reset the logs, use

    ip!log reset

Logs will log messages people send and when they send them. Logs will also log some edited messages and if a user is banned for name screening.

If you accidentally reset the logs, too bad.

## Username Screening and Banning

If you want to autoban people who have certain words in their username, you can use nameScreening

    ip!settings nameScreening add some words to ban

This will autoban anyone who joins with `some` or `words` or `to` or `ban` in their name. Not case sensitive.

Watch out when using short words like `to`, you might accidentally ban someone named **To**mas

    ip!settings nameScreening remove to ban

The ban reason will give a list of words in their name that were in the nameScreening list

## Quotes and other searchable lists

If you want a list people can search and get random ones, create a pastebin paste with your list. Each item should be seperated by two newlines.

I recommend creating a pastebin account so you can edit your quote list without running a command.

The lists commands require a pastebin ID. That is the last part of the pastebin URL. `pastebin.com/`THIS IS YOUR ID

    ip!settings lists [listname] [id]

For users to get a quote, they can use

    ip!listname
    ip!listname search string
    ip!listname 5
    ip!listname single search string

Quote single is used to get just one line in a multiline quote. A number at the end can be used to get the nth quote with that search term or of all the quotes

## Speedrun.com leaderboards

If you want people to be able to get the top 3 on a speedrun.com page, add the page in settings

    ip!settings speedrun Getting_Over_It_With_Bennett_Foddy Glitchless

People can get the leaderboards for the default category or a category of their choosing

    ip!speedrun leaderboard
    ip!speedrun leaderboard Snake

## permreplacements

If you want someone to be able to use bot commands that they need a permission for, but don't want to give them the permission, you can use permreplacements

    ip!settings permreplacements set <permission> <role id>

where permission is a permission string like `MANAGE_GUILD` and role id is a role id from `ip!settings listRoles`

To remove one, use

    ip!settings permreplacements remove <permision>

## Spoilers

If you want to say something that might be a spoiler

    ip!spoiler everyone dies in infinity war

It will show up like this:

![https://i.imgur.com/cDIoIv0.png](https://i.imgur.com/cDIoIv0.png)

Beware: if the bot doesn't have permission to manage_messages, your message may be accidentally spoiled

## Change the name

If you wish to change the name of the bot, right click on it's name and select `Change Nickname`

# Running it yourself

Copy `config.example.json` to `config.json` and edit it with your bot's information. Create a `knexfile.js` containing your DB connection information.

Development should probably be sqlite3 or another 0 setup database, Production should probably be pg or another production databse.

    yarn global add knex
    knex migrate:latest
    yarn install
    yarn start
