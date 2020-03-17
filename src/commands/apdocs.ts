import * as nr from "../NewRouter";

nr.addDocsWebPage(
	"/arg",
	"Arg",
	"Using Commands",
	`{Title|Using Commands}
{LinkSummary|/arg/emoji}
{LinkSummary|/arg/channel}
{LinkSummary|/arg/user}
{LinkSummary|/arg/word}
{LinkSummary|/arg/enum}
{LinkSummary|/arg/number}
{LinkSummary|/arg/duration}
{LinkSummary|/arg/backtick}
{LinkSummary|/arg/role}
`,
);

/*
return await info.message`{Command|${userInput}}{Raw|${trusted text}}`
simple to do, just send the message through .replace(/\\\\/g, "\\\\\\\\").replace(/{/, "\\{").replace(/|/, "\\|").replace(/}/, "\\}") or even better, replace it with {UserInputVar|1} and have that return the actual text + raw text
*/

nr.addDocsWebPage(
	"/arg/role",
	"Role Arg",
	"Using Roles in Commands",
	`{Title|Using Roles in Commands}
Provide a role by @mentioning it or by giving the role ID.

{Heading|Examples}
{ExampleUserMessage|members @SUB-10}
{ExampleUserMessage|members {Atmention|SUB-10}}
{ExampleUserMessage|members sub}

{Heading|Errors}
{LinkSummary|/arg/role/not-found}
{LinkSummary|/arg/role/multiple-found}
{LinkSummary|/arg/role/multiple-found-fuzzy}
`,
);

nr.addErrorDocsPage("/arg/role/not-found", {
	overview:
		"This command requires a role. Give a role by @mentioning it or by giving the role ID.",
	detail: "In order to use this command, you need to provide a role.",
	mainPath: "/arg/role",
});

nr.addErrorDocsPage("/arg/role/multiple-found", {
	overview:
		"There are multiple roles with the exact same name! Either rename one of them or use the role ID.",
	detail: "",
	mainPath: "/arg/role",
});

nr.addErrorDocsPage("/arg/role/multiple-found-fuzzy", {
	overview:
		"There were multiple roles with similar names found! Either use the exact name or use the role ID.",
	detail: "",
	mainPath: "/arg/role",
});

nr.addDocsWebPage(
	"/arg/backtick",
	"Backtick Arg",
	"Using Backticks in Commands",
	`{Title|Using Backticks in Commands}
Backticks must be surrounded in \`backticks\`.

{Heading|Examples}
{ExampleUserMessage|quickrank add named \`some name\` @Role}

{Heading|Errors}
{LinkSummary|/arg/backtick/not-found}
{LinkSummary|/arg/backtick/unsafe}
`,
);

nr.addErrorDocsPage("/arg/backtick/not-found", {
	overview: "This command requires a backtick, \\`like this\\`.",
	detail:
		"In order to use this command, you need to provide a message surrounded in backticks.",
	mainPath: "/arg/backtick",
});

nr.addErrorDocsPage("/arg/backtick/unsafe", {
	overview:
		"The backtick quoted message you provided is invalid. Remove any *, _, `, ~, \\, <, >, [, ]\", ', (, ), : from it and try again.",
	detail: "These characters cannot be used in backticks.",
	mainPath: "/arg/backtick",
});

nr.addDocsWebPage(
	"/arg/duration/units",
	"Duration Units",
	"Duration Units",
	`{Title|Duration Units}
{Title|Units}
[y]ear(s), [mo]nth(s), [d]ay(s), [h]our(s), [m]inute(s), [s]econd(s), [m]ilisecond(s) (ms)
`,
);

nr.addDocsWebPage(
	"/arg/duration",
	"Duration Arg",
	"Using Durations in Commands",
	`{Title|Using Durations in Commands}
Durations can be used formatted like 10 seconds or 5 years.

{Heading|Examples}
{ExampleUserMessage|remindme 10 minutes take turkey out of the oven}
{ExampleUserMessage|remindme 1 day}
{ExampleUserMessage|remindme 10 minutes, 3 seconds do something}
{ExampleUserMessage|remindme 3y 1d do something 3 years and one day from now}

{Heading|Units}
{LinkSummary|/arg/duration/units}

{Heading|Errors}
{LinkSummary|/arg/duration/not-found}
{LinkSummary|/arg/duration/in-the-past}
{LinkSummary|/arg/duration/bad-unit}
`,
);

nr.addErrorDocsPage("/arg/duration/not-found", {
	overview: "This command requires a duration, like 10 seconds or 1 hour.",
	detail: "In order to use this command, you need to provide a duration.",
	mainPath: "/arg/duration",
});

nr.addErrorDocsPage("/arg/duration/in-the-past", {
	overview: "That time is in the past!",
	detail:
		"In order to use this command, you need to provide a positive duration.",
	mainPath: "/arg/duration",
});

nr.addErrorDocsPage("/arg/duration/bad-unit", {
	overview: "The unit in your duration could not be found.",
	detail: "List of units:\n{LinkSummary|/arg/duration/units}",
	mainPath: "/arg/duration",
});

nr.addDocsWebPage(
	"/arg/number",
	"Number Arg",
	"Using Numbers in Commands",
	`{Title|Using Numbers in Commands}
Numbers can be used in commands.

{Heading|Examples}
{ExampleUserMessage|purge 25}

{Heading|Errors}
{LinkSummary|/arg/number/not-found}
`,
);

nr.addErrorDocsPage("/arg/number/not-found", {
	overview: "This command requires a number.",
	detail: "In order to use this command, you need to provide a number.",
	mainPath: "/arg/number",
});

nr.addDocsWebPage(
	"/arg/enum",
	"Enum Arg",
	"Using Enum in Commands",
	`{Title|Using Enum in Commands}
Enum can be used in commands.

{Heading|Examples}
{ExampleUserMessage|fun enable}
{ExampleUserMessage|fun disable}

{Heading|Errors}
{LinkSummary|/arg/enum/not-found}
`,
);

nr.addErrorDocsPage("/arg/enum/not-found", {
	overview:
		"This command requires you to select between one of a few options.",
	detail:
		"In order to use this command, you need to select between the provided options.",
	mainPath: "/arg/enum",
});

nr.addDocsWebPage(
	"/arg/word",
	"Word Arg",
	"Using Word in Commands",
	`{Title|Using Word in Commands}
Word can be used in commands.

{Heading|Errors}
{LinkSummary|/arg/word/not-found}
`,
);

nr.addErrorDocsPage("/arg/word/not-found", {
	overview: "This command requires a word. Add a word.",
	detail: "In order to use this command, you need to provide a word.",
	mainPath: "/arg/word",
});

nr.addDocsWebPage(
	"/arg/user",
	"User Arg",
	"Using Users in Commands",
	`{Title|Using Users in Commands}
Users can be used in commands by either mentioning the user directly or by providing the user ID.

{Heading|Examples}
Mentioning the user directly:
{ExampleUserMessage|autodelete add 10s user {Atmention|Mee6}}

Using the user ID:
{ExampleUserMessage|autodelete add 10s user 159985870458322944}

{Heading|Errors}
{LinkSummary|/arg/user/not-found}
`,
);

nr.addErrorDocsPage("/arg/user/not-found", {
	overview:
		"This command requires a user. Mention a user by typing @ and selecting the user, or use the user's ID.",
	detail: "In order to use this command, you need to provide a user.",
	mainPath: "/arg/user",
});

nr.addDocsWebPage(
	"/arg/channel",
	"Channel Arg",
	"Using Channels in Commands",
	`{Title|Using Channels in Commands}
Channels can be used in commands by either mentioning the channel directly or by providing the channel ID.

{Heading|Examples}
Using the channel directly:
{ExampleUserMessage|slowmode set {Channel|channel} 1s}

Using the channel ID:
{ExampleUserMessage|slowmode set 674791207544684577 3s}

{Heading|Errors}
{LinkSummary|/arg/channel/not-found}
`,
);

nr.addErrorDocsPage("/arg/channel/not-found", {
	overview:
		"This command requires a channel. Mention a channel by typing # and selecting a channel, or use the channel ID.",
	detail: "In order to use this command, you need to provide a channel.",
	mainPath: "/arg/channel",
});

nr.addDocsWebPage(
	"/arg/emoji",
	"Emoji Arg",
	"Using Emojis in Commands",
	`{Title|Using Emojis in Commands}
Emojis can be used in commands by either using the emoji directly or by providing the emoji ID.

{Heading|Examples}
Using the emoji directly:
{ExampleUserMessage|emoji inspect {Emoji|sub10}}

Using the emoji ID:
{ExampleUserMessage|emoji inspect 443555771972845568}
To get an emoji ID, you can say the emoji in discord but put a {Code|\\\\} backslash before it, like \\\\{Emoji|sub10}. Instead of saying the emoji, discord will say some text and the emoji ID (all the numbers).

{Heading|Errors}
{LinkSummary|/arg/emoji/not-found}
`,
);

nr.addErrorDocsPage("/arg/emoji/not-found", {
	overview:
		"This command requires an emoji! Use an emoji by selecting it from the emoji menu, or using the emoji's id.",
	detail: "In order to use this command, you need to provide an emoji.",
	mainPath: "/arg/emoji",
});
