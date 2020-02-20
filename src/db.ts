import fs from "fs";
import path from "path";
import Knex from "knex";

export let globalKnex: Knex<any, unknown[]> | undefined;
let configText = "";
try {
	configText = fs.readFileSync(
		path.join(__dirname, "..", "config", "knexfile.json"),
		"utf-8",
	);
} catch (e) {
	console.log("No knexfile found. The bot will not be able to run.");
}

if (configText) {
	globalKnex = Knex(
		JSON.parse(configText)[process.env.NODE_ENV || "development"],
	);
}
