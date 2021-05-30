import * as nr from "./NewRouter";

export type ResponseType = {
    kind: "text",
    value: string,
};

type InputRequest = {
	id: string,
	response?: ResponseType,
};

const requests = new Map<string, InputRequest>();

export function requestInput(id: string, author_id: string): void {
	const pval = requests.get(author_id);
	if(pval?.id === id) return;
	requests.set(author_id, {id});
}
export function getTextInput(id: string, author_id: string): {kind: "error", message: string} | {kind: "value", value: string} {
	const val = requests.get(author_id);
	if(!val || val.id !== id || !val.response || val.response.kind !== "text") return {
		kind: "error",
		message: "Please type <:slash:848339665093656607>give text",
	};
	requests.delete(author_id);
	return {kind: "value", value: val.response.value};
}
export function postResponse(author_id: string, response: ResponseType): {kind: "error", message: string} | undefined {
	const val = requests.get(author_id);
	if(!val) return {
		kind: "error",
		message: "A response is not needed right now. Use this command only if you are prompted.",
	};
	val.response = response;
}

nr.globalCommand(
	"/help/test/givetext",
	"givetext",
	{
		usage: "givetext",
		description: "givetext",
		examples: [],
		perms: {fun: true},
	},
	nr.list(...nr.a.words()),
	async ([value], info) => {
		const pr = postResponse(info.message.author.id, {kind: "text", value});
		if(pr) {
			return await info.error(pr.message);
		}else{
			if(info.raw_interaction) {
				return await info.raw_interaction.replyHiddenHideCommand("✓");
			}else return await info.success("✓");
		}
	},
);