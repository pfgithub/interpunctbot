// gets a quote from a server's pastebin quote page

const commands = new (require("../Commands"));
const o = require("../options");
const PastebinAPI = require("pastebin-js");
const pastebin = new PastebinAPI();
const {RichEmbed} = require("discord.js");

function escapeMarkdown(text) {
  let unescaped = text.replace(/\\(\*|_|`|~|\\)/g, "$1"); // unescape any "backslashed" character
  let escaped = unescaped.replace(/(\*|_|`|~|\\)/g, "\\$1"); // escape *, _, `, ~, \
  return escaped;
}

function deUsererrorIfy(str) {
  return str.toLowerCase();
}

// quote [single] ...search [number]

commands.registerCommand("quote", [o.pm(false), o.setting("quotesPastebin")], async(data, ...searchString) => {
  let forceLine;
  let individual = false;
  if(searchString.length > 0 && searchString[0] === "single") individual = searchString.shift() || true;
  if(searchString.length > 0 && searchString[searchString.length - 1].match(/^\d+$/)) forceLine = parseInt(searchString.pop(), 10);
  searchString = searchString.join` `.toLowerCase().split` `;
  let allQuotes = escapeMarkdown(await pastebin.getPaste(data.quotesPastebin)
    .catch(async e => await data.msg.reply("Failed to get quotes"))
  ).split`\r`.join``.split(individual ? `\n` : /\n{2,}/).filter(q=>q.match(/[A-Za-z]/)); // Death:
  if(searchString) {
    allQuotes = allQuotes
      .filter(q => searchString.every(z=>deUsererrorIfy(q).indexOf(z) > -1));
  }
  if(allQuotes.length < 1) allQuotes = [`No quotes found for ${searchString.join` `}`];
  let line = Math.floor(Math.random() * allQuotes.length);
  if(forceLine != null) line = forceLine-1;
  if(line < 0) line = 0;
  if(line > allQuotes.length - 1) line = allQuotes.length - 1;
  searchString.forEach(s => s ? allQuotes[line] = allQuotes[line].split(s).join(`**${s}**`) : 0);
  let quoteEmbed = new RichEmbed();
  quoteEmbed.setTitle("Quote");
  quoteEmbed.setDescription(`*${allQuotes[line]}*`);
  quoteEmbed.setFooter(`${line+1}/${allQuotes.length}`);
  quoteEmbed.setColor(`RANDOM`);
  await data.msg.reply("", {"embed": quoteEmbed});
  // return await data.msg.delete();
});

module.exports = commands;
