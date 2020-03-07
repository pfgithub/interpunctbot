# inter·punct bot

[![List icon](https://cdn.discordapp.com/emojis/476514785106591744.png?v=1&size=32) discordbots.org (please vote)](https://discordbots.org/bot/433078185555656705)
[![List icon](https://cdn.discordapp.com/emojis/476514785106591744.png?v=1&size=32) bots.discord.pw](https://bots.discord.pw/bots/433078185555656705)
[![Node.js icon](https://cdn.discordapp.com/emojis/476513336490721290.png?v=1&size=32) source code](https://gitlab.com/pfgitlab/interpunctbot)
[![Documentation icon](https://cdn.discordapp.com/emojis/476514294075490306.png?v=1&size=32) documentation](https://gitlab.com/pfgitlab/interpunctbot/blob/master/README.md)
[![Discord icon](https://cdn.discordapp.com/emojis/478701038447230996.png?v=1&size=32) support server](https://discord.gg/j7qpZdE)

<!-- [![Discuss](https://img.shields.io/discord/446481361692524545.svg)](https://discord.gg/j7qpZdE) -->

# todo before ipv3

-   migrate to newrouter (+documentation)
-   remove ability to put no space in commands like `ip!votewhat happened`
-   rankmoji

# running

requires: yarn package manager, node >=12 (preferrably >=13)

```bash
git clone https://github.com/pfgithub/interpunctbot
cd interpunctbot
yarn install
```

## building docs

```bash
yarn docs
```

view the docs by setting up a webserver in /docs. for example

```bash
yarn global add serve
serve docs
```

## running the bot

go to https://discordapp.com/developers/applications/me and create a new
application. in the sidebar go to bot and select to create a bot user.

go to the oauth tab and under scopes check `bot`. then under bot permissions,
select any you want. back in the scopes section, copy the url and visit it to
invite the bot to a server.

go to the bot tab and get the token (click to reveal token or press the copy
button).

copy `config/knexfile.example.json` to `config/knexfile.json`. you probably
don't need to make any changes.

create `config/config.json` and fill it with

```json
{ "token": "your bot token goes here" }
```

there are other configuration options available which you can see in
`config/config.example.json`

now, set up the database with

```bash
yarn knex migrate:latest
```

start the build watcher with

```bash
yarn build-watch
```

then start the bot with

```bash
node built
```

and restart that to restart the bot

## autoreloading docs

run the build watcher

```bash
yarn build-watch
```

and this onchange script

```bash
onchange -k built/\*\*/\*.js -- fish -c "node built --gen-docs && serve docs -p 3001"
```

will restart the docs server every time a file is saved and the code rebuilds
