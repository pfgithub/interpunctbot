import * as nr from "../NewRouter";

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

nr.addErrorDocsPage("/arg/emoji/not-provided", {
	overview:
		"This command requires an emoji! Use an emoji by selecting it from the emoji menu, or using the emoji's id.",
	detail: "In order to use this command, you need to provide an emoji.",
	mainPath: "/arg/emoji",
});
