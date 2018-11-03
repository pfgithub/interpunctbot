/*global Promise*/

const Usage = require("command-parser");
const o = require("../options");
const router = new (require("commandrouter"));

router.add([], async(cmd, info) => {
	await info.result(`<a:pingpong:482012177725653003>

	*Took ${(new Date()).getTime() - info.other.startTime.getTime()}ms, handling ${info.other.infoPerSecond} db requests per second*`);
});

module.exports = router;