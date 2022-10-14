SLASH COMMANDS:

- update everything with slash commands:
  - all commands will be available in slash commands
  - make use of slash command mentions throughout the bot. eg: the panel editor should
    have you send a panel by clicking a slash command mention and sending it
  - make use of new slash command features: autocomplete selects and permissions mainly
  - custom commands should go into guild's slash comands page

HOW:

- we're updating to libfancy
- libfancy does not use an api wrapper and instead calls the discord api directly
  - *: we may need to use some kind of api wrapper to handle some connection stuff
    like ratelimiting and gateway connections and reconnections. we don't want an api
    wrapper that's caching random stuff and putting things into random objects.
- how to make libfancy:
  - consider doing what a few other features have done which is: start a new bot, add
    a few commands, and then merge the code into the main repo. after that, we can go
    feature-by-feature and update them to libfancy at any pace we want.

SOMETHING THAT WE SHOULD DO:

- we still need to get TimedEvents working. I want ip!remindme and I don't want to worry about
  people's autodeletes getting lost on restarts.

IPv4:

- ipv4 is usage of libfancy
- ipv4 can be transitioned into over time, rather than an all-or-nothing
  approach like ipv3 was

GOALS:

- libfancy

NOTES:

- when I rewrite `$wr` and similar src commands:
  - I can use a like 10min cache or something but critical thing:
    keep around the previous cache and use invalidated data.
    after using the invalidated data, fetch the current data
    and edit the response when the updated data is available.
- randomword could be redone to use unicode chars rather than an image for
  decreased latency
- more notes are available in the #todo channel on the support server