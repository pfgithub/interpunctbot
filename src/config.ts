// imports the config file

import fs from "fs";
import path from "path";

type Config = {
	token?: string;
	owner?: string;
	errorReporting?: {
		server: string;
		channel: string;
	};
	listings?: {
		"bots.discord.pw"?: string;
	};
	testing?: {
		users?: string[];
	};
};

export let globalConfig: Config = {};
let configText = "";
try {
	configText = fs.readFileSync(
		path.join(__dirname, "..", "config", "config.json"),
		"utf-8",
	);
} catch (e) {
	console.log("No config file found. The bot will not be able to run.");
}

if (configText) {
	globalConfig = JSON.parse(configText);
}
