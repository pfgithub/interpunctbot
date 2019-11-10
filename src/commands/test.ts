import Router from "commandrouter";

import Info from "../Info";

import { ArgumentParser } from "./argumentparser";

const router = new Router<Info, any>();

router.add("test", [], async (cmd: string, info) => {
	const parsedArguments = await ArgumentParser(
		info,
		["emoji", "role..."] as const,
		cmd,
		""
	); // there should be something like as const that doesn't make it const
	if (!parsedArguments) {
		return;
	}
	const [emoji, role] = parsedArguments;
	await info.success(`Emoji ID: ${emoji.id}, Role ID: ${role.id}`);
});

export default router;
