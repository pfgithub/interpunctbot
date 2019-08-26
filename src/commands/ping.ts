import Router from "commandrouter";
import Info from "../Info";
const router = new Router<Info, any>();

router.add([], async (cmd: string, info) => {
	if (!info.other) {
		return await info.result("<a:pingpong:482012177725653003>", undefined);
	}
	await info.result(
		`<a:pingpong:482012177725653003>

	*Took ${new Date().getTime() - info.other.startTime}ms, handling ${
			info.other.infoPerSecond
		} db requests per second*`,
		undefined
	);
});

export = router;
