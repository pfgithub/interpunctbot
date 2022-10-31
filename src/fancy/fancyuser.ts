import { App, SlashCommandElement, SlashCommandGroup, u } from "./fancylib";

// todo: this shouldn't register global state, instead it should go in app
require("./user/persistent/rock_paper_scissors") as typeof import("./user/persistent/rock_paper_scissors");

export function app(): App {
	return {
		message_context_menu: [],
		slash_commands: [
			SlashCommandGroup({label: u("play"), description: u("Play a game"), children: [
				(require("./user/commands/play/rock_paper_scissors") as typeof import("./user/commands/play/rock_paper_scissors")).default(),
			]}),
			// so uuh
			// default_permission: false still lets server admins configure the permission
			// SlashCommandGroup({label: u("dev"), default_permission: false, description: u("Developer Commands"), children: [
			// 	(require("./user/commands/dev/reload_libfancy") as typeof import("./user/commands/dev/reload_libfancy")).default(),
			// 	(require("./user/commands/dev/restart") as typeof import("./user/commands/dev/restart")).default(),
			// ]}),
			(require("./user/commands/spoiler") as typeof import("./user/commands/spoiler")).default(),
			(require("./user/commands/remindme") as typeof import("./user/commands/remindme")).default(),
			(require("./user/commands/diagnose") as typeof import("./user/commands/diagnose")).default(),
			// (require("./user/commands/run") as typeof import("./user/commands/run")).default(),

			SlashCommandGroup({label: u("autodelete"), description: u("Automatically delete messages"), children: [
				SlashCommandGroup({label: u("add"), description: u("Add an autodelete rule"), children: [
					(require("./user/commands/autodelete/add/channel") as typeof import("./user/commands/autodelete/add/channel")).default(),
					(require("./user/commands/autodelete/add/prefix") as typeof import("./user/commands/autodelete/add/prefix")).default(),
					(require("./user/commands/autodelete/add/role") as typeof import("./user/commands/autodelete/add/role")).default(),
					(require("./user/commands/autodelete/add/user") as typeof import("./user/commands/autodelete/add/user")).default(),
				]}),
				(require("./user/commands/autodelete/remove") as typeof import("./user/commands/autodelete/remove")).default(),
				(require("./user/commands/autodelete/list") as typeof import("./user/commands/autodelete/list")).default(),
			]}),
			SlashCommandGroup({label: u("autopublish"), description: u("Automatically publish announcements"), children: [
				(require("./user/commands/autopublish/add") as typeof import("./user/commands/autopublish/add")).default(),
			]}),
		],
		guildSlashCommands: async (guild_id: string): Promise<SlashCommandElement[]> => [

		],
	};
}
