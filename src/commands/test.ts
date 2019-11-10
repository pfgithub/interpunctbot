import Router from "commandrouter";

import Info from "../Info";

import { ArgumentParser } from "./argumentparser";

const router = new Router<Info, any>();

router.add("test", [], async (cmd: string, info) => {
	const pa = await ArgumentParser({ info, cmd }, "emoji", "role...");
	// there should be something like as const that doesn't make it const
	if (!pa) return;
	const [emoji, role] = pa;
	await info.success(`Emoji ID: ${emoji.id}, Role ID: ${role.id}`);
});

export default router;
