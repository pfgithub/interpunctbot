import Router from "commandrouter";

import Info from "../Info";

import { AP, a } from "./argumentparser";

const router = new Router<Info, any>();

router.add("test", [], async (cmd: string, info) => {
	const pa = await AP({ info, cmd }, a.emoji(), ...a.role());
	// there should be something like as const that doesn't make it const
	if (!pa) return;
	const [emoji, role] = pa;
	await info.success(`Emoji ID: ${emoji.id}, Role ID: ${role.id}`);
});

export default router;
