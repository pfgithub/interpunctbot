import * as nr from "./NewRouter";
import * as discord from "discord.js";
import Info from "./Info";
import { getMsgFrom } from "./commands/fun";

export type ResponseType = {
    kind: "text",
    value: string,
} | {
    kind: "longtext",
    value: string,
} | {
	kind: "role",
	value: discord.Role,
} | {
	kind: "emoji",
	value: {id: string},
};

type InputRequest = {
	response?: ResponseType,
	cb: (res: ResponseType, info: Info) => void,
};

const requests = new Map<string, InputRequest>();

export function clearRequest(author_id: string): void {
	requests.delete(author_id);
}
export function requestInput2(author_id: string, cb: (res: ResponseType, info: Info) => void): void {
	requests.set(author_id, {
		cb,
	});
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
	val.cb(response, info);
	requests.delete(author_id);
	return;
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

nr.globalCommand(
	"/help/test/postmsg",
	"postmsg",
	{
		usage: "postmsg",
		description: "postmsg",
		examples: [],
		perms: {fun: true, slash_do_not_interact: true},
	},
	nr.list(...nr.a.words()),
	async ([value], info) => {
		if(!value) return await info.error("Use this command only when prompted.");
		const msgval = await getMsgFrom(info, value, "M", "y", "/help/postmsg");
		if (!msgval) return;
		await postResponse(info.message.author.id, {kind: "longtext", value: msgval}, info);
	},
);