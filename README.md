# inter·punct bot

-   [Configuration](https://interpunct.info/help/configuration): settings for
    some parts of inter·punct
-   [Fun](https://interpunct.info/help/fun): games and other fun commands
-   [Emoji](https://interpunct.info/help/emoji): commands for managing emoji
-   [Channels](https://interpunct.info/help/channels): channel management
-   [Administration](https://interpunct.info/help/administration): commands to
    help administration
-   [Custom Commands](https://interpunct.info/help/customcommands): custom
    commands config
-   [Logging](https://interpunct.info/help/log): commands to manage a server
    message log \(disabled by default\)
-   [Speedrun](https://interpunct.info/help/speedrun): speedrun.com integrations
-   [Quickrank](https://interpunct.info/help/quickrank): allow moderators to
    rank people quickly
-   [Autodelete](https://interpunct.info/help/autodelete): have inter·punct
    remove certain messages automatically

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

![the above thing but in image form](https://media.discordapp.net/attachments/741500369380835368/741507725057458297/unknown.png)

create `config/config.json` and fill it with

```json
{ "token": "your bot token goes here" }
```

copy `config/knexfile.example.json` to `config/knexfile.json`. you probably
don't need to make any changes.

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
