import { ArgumentParser } from "../src/commands/argumentparser";
import * as __assert from "assert";

const test = (name: string, cb: (assert: typeof __assert) => void) =>
	cb(__assert);

test("argument parser", assert => {
	assert.deepStrictEqual(
		ArgumentParser("<:emoji:1985461234> <#4352366542>", [
			"emoji",
			"channel"
		]),
		""
	);
	assert.deepStrictEqual(
		ArgumentParser("<:emoji:1985461234> 4352366542", ["emoji", "channel"]),
		""
	);
	assert.deepStrictEqual(
		ArgumentParser("<:emoji:1985461234> @Role Name", ["emoji", "role..."]),
		""
	);
	assert.deepStrictEqual(
		ArgumentParser("1985461234 <@&178321587>", ["emoji", "role..."]),
		""
	);
});
