import { MessageContextMenuItemElement, SlashCommandElement, SlashCommandGroup, u } from "./fancylib";

require("./user/persistent/rock_paper_scissors") as typeof import("./user/persistent/rock_paper_scissors");

export function onRightClick(): MessageContextMenuItemElement[] {
	return [
		// MessageContextMenuItem({label: u("Sample"), onClick: event => {
		// 	return renderEphemeral(Sample({event}), {visibility: "private"});
		// }}),
    ];
}

export function onSlashCommand(): SlashCommandElement[] {
	return [
		SlashCommandGroup({label: u("play"), description: u("Play a game"), children: [
			(require("./user/commands/play/rock_paper_scissors") as typeof import("./user/commands/play/rock_paper_scissors")).default(),
		]}),
		SlashCommandGroup({label: u("dev"), default_permission: false, description: u("Developer Commands"), children: [
			(require("./user/commands/dev/reload_libfancy") as typeof import("./user/commands/dev/reload_libfancy")).default(),
		]}),
	];
}