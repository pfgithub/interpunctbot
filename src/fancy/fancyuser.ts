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
			(require("./user/commands/dev/restart") as typeof import("./user/commands/dev/restart")).default(),
		]}),
        (require("./user/commands/spoiler") as typeof import("./user/commands/spoiler")).default(),
        (require("./user/commands/remindme") as typeof import("./user/commands/remindme")).default(),
	];
}