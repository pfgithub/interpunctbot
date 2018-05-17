Commands: $help, $ping, $settings, $listRoles, $quote, $spaceChannels, $renameChannel, $about, $invite, $downloadLog, $resetLog .

Settings: `prefix: string`, `quote: pastebin id of quotes`, `rankmojis <add/remove> <rank> <emoji>`, `rankmojiChannel <#channel>`, `nameScreening <add/remove> <disallowed name parts...>`, `logging <true/false>`

https://discordapp.com/api/oauth2/authorize?client_id=433078185555656705&permissions=268445780&scope=bot
Choose your permissions

# Feature Tutorials

## Change the prefix

If you wish to change the $prefix, use

    $settings prefix <new prefix>
    <new prefix>settings prefix $

It even supports emoji prefixes :laughingcrying:

If you mess up the prefix, just use

    @inter·punct prefix <new prefix>

## Spaced Channel Names

If you wish to have spaces in your channel names, use

    $spaceChannels space

To quickly undo this, use

    $spaceChannels dash

## Per-role emojis

When it talks about roles, it needs a role ID. Roles are annoying and there is no easy way to get an ID. Use `$listRoles` to get a list of all roles and IDs.

Add an rankmoji

    $settings rankmoji add <roleid> :my_great_emoji:

Remove a rankmoji

    $settings rankmoji remove :my_great_emoji:
    $settings rankmoji remove <roleid>

Rankmojis support messages and edits. They do not support reactions.

### Ranking people with emojis

If a rankmojiChannel is set, MANAGE_ROLES people can rank people using rankmojis in the channel

    $settings rankmojiChannel #channel you can rank people on

To rank someone, react to their message with a rankmoji containing the role you want to add, then click the check mark that appears

Act fast, you only have 10 seconds. *tick* *tick* *tick* *tick*

## Logging

If you wish to be able to download a log of all the things people say on your server, enable logging

    $settings logging true

To download the logs, use

    $downloadLog

To reset the logs, use

    $resetLog

If you accidentally reset the logs, too bad.

## Quotes

If you want a list of quotes people can search and get random ones, create a pastebin paste with your quote list. Each quote should be seperated by two newlines.

I recommend creating a pastebin account so you can edit your quote list without running a command.

The quotes command requires a pastebin ID. That is the last part of the pastebin URL. `pastebin.com/`THIS IS YOUR ID

    $settings quote [id]

For users to get a quote, they can use

    $quote
    $quote search string
    $quote 5
    $quote single search string

Quote single is used to get just one line in a multiline quote. A number at the end can be used to get the nth quote with that search term or of all the quotes

## That's it

# Running it yourself

Edit `config.json` to include your token

    yarn install
    yarn start
