import { MessageEmbed } from "discord.js";
import { MessageParametersType } from "./Info";

type TextBuilderType = "discord" | "url";

/*

MessageBuilder builds messages
data.msg.reply(...mb().build());

What does it mean to build a message?
 */

export class TextBuilder {
	text: [string, boolean][];
	type: TextBuilderType;
	constructor(type: TextBuilderType = "discord") {
		this.text = [];
		this.type = type;
	}
	tag(strings: TemplateStringsArray, ...values: (string | number)[]) {
		// Values are escaped
		// Strings are not
		strings.forEach((str, i) => {
			this.putRaw(str);
			if (values[i]) {
				this.put("" + values[i]);
			}
		});
		return this;
	}
	putRaw(text: string) {
		// Text here is parsed as markdown
		this.text.push([text, true]);
		return this;
	}
	put(text: string) {
		this.text.push([text, false]);
		return this;
	}
	build() {
		// TODO WARNING WITHOUT ANY KIND OF PARSING, DOING tb.tag`@${user input}` IS DANGEROUS AND CAN CAUSE @everyone PINGS
		let output = "";
		this.text.forEach(([str, raw]) => {
			if (raw) {
				output += str;
			} else if (this.type === "discord") {
				str = str.replace(/(\*|_|`|~|\\|<|>|\[|\]"|'|\(|\))/g, "\\$1"); //// Put escapes before every  discord character. This will have a negative effect on code blocks, but the only solution to that is parsing markdown...
				str = str.replace(/(@)(everyone|here)/g, "\\$1\u200b\\$2"); // 1 zwsp 2
				output += str;
			} else if (this.type === "url") {
				str = encodeURIComponent(str);
				output += str;
			}
		});
		if (output.length > 2000) {
			output = `${output.substring(0, 2000 - 3)}...`;
		}
		return output;
	}
}

export class MessageBuilder {
	// https://discordapp.com/developers/docs/resources/channel#embed-limits
	title: TextBuilder;
	description: TextBuilder;
	footer: TextBuilder;
	_fields: {
		title: TextBuilder;
		description: TextBuilder;
		inline: boolean;
	}[];
	author?: { name: string; icon_url?: string; url?: string };
	thumb?: string;
	url: TextBuilder;
	constructor() {
		// this also needs a url and a bunch of other things
		this.title = new TextBuilder();
		this.description = new TextBuilder();
		this.footer = new TextBuilder();
		this._fields = [];
		this.author = undefined;
		this.url = new TextBuilder("url");
	}

	addField(
		fn: (title: TextBuilder, description: TextBuilder) => void,
		inline = false,
	) {
		// param fn: (title, description) => {} returns nothing
		const title = new TextBuilder();
		const description = new TextBuilder();
		fn(title, description);
		this._fields.push({
			title: title,
			description: description,
			inline: inline,
		});
	}

	setAuthor(author: string, image?: string, url?: string) {
		this.author = { name: author, icon_url: image, url: url };
	}
	setThumbnail(thumb: string) {
		this.thumb = thumb;
	}

	build(useEmbed?: boolean): MessageParametersType {
		// useEmbed may be overrided if fields goes over the max
		// converts to an array containing [msg, {embed: thing}]
		const embed = new MessageEmbed();
		let msg = "";

		embed.setColor(3092790);

		if (this.author) {
			embed.author = this.author;
			msg += `${new TextBuilder().tag`By ${this.author.name} <${this
				.author.url || ""}>`.build()}\n\n`;
		}

		const builtURL = this.url.build();
		if (builtURL) {
			embed.url = builtURL;
			msg += `${builtURL}\n`;
		}

		if (this.thumb) {
			embed.thumbnail = {
				url: this.thumb,
			};
		}

		embed.title = this.title.build();
		msg += `**${this.title.build()}**\n\n`;

		embed.description = this.description.build();
		msg += this.description.build();

		embed.footer = { text: this.footer.build() };
		msg += this.footer.build();

		this._fields.forEach(field => {
			if (embed.fields && embed.fields.length < 25) {
				embed.addField(
					field.title.build(),
					field.description.build(),
					field.inline,
				);
			}
			if (field.inline) {
				msg += `\n**${field.title.build()}**: ${field.description.build()}`;
			} else {
				msg += `

**${field.title.build()}**

${field.description.build()}`;
			}
		});

		if (this._fields.length > 25) {
			useEmbed = false;
		}
		// if (msg.length > 2000) {
		// 	msg = `${msg.substring(0, 2000 - 3)}...`;
		// }

		// if we handled sending the message we could auto retry with no embed

		return [useEmbed ? "" : msg, useEmbed ? { embed: embed } : {}];
	}
}
const MB = () => new MessageBuilder();
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

export default MB;
