import Info from "./Info";
import {
	Results,
	List,
	APListAny,
	AP,
	list,
	a,
} from "./commands/argumentparser";
import { ilt, perr } from "..";
export { list, a };

/*
command("help", `
Usage: {{Command|help {{Text...|topic}}}}
`, async () => {

})

command("/help/help", "help", yml`
usage: "{{Command|help {{Optional|topic}}}}"
examples:
- in: "ip!help log enable"
  out: |
  	{{EmbedFull|/help/logging/enable}}
- in: "ip!help"
  out: |
    {{EmbedShort|/help}}
`, ap.init(a.number, a.string), (([number, string], info) => {

});


)

*/

export type CmdCb<APList extends APListAny> = (
	apresults: Results<APList>,
	info: Info,
) => Promise<any>;

export type HelpData = {
	usage: string;
	description: string;
	examples: { in: string; out: string }[];
};
export type ErrorData = {
	overview: string;
	detail: string;
};
export type CommandData = {
	docsPath: string;
	command: string;
	handler: (cmd: string, info: Info) => void;
};

export type CommandNS = { [key: string]: CommandData };

export const globalCommandNS: CommandNS = {}; // Object.keys(globalCommandNS).sort().reverse().find()
export const globalDocs: { [key: string]: PageData & { path: string } } = {};

export const devMode = process.env.NODE_ENV !== "production";

export type PageData = {
	summaries: {
		usage: string;
		description: string;
	};
	body: string;
};

export function addDocsPage(docsPath: string, page: PageData) {
	if (docsPath.toLowerCase() !== docsPath)
		throw new Error("Docs path must be lowercase");
	if (!docsPath.startsWith("/"))
		throw new Error("Docs path must start with /");
	if (docsPath.endsWith("/"))
		throw new Error("Docs path must not end with /");
	if (globalDocs[docsPath]) throw new Error("Docs path must be unique.");

	globalDocs[docsPath] = { ...page, path: docsPath };
}

export function addHelpDocsPage(docsPath: string, help: HelpData) {
	if (!docsPath.startsWith("/help/"))
		throw new Error("Docs path must start with /help/");
	addDocsPage(docsPath, {
		body:
			"{{Heading|commandName}}\n\nUsage: {{Command|" +
			help.usage +
			"}}\n\n" +
			help.description +
			"\n\n" +
			help.examples
				.map(
					ex =>
						`{{ExampleUserMessage|${ex.in}}}\n\n{{ExampleBotMessage|${ex.out}}}`,
				)
				.join("\n\n"),
		summaries: {
			usage: help.usage,
			description: help.description,
		},
	});
}

export function addErrorDocsPage(docsPath: string, error: ErrorData) {
	if (!docsPath.startsWith("/errors/"))
		throw new Error("Docs path must start with /errors/");
	addDocsPage(docsPath, {
		body: `${error.overview}\n\n${error.detail}`,
		summaries: {
			usage: "no usage **error**?¿",
			description: error.overview,
		},
	});
}

// addDocsPage("/errors/somerror", {
// 	summaries: {
// 		usage: undefined,
// 	},
// });

export function globalCommand<APList extends APListAny>(
	docsPath: string,
	uniqueGlobalName: string,
	help: HelpData,
	aplist: List<APList>,
	cb: CmdCb<APList>,
) {
	if (uniqueGlobalName.toLowerCase() !== uniqueGlobalName)
		throw new Error("uniqueGlobalName must be lowercase");
	if (globalCommandNS[uniqueGlobalName])
		throw new Error("Command path must be unique.");

	addHelpDocsPage(docsPath, help);

	const handleCommand = async (cmd: string, info: Info) => {
		const apresult = await ilt(
			AP({ info, cmd, help: docsPath, partial: false }, ...aplist.list),
			"running command ap " + uniqueGlobalName,
		);
		if (apresult.error) {
			await info.error(
				"AP test failed (score <2). Error code: `" +
					apresult.error.errorCode +
					"`",
			);
			return;
		}
		if (!apresult.result) return;
		const cbResult = await ilt(
			cb(apresult.result.result as any, info),
			"running command " + uniqueGlobalName,
		);
		if (cbResult.error) {
			// TODO if discord api error no permission, say "interpunct does not have permission"
			await info.error(
				"An internal error occured while running this command. Error code: `" +
					cbResult.error.errorCode +
					"`.",
			);
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
	};
}

// export function nsCommand<APList>(ns: CommandNS) // eg ip!quote, the help page has to be for lists in general not just the specific quote one
