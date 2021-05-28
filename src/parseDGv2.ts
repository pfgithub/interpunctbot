type DgToken =
	| { type: "text"; text: string }
	| { type: "lbracket" }
	| { type: "rbracket" }
	| { type: "argseparator" }; // union(enun) {char: u8, lbracket: void, rbracket: void, argseparator: void} // switch(token) {.char => |c| c, .lbracket => '{'}

export function tokenizeDG(dg: string): DgToken[] {
	const restokens: DgToken[] = [];
	let currentToken: DgToken | undefined;
	let escape = false;
	const pushtoken = () => currentToken && restokens.push(currentToken);
	for (let i = 0; i < dg.length; i++) {
		// this could use a slice
		const char = dg.charAt(i);
		if (escape) {
			if (currentToken?.type === "text") currentToken.text += char;
			else {
				pushtoken();
				currentToken = { type: "text", text: char };
			}
			escape = false;
		} else if (char === "{") {
			pushtoken();
			currentToken = { type: "lbracket" };
		} else if (char === "}") {
			pushtoken();
			currentToken = { type: "rbracket" };
		} else if (char === "|") {
			pushtoken();
			currentToken = { type: "argseparator" };
		} else if (char === "\\") {
			escape = true;
		} else {
			if (currentToken?.type === "text") currentToken.text += char;
			else {
				pushtoken();
				currentToken = { type: "text", text: char };
			}
		}
	}
	pushtoken();
	return restokens;
}

export function parseDG(
	dgIn: string,
	callFunction: (
		fnName: string,
		args: { raw: string; safe: string }[],
	) => string,
) {
	const tokens = tokenizeDG(dgIn);
	const state: {
		type: "callaction";
		action: string;
		args: { raw: string; safe: string }[];
	}[] = [
	    { type: "callaction", action: "__HOME", args: [{ raw: "", safe: "" }] },
	];

	while (tokens.length) {
		// while(tokens.shift()) |token| // zig
		const token = tokens.shift()!;
		if (token.type === "lbracket") {
			const name = tokens.shift();
			if (name?.type !== "text") {
				throw new Error("Expected [text], got [" + name?.type + "]");
			}
			const topToken = tokens[0];
			if (
				!topToken ||
				(topToken.type !== "rbracket" &&
					topToken.type !== "argseparator")
			) {
				throw new Error(
					"Expected [rbracket] or [argseparator] but got [" +
						(topToken?.type || "EOF") +
						"]",
				);
			}
			state.push({
				type: "callaction",
				action: name.text,
				args: [],
			});
		} else if (token.type === "rbracket") {
			if (state.length <= 1)
				throw new Error("Found [rbracket] in invalid position home");
			// exit scope
			const topState = state.pop()!;
			const text = callFunction(topState.action, topState.args);
			const stateItem = state[state.length - 1];
			stateItem.args[stateItem.args.length - 1].raw += text;
			stateItem.args[stateItem.args.length - 1].safe += text;
		} else if (token.type === "argseparator") {
			const stateItem = state[state.length - 1];
			if (stateItem.action === "__HOME")
				throw new Error(
					"Found [argseparator] in invalid position home",
				);
			stateItem.args.push({ raw: "", safe: "" });
		} else if (token.type === "text") {
			const stateItem = state[state.length - 1];
			stateItem.args[stateItem.args.length - 1].safe += callFunction("", [
				{
					raw: token.text,
					safe: "[[ERR: safe text used in text cleaning]]",
				},
			]);
			stateItem.args[stateItem.args.length - 1].raw += token.text;
		} else {
			throw new Error("never");
		}
	}
	if (state.length !== 1)
		throw new Error("Not all brackets exited before eof.");
	return state[0].args[0];
}
