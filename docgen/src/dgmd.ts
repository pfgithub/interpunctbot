export function parseDGMD(
	str: string,
	{
		cleanText,
		callFunction
	}: {
		cleanText: (str: string) => string;
		callFunction: (name: string, args: string) => string;
	}
): { res: string; remaining: string } {
	let res = "";

	while (str) {
		if (str.startsWith("{{")) {
			str = str.substr(2);
			const fnNameEnd = str.indexOf("|");
			const fnName = str.substr(0, fnNameEnd);
			str = str.substr(fnNameEnd + 1);
			const callv = parseDGMD(str, { cleanText, callFunction });
			res += callFunction(fnName, callv.res);
			str = callv.remaining;
			if (str.startsWith("}}")) {
				str = str.substr(2);
			}
			continue;
		}
		if (str.startsWith("}}")) {
			break;
		}

		const [, textPart] = str.match(/^([\S\s]*?)(?:\{\{|\}\}|$)/)!;

		res += cleanText(textPart);
		str = str.substr(textPart.length);
	}

	return { res, remaining: str };
}
