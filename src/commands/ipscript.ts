import * as Discord from "discord.js";

type UserJSON =
	| { [key: string]: UserJSON }
	| UserJSON[]
	| string
	| number
	| boolean
	| null;

function isArray(v: UserJSON): v is UserJSON[] {
	return Array.isArray(v);
}
function isObject(v: UserJSON): v is { [key: string]: UserJSON } {
	return typeof v === "object" && !!v && !isArray(v);
}
function isString(v: UserJSON): v is string {
	return typeof v === "string";
}

/*
{
type: "send",
channel: {type: "variable", id: (varid)}
}

// ability to pause script execution at any point and continue later
// for example:
send "hi"
wait 1 year
send "bye"
// wait needs to add the completion of the script to a queue in the
// database somewhere because there is no chance the bot will have a >1 yr uptime
// so all the state needs to be serializeable and resumable

*/

type todo = any;

declare let error: todo;
declare let codeBlock: todo;
declare let getText: todo;

export async function runAction(counter: { i: number }) {
	if (counter.i > 100) {
		return error();
	}
	counter.i++;
	if (!isObject(codeBlock)) {
		return await error(
			"ipscript contains code block that is not an object",
			"system",
		);
	}
	const type = codeBlock.type;
	if (!isString(type)) {
		return await error(
			"ipscript contains code block that does not have a type string",
			"system",
		);
	}
	if (type === "send") {
		const channel = getText(codeBlock.channel);
		const message = getText(codeBlock.message);
	}
}

export async function execScript(
	script: string,
	error: (message: string, type: "user" | "system") => Promise<void>,
	// system means the error was caused by the ipscript editor or a command that edits ipscript
	// user means the error was caused by the user
	guild: Discord.Guild,
	parameters: {},
	counter: { i: number } = { i: 0 },
) {
	// parse script
	let parsedScript: UserJSON;
	try {
		parsedScript = JSON.parse(script);
	} catch (e) {
		return await error(
			`ipscript contains invalid json: ${e.toString()}`,
			"system",
		);
	}
	if (!isArray(parsedScript)) {
		return await error("ipscript json does not contain an array", "system");
	}
	for (const codeBlock of parsedScript) {
		// count how many code blocks run and error if it's greater than the guild's code limit
		await runAction(codeBlock as todo);
	}
}

// router.add([], async (cmd, info) => {
// 	const script = cmd
// 		.trim()
// 		.replace(/^```.*?\r?\n/, "")
// 		.replace(/```$/, "")
// 		.trim();
// });

// export default router;
