libfancy.so.4 is ipv4

it could be fancier but unfortunately https://github.com/microsoft/TypeScript/issues/21699

## notes on persistance

not everything has to be persistent

maybe even just have one piece of data that is persistent and the rest can be
ephemeral overlays. like how games with gamelib have one persistent piece of data.

## notes on making this its own discord api

this has the neat declarative thing

https://github.com/discordeno/discordeno

they are putting all the discord connections in one process i think and then launching
the bot seperately. that is a good idea i think. we should do that too.

## advantages we have over other libraries/frameworks

- declarative stuff
- trivial persistence
- hopefully we'll rewrite TimedEvents and then we'll have trivial timed events
- if typescript ever adds jsx factory return type support we'll have jsx
- it should be possible for us to add https bot support

## things we have to solve first

- put the discord api connection in its own process
- handle ratelimiting correctly
- cache anything that it's okay to cache. don't cache anything else.

for now we're using discord.js for those