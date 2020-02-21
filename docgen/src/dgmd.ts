function infIndexOf(str: string, c: string) {
	const r = str.indexOf(c);
	if (r === -1) return Infinity;
	return r;
}

export function parseDGMD(
	str: string,
	{
		cleanText,
		callFunction,
	}: {
		cleanText: (str: string) => string;
		callFunction: (name: string, args: string) => string;
	},
): { res: string; remaining: string } {
	let res = "";

	while (str) {
		if (str.startsWith("{")) {
			str = str.substr(2);
			const fnNameEnd = infIndexOf(str, "|");
			const nextClose = infIndexOf(str, "}");
			const fnName = str.substr(0, Math.min(nextClose, fnNameEnd));
			str = str.substr(Math.min(fnNameEnd + 1, nextClose));
			const callv = parseDGMD(str, { cleanText, callFunction });
			res += callFunction(fnName, callv.res);
			str = callv.remaining;
			if (str.startsWith("}")) {
				str = str.substr(2);
			}
			continue;
		}
		if (str.startsWith("}")) {
			break;
		}

		const [, textPart] = str.match(/^([\S\s]*?)(?:\{\{|\}\}|$)/)!;

		res += cleanText(textPart);
		str = str.substr(textPart.length);
	}

	return { res, remaining: str };
}
