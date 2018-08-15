const {RichEmbed} = require("discord.js");

/*

MessageBuilder builds messages
data.msg.reply(...mb().build());

What does it mean to build a message?
 */

class TextBuilder {
	constructor() {
		this.text = [];
	}
	tag(strings, ...values) {
		// Values are escaped
		// Strings are not
		if(typeof firstString === "string") strings = [strings];
		let res = "";
		strings.forEach((str, i) => {
			console.log(str, values[i]);
			this.putRaw(str);
			if(values[i]) this.put(values[i]);
		});
		return this;
	}
	putRaw(text) { // Text here is parsed as markdown
		this.text.push([text, true]);
		return this;
	}
	put(text) {
		this.text.push([text, false]);
		return this;
	}
	build(richmarkdown) { // TODO WARNING WITHOUT ANY KIND OF PARSING, DOING tb.tag`@${user input}` IS DANGEROUS AND CAN CAUSE @everyone PINGS
		let output = "";
		this.text.forEach(([str, raw]) => {
			if(raw) {
				output += str;
			}else{
				str = str.replace(/(\*|_|`|~|\\|<|>|\[|\]"|'|\(|\))/g, "\\$1"); //// Put escapes before every  discord character. This will have a negative effect on code blocks, but the only solution to that is parsing markdown...
				str = str.replace(/(@)(everyone|here)/g, "\\$1​\\$2"); // 1 zwsp 2
				output += str;
			}
		});
		return output;
	}
}

class MessageBuilder { // https://discordapp.com/developers/docs/resources/channel#embed-limits
	constructor() { // this also needs a url and a bunch of other things
		this.title = new TextBuilder;
		this.description = new TextBuilder;
		this._fields = [];
	}

	addField(fn, inline=false) { // param fn: (title, description) => {} returns nothing
		let title = new TextBuilder;
		let description = new TextBuilder;
		fn(title, description);
		this._fields.push({title: title, description: description, inline: inline});
	}

	build(useEmbed) { // useEmbed may be overrided if fields goes over the max
		// converts to an array containing [msg, {embed: thing}]
		let embed = new RichEmbed();
		let msg = "";

		embed.setColor("random");

		embed.title = this.title.build();
		msg += `**${this.title.build()}**\n\n`;

		embed.description = this.description.build();
		msg += this.description.build();

		this._fields.forEach(field => {
			if(embed.fields.length < 25) embed.addField(field.title.build(), field.description.build(), field.inline);
			if(field.inline) {
				msg += `\n**${field.title.build()}**: ${field.description.build()}`;
			}else {
				msg += `

**${field.title.build()}**

${field.description.build()}`;
			}
		});

		if(this._fields.length > 25) useEmbed = false;

		// if we handled sending the message we could auto retry with no embed

		return [useEmbed ? "" : msg, useEmbed ? {embed: embed} : {}];
	}
}
let MB = () => new MessageBuilder();

/*

Example

mb.title.tag`Test`
mb.description.tag`Description`
mb.addField((title, description) =>
  title.tag`Thing`,
  description.tag`Other Thing`)

mb.reply(data.msg)
mb.send(data.msg.channel)
data.msg.reply(...mb.build())

 */


module.exports = MB;
