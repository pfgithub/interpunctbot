import * as nr from "./NewRouter";
import * as discord from "discord.js";
import Info from "./Info";

export type ResponseType = {
    kind: "text",
    value: string,
} | {
	kind: "role",
	value: discord.Role,
} | {
	kind: "emoji",
	value: {id: string},
};

type InputRequest = {
	id: string,
	response?: ResponseType,
	cb?: (res: ResponseType, info: Info) => void,
};

const requests = new Map<string, InputRequest>();

export function requestInput(id: string, author_id: string): string {
	const pval = requests.get(author_id);
	if(pval?.id === id) return id;
	requests.set(author_id, {id});
	return id;
}
export function clearRequest(author_id: string): void {
	requests.delete(author_id);
}
export function requestInput2(author_id: string, cb: (res: ResponseType, info: Info) => void): void {
	requests.set(author_id, {
		id: "*unused*",
		cb,
	});
}
export function getTextInput(id: string, author_id: string): {kind: "error", message: string} | {kind: "value", value: string} {
	const val = requests.get(author_id);
	if(!val || val.id !== id || !val.response || val.response.kind !== "text") return {
		kind: "error",
		message: "Please type <:slash:848339665093656607>`/give text` and then click the button again",
	};
	requests.delete(author_id);
	return {kind: "value", value: val.response.value};
}
export function getRoleInput(id: string, author_id: string): {kind: "error", message: string} | {kind: "value", value: discord.Role} {
	const val = requests.get(author_id);
	if(!val || val.id !== id || !val.response || val.response.kind !== "role") return {
		kind: "error",
		message: "Please type <:slash:848339665093656607>`/give role` and then click the button again",
	};
	requests.delete(author_id);
	return {kind: "value", value: val.response.value};
}
export function getEmojiInput(id: string, author_id: string): {kind: "error", message: string} | {kind: "value", value: {id: string}} {
	const val = requests.get(author_id);
	if(!val || val.id !== id || !val.response || val.response.kind !== "emoji") return {
		kind: "error",
		message: "Please type <:slash:848339665093656607>`/give emoji` and then click the button again",
	};
	requests.delete(author_id);
	return {kind: "value", value: val.response.value};
}
async function postResponse(author_id: string, response: ResponseType, info: Info) {
	// if(pr) {
	// 	return await info.error(pr.message);
	// }else{
	// 	if(info.raw_interaction) {
	// 		return await info.raw_interaction.replyHiddenHideCommand("✓. Please click the button again.");
	// 	}else return await info.success("✓. Please click the button again.");
	// }
	const val = requests.get(author_id);
	if(!val) return await info.error(
		"A response is not needed right now. Use this command only if you are prompted.",
	);
	if(val.cb) {
		val.cb(response, info);
		requests.delete(author_id);
		return;
	}
	val.response = response;
	if(info.raw_interaction) {
		return await info.raw_interaction.replyHiddenHideCommand("✓. Please click the button again.");
	}else return await info.success("✓. Please click the button again.");
}

nr.globalCommand(
	"/help/test/givetext",
	"givetext",
	{
		usage: "givetext",
		description: "givetext",
		examples: [],
		perms: {fun: true, slash_do_not_interact: true},
	},
	nr.list(...nr.a.words()),
	async ([value], info) => {
		if(!value) return await info.error("Usage: givetext {text}");
		await postResponse(info.message.author.id, {kind: "text", value}, info);
	},
);

nr.globalCommand(
	"/help/test/giverole",
	"giverole",
	{
		usage: "giverole",
		description: "giverole",
		examples: [],
		perms: {fun: true, slash_do_not_interact: true},
	},
	nr.list(...nr.a.role()),
	async ([value], info) => {
		await postResponse(info.message.author.id, {kind: "role", value}, info);
	},
);

nr.globalCommand(
	"/help/test/giveemoji",
	"giveemoji",
	{
		usage: "giveemoji",
		description: "giveemoji",
		examples: [],
		perms: {fun: true, slash_do_not_interact: true},
	},
	nr.list(...nr.a.words()),
	async ([value], info) => {
		const id = value.match(/[0-9]{14,32}/g);
		if(!id || id.length < 0) return await info.error("This command needs an emoji or an emoji id.");
		if(id.length > 1) return await info.error("This command needs an emoji or an emoji id");
		await postResponse(info.message.author.id, {kind: "emoji", value: {id: id[0]}}, info);
	},
);