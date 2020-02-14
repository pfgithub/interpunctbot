import fs from "fs";
import vm from "vm";
//@ts-ignore
const babel = require("@babel/core"); //eslint-disable-line @typescript-eslint/no-var-requires
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
export type CommandData = {
	docsPath: string;
	command: string;
	handler: (cmd: string, info: Info) => void;
};

export type CommandNS = { [key: string]: CommandData };

export const globalCommandNS: CommandNS = {}; // Object.keys(globalCommandNS).sort().reverse().find()
export const globalDocs: { [key: string]: HelpData } = {};

export const devMode = process.env.NODE_ENV !== "production";

export function globalCommand<APList extends APListAny>(
	docsPath: string,
	uniqueGlobalName: string,
	help: HelpData,
	aplist: List<APList>,
	f: (z: () => never) => never,
	surroundingThis: any,
	cb: CmdCb<APList>,
) {
	if (docsPath.toLowerCase() !== docsPath)
		throw new Error("Docs path must be lowercase");
	if (uniqueGlobalName.toLowerCase() !== uniqueGlobalName)
		throw new Error("uniqueGlobalName must be lowercase");
	if (!docsPath.startsWith("/help/"))
		throw new Error("Docs path must start with /help/");
	if (docsPath.endsWith("/"))
		throw new Error("Docs path must not end with /");
	if (globalDocs[docsPath]) throw new Error("Docs path must be unique.");
	if (globalCommandNS[uniqueGlobalName])
		throw new Error("Command path must be unique.");

	globalDocs[docsPath] = help;

	function getFunctionCode(path: string) {
		const fileText = fs.readFileSync(path, "utf-8");

		let text = fileText;
		text = text.split(docsPath)[1];
		text = text.split("\tf => f(),\n\tthis,\n\tasync (")[1];
		text = text.split("\t},\n);")[0];

		const fullFunction = "__result = async (" + text + "};";
		return fullFunction;
	}

	let sourceFile:
		| { path: string; lastUpdated: number; prevcode: string }
		| undefined;
	if (devMode) {
		try {
			f(() => {
				throw new Error("");
			});
		} catch (e) {
			const err = e as Error;
			const stacktrace = err.stack || "";
			const lines = stacktrace.split("\n");
			const commandLines = lines.filter(l => l.includes("/src/commands"));
			const gcmdCall = commandLines[1];
			const rgxMatch = /at Object.<anonymous> \((.+?):[0-9]+?:[0-9]+?\)/.exec(
				gcmdCall,
			);
			if (rgxMatch) {
				const fpath = rgxMatch[1];
				sourceFile = {
					path: fpath,
					lastUpdated: fs.statSync(fpath).mtime.getTime(),
					prevcode: getFunctionCode(fpath),
				};
				console.log("Initialized command reloading for", docsPath);
			} else {
				console.log(
					"Could not set up command reloading for",
					docsPath,
					rgxMatch,
				);
			}
		}
	}

	const handleCommand = async (cmd: string, info: Info) => {
		if (devMode && sourceFile) {
			const newLastUpdated = fs.statSync(sourceFile.path).mtime.getTime();
			if (sourceFile.lastUpdated !== newLastUpdated) {
				const fullFunction = getFunctionCode(sourceFile.path);

				if (fullFunction !== sourceFile.prevcode) {
					sourceFile.prevcode = fullFunction;
					console.log("Reloading ", docsPath);
					const rescode: string = await new Promise((r, re) => {
						babel.transform(
							fullFunction,
							{
								filename: "rescode.ts",
								presets: ["@babel/preset-typescript"],
								plugins: [],
							},
							(err: any, res: any) => {
								if (err) re(err);
								r(res.code);
							},
						);
					});
					const script = new vm.Script(fullFunction, {
						filename: "reloaded.js",
						lineOffset: 1,
						columnOffset: 1,
						displayErrors: true,
					});
					surroundingThis.__result = undefined;
					const context = vm.createContext(surroundingThis);
					script.runInContext(context);
					console.log("Reloaded: ```\n" + fullFunction + "\n```");
					cb = context.__result;

					sourceFile.lastUpdated = newLastUpdated;
				}
			}
		}

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
