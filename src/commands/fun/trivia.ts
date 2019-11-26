import Router from "commandrouter";
import * as moment from "moment";
import { AP, a } from "../argumentparser";
import * as he from "he";
import * as Discord from "discord.js";

import Info from "../../Info";
import { getURL } from "../speedrun";
import { safe, raw, messages } from "../../../messages";
import { DiscordAPIError } from "discord.js";

const router = new Router<Info, any>();

declare namespace OpenTDB {
	type Difficulty = "easy" | "medium" | "hard";
	type Category =
		| "Any Category"
		| "General Knowledge"
		| "Entertainment: Books"
		| "Entertainment: Film"
		| "Entertainment: Music"
		| "Entertainment: Musicals &amp; Theatres"
		| "Entertainment: Television"
		| "Entertainment: Video Games"
		| "Entertainment: Board Games"
		| "Science &amp; Nature"
		| "Science: Computers"
		| "Science: Mathematics"
		| "Mythology"
		| "Sports"
		| "Geography"
		| "History"
		| "Politics"
		| "Art"
		| "Celebrities"
		| "Animals"
		| "Vehicles"
		| "Entertainment: Comics"
		| "Science: Gadgets"
		| "Entertainment: Japanese Anime &amp; Manga"
		| "Entertainment: Cartoon &amp; Animations";

	type Type = "multiple" | "boolean";

	type Response = {
		response_code: 0;
		results: Question[];
	};

	type Question = {
		category: Category;
		type: Type;
		difficulty: Difficulty;
		question: string;
		correct_answer: string;
		incorrect_answers: string[];
	};
}

function decodeHTML(html: string) {
	return he.decode(html);
}

const letterToEmojiMap = {
	a: "🇦",
	b: "🇧",
	c: "🇨",
	d: "🇩",
	e: "🇪",
	f: "🇫",
	g: "🇬",
	h: "🇭",
	i: "🇮",
	j: "🇯",
	k: "🇰",
	l: "🇱",
	m: "🇲",
	n: "🇳",
	o: "🇴",
	p: "🇵",
	q: "🇶",
	r: "🇷",
	s: "🇸",
	t: "🇹",
	u: "🇺",
	v: "🇻",
	w: "🇼",
	x: "🇽",
	y: "🇾",
	z: "🇿"
};

const emojiOrderListMapArraySet = [
	"🇦",
	"🇧",
	"🇨",
	"🇩",
	"🇪",
	"🇫",
	"🇬",
	"🇭",
	"🇮",
	"🇯",
	"🇰",
	"🇱",
	"🇲",
	"🇳",
	"🇴",
	"🇵",
	"🇶",
	"🇷",
	"🇸",
	"🇹",
	"🇺",
	"🇻",
	"🇼",
	"🇽",
	"🇾",
	"🇿"
];

router.add("trivia", [], async (cmd: string, info) => {
	const apresult = await AP({ info, cmd });
	if (!apresult) return;

	if (info.db ? await info.db.getFunEnabled() : true) {
	} else {
		return await info.error(messages.fun.fun_disabled(info));
	}

	if (info.myChannelPerms) {
		if (!info.myChannelPerms.has("ADD_REACTIONS")) {
			return await info.error(
				"I need permission to `add reactions` here to play trivia\n> https://interpunct.info/help/fun/trivia"
			);
		}
		if (!info.myChannelPerms.has("MANAGE_MESSAGES")) {
			return await info.error(
				"I need permission to `manage messages` here to remove people's reactions in trivia\n> https://interpunct.info/help/fun/trivia"
			);
		}
	}

	// fetch trivia question
	let triviaQuestion: OpenTDB.Question;
	{
		// const fetchProgressMessage = await info.channel.send(":loading:");
		await info.startLoading();
		const triviaResponse: OpenTDB.Response = await getURL`https://opentdb.com/api.php?amount=1`; // TODO other things
		if (triviaResponse.response_code !== 0) {
			throw new Error(
				`Nonzero response code on trivia. Response is: ${JSON.stringify(
					triviaResponse
				)}`
			);
		}
		triviaQuestion = triviaResponse.results[0];
		// await fetchProgressMessage.delete();
		await info.stopLoading();
	}
	{
		let choiceDetails: {
			name: string;
			emoji: string;
		}[] = [];
		{
			const choices = [
				triviaQuestion.correct_answer,
				...triviaQuestion.incorrect_answers
			].sort();

			const startingEmoji = (s: string) => {
				const char = s.match(/[A-Za-z]/);
				if (!char) {
					return letterToEmojiMap.z;
				}
				return (letterToEmojiMap as any)[
					char[0].toLowerCase()
				] as string;
			};
			let useCustom = true;
			const emojiToAnswerMap: { [key: string]: string } = {};
			choices.forEach(choice => {
				const se = startingEmoji(choice);
				if (emojiToAnswerMap[se]) useCustom = false;
				emojiToAnswerMap[se] = choice;
				choiceDetails.push({ name: choice, emoji: se });
			});

			if (!useCustom) {
				choiceDetails = choices.map((choice, i) => ({
					name: choice,
					emoji: emojiOrderListMapArraySet[i]
				}));
			}
		}
		const topPart = safe`Trivia questions from <https://opentdb.com/>
**Category**: ${decodeHTML(triviaQuestion.category)}
**Difficulty**: ${decodeHTML(triviaQuestion.difficulty)}`;
		const resultMessage = await info.channel.send(
			`${topPart}
> When the question appears, react with the correct answer before the time runs out.`
		);

		const playerAnswers: {
			[id: string]: {
				response: string;
				reactionPile: Discord.MessageReaction;
				time: number;
			};
		} = {};

		let state = { state: "running" } as
			| { state: "running" }
			| { state: "over"; winners: string[] };

		const rxn = info.handleReactions(
			resultMessage,
			async (reaction, user) => {
				if (state.state !== "running") {
					return;
				}
				const choice = choiceDetails.find(
					c => c.emoji === reaction.emoji.name
				);
				if (!choice) {
					await reaction.users.remove(user.id);
					return;
				}
				const previousAnswer = playerAnswers[user.id];
				playerAnswers[user.id] = {
					response: choice.name,
					reactionPile: reaction,
					time: new Date().getTime()
				};
				if (previousAnswer) {
					await previousAnswer.reactionPile.users.remove(user.id);
				}
			}
		);

		for (const choice of choiceDetails) {
			await resultMessage.react(choice.emoji);
		}

		const startTime = new Date().getTime();

		const updateResultMessage = () =>
			resultMessage.edit(
				topPart +
					safe`
**Question**: ${decodeHTML(triviaQuestion.question)}
**Answers**:
${raw(
	choiceDetails
		.map(({ name, emoji }) => {
			return `${emoji} - ${safe`${decodeHTML(name)}`}`;
		})
		.join("\n")
)}
${raw(
	state.state === "running"
		? `**Time Left**: ${(
				(startTime + 20000 - new Date().getTime()) /
				1000
		  ).toFixed(0)}s`
		: `**Correct Answer**: ${
				choiceDetails.find(
					cd => cd.name === triviaQuestion.correct_answer
				)!.emoji
		  } - ${safe`${decodeHTML(triviaQuestion.correct_answer)}`}
**Winners**: ${
				state.winners.length === 0
					? "*No one won*"
					: state.winners.map(w => `<@${w}>`).join(", ")
		  }`
)}`
			);

		await updateResultMessage();

		const doneTimer = setTimeout(() => rxn.end(), 20000);
		const updateInterval = setInterval(() => {
			updateResultMessage();
			if (startTime + 30000 - new Date().getTime() < 0) {
				clearInterval(updateInterval);
			}
		}, 3000);

		await rxn.done;

		const winners: { id: string; time: number }[] = [];
		Object.keys(playerAnswers).forEach(playerid => {
			const playerAnswer = playerAnswers[playerid];
			if (playerAnswer.response === triviaQuestion.correct_answer) {
				winners.push({ id: playerid, time: playerAnswer.time });
			}
		});
		clearTimeout(doneTimer);
		clearInterval(updateInterval);
		state = {
			state: "over",
			winners: winners.sort((wa, wb) => wa.time - wb.time).map(q => q.id)
		};
		await updateResultMessage();
	}
});

export default router;
