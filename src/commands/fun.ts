import Router from "commandrouter";
import Info from "../Info";
const router = new Router<Info, any>();

import {messages} from "../../messages";

router.add("ping", [], async (cmd: string, info) => {
	if(info.db ? await info.db.getFunEnabled() : true){}else{
		return info.error(messages.fun.fun_disabled(info));
	}
	
	if (!info.other) {
		return await info.result("<a:pingpong:482012177725653003>", undefined);
	}
	await info.result(
		messages.fun.ping(info),
		undefined
	);
});

export default router;
