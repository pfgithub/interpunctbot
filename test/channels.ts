import { test } from ".";

const ms = (ms: number) => new Promise(r => setTimeout(r, ms));

test("Spacing channels", async t => {
	await t.resetAll();
	const channels = await t.createChannels(
		"test_one",
		"test-two",
		{ type: "voice", name: "test three" } as const,
		{ type: "category", name: "test four" } as const
	);
	// can't test news channels on the server I'm using
	await t.basePermissions();
	await t.startBot();
	await channels.test_one.send("ip!space channels");
	const result = await t.nextMessage();
	// console.log("RESULT IS", result);
	await ms(1000);
});
