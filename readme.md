# inter·punct bot

[Invite Me](https://discordapp.com/api/oauth2/authorize?client_id=433078185555656705&permissions=268445780&scope=bot)

<!-- [![Discuss](https://img.shields.io/discord/446481361692524545.svg)](https://discord.gg/j7qpZdE) -->

# Feature Tutorials

## Change the prefix

If you wish to change the ip!prefix, use

    ip!settings prefix <new prefix>
    <new prefix>settings prefix ip!

It even supports emoji prefixes :laughingcrying:

If you mess up the prefix, just use

    @inter·punct settings prefix <new prefix>

## Spaced Channel Names

If you wish to have spaces in your channel names, use

    ip!spaceChannels space

To quickly undo this, use

    ip!spaceChannels dash

## Per-role emojis

When it talks about roles, it needs a role ID. Roles are annoying and there is no easy way to get an ID. Use `ip!listRoles` to get a list of all roles and IDs.

Add an rankmoji

    ip!settings rankmoji add <roleid> :my_great_emoji:

Remove a rankmoji

    ip!settings rankmoji remove :my_great_emoji:
    ip!settings rankmoji remove <roleid>

Rankmojis support messages and edits. They do not support reactions.

### Ranking people with emojis

If a rankmojiChannel is set, MANAGE_ROLES people can rank people using rankmojis in the channel

    ip!settings rankmojiChannel #channel you can rank people on

To rank someone, react to their message with a rankmoji containing the role you want to add, then click the check mark that appears

Act fast, you only have 10 seconds. *tick* *tick* *tick* *tick*

## Logging

If you wish to be able to download a log of all the things people say on your server, enable logging

    ip!settings logging true

To download the logs, use

    ip!downloadLog

To reset the logs, use

    ip!resetLog

Logs will log messages people send and when they send them. Logs will also log some edited messages and if a user is banned for name screening.

If you accidentally reset the logs, too bad.

## Username Screening and Banning

If you want to autoban people who have certain words in their username, you can use nameScreening

    ip!settings nameScreening add some words to ban

This will autoban anyone who joins with `some` or `words` or `to` or `ban` in their name. Not case sensitive.

Watch out when using short words like `to`, you might accidentally ban someone named **To**mas

    ip!settings nameScreening remove to ban

The ban reason will give a list of words in their name that were in the nameScreening list

## Quotes

If you want a list of quotes people can search and get random ones, create a pastebin paste with your quote list. Each quote should be seperated by two newlines.

I recommend creating a pastebin account so you can edit your quote list without running a command.

The quotes command requires a pastebin ID. That is the last part of the pastebin URL. `pastebin.com/`THIS IS YOUR ID

    ip!settings quote [id]

For users to get a quote, they can use

    ip!quote
    ip!quote search string
    ip!quote 5
    ip!quote single search string

Quote single is used to get just one line in a multiline quote. A number at the end can be used to get the nth quote with that search term or of all the quotes

## Change the name

If you wish to change the name of the bot, right click on it's name and select `Change Nickname`

# Running it yourself

Copy `config.example.json` to `config.json` and edit it with your bot's information. Create a `knexfile.js` containing your DB connection information.

Development should probably be sqlite3 or another 0 setup database, Production should probably be pg or another production databse.

    yarn global add knex
    knex migrate:latest
    yarn install
    yarn start
