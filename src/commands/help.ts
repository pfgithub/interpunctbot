import * as nr from "../NewRouter";

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
			await info.result(
				docsPage.body +
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
