import * as nr from "../NewRouter";
import { parseDiscord } from "../parseDiscordDG";

nr.addDocsWebPage(
	"/index",
	"{{Heading|{{Interpunct}} Bot}}\n\nThis website is for version 3 of {{Interpunct}} which is currently in development. For version 2, see https://top.gg/bot/433078185555656705",
);
nr.addDocsWebPage("/404", "{{Heading|Uh oh!}}\n\n404 not found.");
nr.addDocsWebPage("/docstest", "a");
nr.addDocsWebPage("/docstest/b", "b");

nr.addErrorDocsPage("/errors/help-path-not-found", {
	overview:
		"That help page could not be found. For all help, use {{Command|help}}",
	detail: "",
});

nr.globalCommand(
	"/help/help/help", // hmm
	"help",
	{
		usage: "help {{Optional|command}}",
		description: "Bot help",
		examples: [],
	},
	nr.list(...nr.a.words()),
	async ([cmd], info) => {
		const docsPage =
			nr.globalDocs[cmd || "/help"] ||
			nr.globalDocs[
				nr.globalCommandNS[cmd.toLowerCase()]?.docsPath || ""
			];
		if (docsPage) {
			const bodyText = parseDiscord(docsPage.body, info);
			await info.result(
				bodyText +
					"\n" +
					"> <https://interpunct.info" +
					docsPage.path +
					">",
			);
		} else {
			await info.help("/errors/help-path-not-found", "error");
		}
	},
);
