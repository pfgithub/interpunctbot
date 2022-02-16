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

## huh, interesting

https://github.com/discordjs/discord.js/tree/dee27db35af379b0835f9fd5cc19563f7bf3dfc0/packages/rest

look into using that?

oh actually I think we'll have to, discord js seems to have switched to that from
the `client.api` thing.

ok so we can move to client.rest and then eventually to the @discordjs/rest package entirely.

update should be pretty simple. `client.rest` has typescript types. basically they switched
from a proxy query builder to a nicely typed thing.

```
to:
client.rest[method](url, {body, files})

from:
client.api[url][method]({data, files})
```

simple translation

---

## planning

### permissions!

so a command will have

```
permissions: [array of permissions]
```

when the bot joins a guild or a guild command update is performed:

- set all command permissions