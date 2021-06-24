import Info from "./Info";
import * as Discord from "discord.js";
import {
	Results,
	List,
	APListAny,
	AP,
	list,
	a,
} from "./commands/argumentparser";
import { assertNever, ilt, perr } from "..";
import { confirmDocs } from "./parseDiscordDG";
import { docsGenMode } from "../bot";
import { DocsGen } from "./DocsGen";
import { messages } from "../messages";
export { list, a };

export type CmdCb<APList extends APListAny> = (
	apresults: Results<APList>,
	info: Info,
) => Promise<any>;

export type HelpData = {
	usage: string,
	description: string,
	extendedDescription?: string,
	examples: ({ custom?: undefined, in: string, out: string } | {custom: string})[],
	perms: {
		fun?: boolean,
		raw_message?: boolean,
		runner?: readonly Permission[],
		bot?: readonly BotPermission[],
		slash_do_not_interact?: boolean,
	},
};
export type ErrorData = {
	overview: string,
	detail: string,
	mainPath: string,
};
export type CommandData = {
	docsPath: string,
	command: string,
	handler: (cmd: string, info: Info) => void,
	config: {supports_slash: boolean},
};

export type CommandNS = { [key: string]: CommandData };

export let canModifyGlobalValues = true; // in zig all these globals could be comptime and not require any runtime work
export const globalCommandNS: CommandNS = {}; // Object.keys(globalCommandNS).sort().reverse().find()
export const globalDocs: { [key: string]: PageData & { path: string } } = {};

export const devMode = process.env.NODE_ENV !== "production";

export type PageData = {
	summaries: {
		title: string,
		usage: string,
		description: string,
	},
	body: string,
};

console.log("Loading commands...");
setTimeout(() => {
	console.log(
		"All commands loaded (" +
			Object.entries(globalCommandNS).length +
			" commands, " +
			Object.entries(globalDocs).length +
			" docs entries)",
	);
	canModifyGlobalValues = false;

	// check if all commands split by space have a docs page
	// eg `messages set welcome` should have a docs page for `messages set` and `messages`

	for (const [cmd] of Object.entries(globalCommandNS)) {
		const parts = cmd.split(" ");
		for (let i = 1; i < parts.length - 1; i++) {
			const part = parts.slice(0, i);
			if (globalCommandNS[part.join(" ")]) continue;
			if (globalDocs["/help/" + part.join("/")]) continue;
			console.log(
				"Sub-command " + part.join("/") + " does not have a command",
			);
		}
	}

	if (docsGenMode) {
		console.log("Generating docs now");
		DocsGen()
			.catch(e => {
				console.log("Error!", e);
				process.exit(1);
			})
			.then(() => {
				process.exit(0);
			})
			.catch(e => console.log(e));
	}
}, 0);

const developmentMode = process.env.NODE_ENV !== "production";

export function addDocsPage(docsPath: string, page: PageData): void {
	if (!canModifyGlobalValues)
		throw new Error("Time to add global commands is over!");

	if (docsPath.toLowerCase() !== docsPath)
		throw new Error("Docs path must be lowercase");
	if (!docsPath.startsWith("/"))
		throw new Error("Docs path must start with /");
	if (docsPath.endsWith("/"))
		throw new Error("Docs path must not end with /");
	if (globalDocs[docsPath]) throw new Error("Docs path must be unique. "+docsPath);

	if (developmentMode) {
		// process.stdout.write("  docs..."); // \r  Loaded docs: \u001b[0K\n
		confirmDocs(page.body);
		confirmDocs(page.summaries.title);
		confirmDocs(page.summaries.usage);
		confirmDocs(page.summaries.description);
	}

	globalDocs[docsPath] = { ...page, path: docsPath };

	// process.stdout.write("  Loaded docs: " + docsPath + "");
}

export function addHelpDocsPage(
	docsPath: string,
	help: HelpData & { title: string },
): void {
	if (!docsPath.startsWith("/help/"))
		throw new Error("Docs path must start with /help/");
	const permlist: string[] = [];
	(help.perms.runner || []).forEach(runnerperm => permlist.push("{Perm|runner|"+runnerperm+"}"));
	(help.perms.bot || []).forEach(botperm => permlist.push("{Perm|bot|"+botperm+"}"));
	// if(help.perms.fun) permlist.push("")
	addDocsPage(docsPath, {
		body:
			"{Heading|" +
			help.title +
			"}\n" +
			"Usage: {Command|" +
			help.usage +
			"|" +
			docsPath +
			"}\n" +
			(permlist.length ? "Permissions: "+permlist.join(", ") +".\n" : "") + "\n" +
			help.description +
			"\n\n" +
			(help.extendedDescription || "") +
			"\n\n" +
			help.examples
			    .map(
			        ex => ex.custom ??
			            `{ExampleUserMessage|${ex.in}}\n{ExampleBotMessage|${ex.out}}`,
			    )
			    .join("\n{Nothing}\n"),
		summaries: {
			title: docsPath.substr(docsPath.lastIndexOf("/") + 1),
			usage: "{Command|" + help.usage + "|" + docsPath + "}",
			description: help.description,
		},
	});
}

export function addErrorDocsPage(docsPath: string, error: ErrorData): void {
	addDocsPage(docsPath, {
		body:
			`{Title|Error}\n${error.overview}\n\n${error.detail}` +
			"\n\nMore info: {LinkSummary|" +
			error.mainPath +
			"}",
		summaries: {
			title: docsPath.substr(docsPath.lastIndexOf("/") + 1),
			usage: "no usage **error**?¿",
			description:
				error.overview.trim() +
				"\n\nMore info: {LinkSummary|" +
				error.mainPath +
				"}",
		},
	});
}

export function addDocsWebPage(
	docsPath: string,
	title: string,
	summary: string,
	body: string,
): void {
	addDocsPage(docsPath, {
		body: body,
		summaries: {
			title,
			usage: "no usage **error**?¿",
			description: summary,
		},
	});
}

// addDocsPage("/errors/somerror", {
// 	summaries: {
// 		usage: undefined,
// 	},
// });

export function globalAlias(original: string, aliasname: string): void {
	if (original.toLowerCase() !== original)
		throw new Error("original name must be lowercase");
	aliasname = aliasname.toLowerCase();

	const origcmd = globalCommandNS[original];
	if (!origcmd)
		throw new Error("Alias original not found `" + original + "'");
	if (globalCommandNS[aliasname])
		throw new Error("Command already defined: `" + aliasname + "'");

	globalCommandNS[aliasname] = origcmd;
}

export function reportError(error: Error, info: Info): void {
	// TODO if discord api error no permission, say "interpunct does not have permission"
	if ( info.raw_message ? !info.raw_message.deleted : true ) {
		if (error instanceof Discord.DiscordAPIError) {
			perr(
				info.error(
					messages.failure.missing_permissions_internal_error(
						info,
						((error || "") as any).errorCode,
					),
				),
				"erroring",
			);
		} else {
			perr(
				info.error(
					messages.failure.generic_internal_error(
						info,
						((error || "") as any).errorCode,
					),
				),
				"erroring",
			);
		}
	}
}

export const noArgs = list();
export const passthroughArgs = list(...a.words());

export const runner_permissions = ["manage_channels", "manage_bot", "manage_emoji", "manage_messages_thischannel", "ban_members", "dm_only", "bot_owner"] as const;
export const bot_permissions = ["manage_channels", "manage_emoji", "manage_messages", "ban_members"] as const;

type Permission = (typeof runner_permissions)[number];
type BotPermission = (typeof bot_permissions)[number];

export function globalCommand<APList extends APListAny>(
	docsPath: string,
	uniqueGlobalName: string,
	help: HelpData,
	aplist: List<APList>,
	cb: CmdCb<APList>,
): void {
	if (uniqueGlobalName.toLowerCase() !== uniqueGlobalName)
		throw new Error("uniqueGlobalName must be lowercase");
	if (globalCommandNS[uniqueGlobalName])
		throw new Error("Command path must be unique.");

	addHelpDocsPage(docsPath, Object.assign({ title: uniqueGlobalName }, help));

	const handleCommand = async (cmd: string, info: Info) => {
		// 1: check perms
		if(help.perms.raw_message) {
			if(!info.raw_message) {
				return await info.error("This command cannot be used as a slash command :(");
			}
		}
		if(help.perms.fun) {
			if (info.db ? !(await info.db.getFunEnabled()) : false) {
				return await info.error(messages.fun.fun_disabled(info));
			}
		}
		for(const permission of help.perms.runner || []) {
			if(permission === "manage_channels") {
				if(!Info.theirPerm.manageChannels(info)) return;
			} else if(permission === "manage_bot") {
				if(!await Info.theirPerm.manageBot(info)) return;
			} else if(permission === "manage_emoji") {
				if(!Info.theirPerm.manageEmoji(info)) return;
			} else if(permission === "manage_messages_thischannel") {
				if(!Info.theirPerm.manageMessages(info)) return;
			} else if(permission === "ban_members") {
				if(!Info.theirPerm.banMembers(info)) return;
			} else if(permission === "dm_only") {
				if(!Info.theirPerm.pm(true)(info)) return;
			} else if(permission === "bot_owner") {
				if(!Info.theirPerm.owner(info)) return;
			} else assertNever(permission);
		}
		for(const permission of help.perms.bot || []) {
			if(permission === "manage_channels") {
				if(!Info.ourPerm.manageChannels(info)) return;
			} else if(permission === "manage_emoji") {
				if(!Info.ourPerm.manageEmoji(info)) return;
			} else if(permission === "manage_messages") {
				if(!Info.ourPerm.manageMessages(info)) return;
			} else if(permission === "ban_members") {
				if(!Info.ourPerm.banMembers(info)) return;
			} else assertNever(permission);
		}

		// 2: check AP
		let pres: any;
		if((aplist as any) === passthroughArgs) {
			console.log("is passthroughargs");
			pres = [cmd];
		}else{
			const apresult = await ilt(
				AP({ info, cmd: info.raw_interaction ? info.raw_interaction.options.map(opt => "" + opt.value) : cmd, help: docsPath, partial: false }, ...aplist.list),
				"running command ap " + uniqueGlobalName,
			);
			if (apresult.error) {
				console.log("AP error!!!", apresult.error);
				await info.error(
					"AP test failed (score <2). Error code: `" +
						apresult.error.errorCode +
						"`",
				);
				return;
			}
			if (!apresult.result) return;
			pres = apresult.result.result;
		}

		// 3: run command
		const cbResult = await ilt(
			cb(pres, info),
			"running command " + uniqueGlobalName,
		);

		// 4: if(err) report(err)
		if (cbResult.error) {
			reportError(cbResult.error, info);
		}
	};

	globalCommandNS[uniqueGlobalName] = {
		command: uniqueGlobalName,
		docsPath,
		handler: (cmd: string, info: Info) => {
			perr(
				handleCommand(cmd, info),
				"running command ns handler " + uniqueGlobalName,
			);
		},
		config: {
			supports_slash: help.perms.slash_do_not_interact ?? false,
		},
	};

	// console.log("  Loaded command:", "ip!" + uniqueGlobalName);
}

// export function nsCommand<APList>(ns: CommandNS) // eg ip!quote, the help page has to be for lists in general not just the specific quote one

export interface InteractionHandler {
    handle(info: Info, custom_id: string): Promise<void>;
}

export const ginteractionhandler: {[key: string]: InteractionHandler} = {};
