Things to do before ipv3 release

# Issues Noticed

- `ip!space channels` will show the message to space channels automatically even after it is enabled.


# Still TODO

- Testing
- All of Settings

# New Features (only some must be implemented)

Suggestion: ip!sticky message | message url
- Stickies a message to the botom of the channel
- Every time a message is sent, the sticky is re-sent
- Optionally sticky with message link instead of id

Suggestion: ip!channels writeonly #channel -> #admin channel
- Messages instantly deleted
- Optionally, has a code so you can PM messages to the bot if you don't want other users to see it
- Result messages are posted in a specified channel

Suggestion: path(route, ...handlers)

Suggestion: ip!send #channel "message" {richembed}
- Requires @ everyone permissions
- Requires manage guild permissions
- optionally send with a custom username, requiring that the bot has create webhook permissions

Suggestion: ip!portal messagelink -> messagelink
- Creates a portal between two channels/servers
- IP must be in both
- Sender must be in both
- Requires manage guild permissions on result server (and initial server?)
- Deleted messages are deleted also
- Edited messages are edited also
- Optionally create a two-way portal ip!portal messagelink <-> messagelink
- Requires manage guild permissions on both servers

Suggestion: ip!alias command alias
- Creates an alias to a command

Suggestion: ip!commands add "[commandname]" [type: interactive|random]
Also: ip!quote replies There is no quote command on this server. Create one with ip!commands add "quote" interactive
- ip!lists add "commandname'
- "React to any message with :heavy_plus_sign: to add to the list or :bangbang: to add it to the list including author and message link "
- React :success_2: to finish. Message contains a summary of changes

Major Suggestion: ip!edit server
- Sends you a PM with a link !!FOR YOU ONLY!! to make changes to your server
- Edit channel names, move channels, edit role names, move roles, create channels/roles, delete channels/roles
- Save button shows a summary of changes and warns for deleting channels with lots of messages, recommending creating an archive channel instead
- Channel names can include spaces
- Category names can include lowercase letters with a checkbox but a warning will be shown that lowercase letters may not show on all devices
- Channel names can include lowercase letters with a checkbox but the same warning will be shown along with another one saying that to mention a channel with lowercase letters you need to type <#channel id> or scroll through the list

Suggestion: Roles only some people can mention

Suggestion: ip!invite link tracking
- Tracks who joins on invite links and how many people
- Sometimes there are conflicts. Keeps track of how many conflicts there were (multiple people joining at once)
- Optionally announce on join messages (using invite link {{invite link}})

Suggestion: ip!stats onlinemembers #channelname|id "Online Members: {count}'
- Puts the server member count in that channel name

Suggestion: https://interpunct.bot/
- Costs $80/yr so using https://interpunct.info/ instead

Suggestion: When a command message is deleted, have the bot delete its reply also
- Only on success/failure
- Store in a seperate table linking messagee id to bot message id

More about Invite Link Tracking:
- Name invite links?
- For example, on this server I'll have a seperate invite link for each section on the website