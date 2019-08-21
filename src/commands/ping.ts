import o from "../options";
import * as Router from "commandrouter";
const router = new Router<Info>();

router.add([], async (cmd: string, info) => {
	await info.result(`<a:pingpong:482012177725653003>

	*Took ${new Date().getTime() - info.other.startTime.getTime()}ms, handling ${
		info.other.infoPerSecond
	} db requests per second*`);
});

export = router;
