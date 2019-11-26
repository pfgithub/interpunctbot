import Router from "commandrouter";
import * as moment from "moment";
import { AP, a } from "../argumentparser";
import * as he from "he";
import * as Discord from "discord.js";

import Info from "../../Info";
import { getURL } from "../speedrun";
import { safe, raw } from "../../../messages";
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

router.add("trivia", [], async (cmd: string, info) => {
	const apresult = await AP({ info, cmd });
	if (!apresult) return;

	// fetch trivia question
	let triviaQuestion: OpenTDB.Question;
	{
		let fetchProgressMessage = await info.channel.send(":loading:");
		let triviaResponse: OpenTDB.Response = await getURL`https://opentdb.com/api.php?amount=1`; // TODO other things
		if (triviaResponse.response_code !== 0) {
			throw new Error(
				"Nonzero response code on trivia. Response is: " +
					JSON.stringify(triviaResponse)
			);
		}
		triviaQuestion = triviaResponse.results[0];
		await fetchProgressMessage.delete();
	}
	{
		let choices = [
			triviaQuestion.correct_answer,
			...triviaQuestion.incorrect_answers
		].sort();
		let trueFalseEmojis = ["🇹", "🇫"];
		let multipleChoiceEmojis = [
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
		let emojiSet =
			triviaQuestion.type === "boolean"
				? trueFalseEmojis
				: multipleChoiceEmojis;

		let choiceDetails: { name: string; emoji: string }[] = choices.map(
			(choice, i) => ({ name: choice, emoji: emojiSet[i] })
		);
		let topPart = safe`Trivia
**Category**: ${decodeHTML(triviaQuestion.difficulty)}
**Difficulty**: ${triviaQuestion.difficulty}`;
		let resultMessage = await info.channel.send(
			topPart +
				`
> When the question appears, react with the correct answer before the time runs out.`
		);

		let playerAnswers: {
			[id: string]: {
				response: string;
				reactionPile: Discord.MessageReaction;
				time: number;
			};
		} = {};

		let rxn = info.handleReactions(
			resultMessage,
			async (reaction, user) => {
				let choice = choiceDetails.find(
					c => c.emoji === reaction.emoji.name
				);
				if (!choice) {
					await reaction.users.remove(user.id);
					return;
				}
				let previousAnswer = playerAnswers[user.id];
				if (previousAnswer) {
					await previousAnswer.reactionPile.users.remove(user.id);
				}
				playerAnswers[user.id] = {
					response: choice.name,
					reactionPile: reaction,
					time: new Date().getTime()
				};
			}
		);

		for (let choice of choiceDetails) {
			resultMessage.react(choice.emoji);
		}

		let startTime = new Date().getTime();

		let updateResultMessage = () =>
			resultMessage.edit(
				topPart +
					safe`
**Question:** ${decodeHTML(triviaQuestion.question)}
**Answers:**
${raw(
	choiceDetails
		.map(({ name, emoji }) => {
			return `${emoji} - ${safe`${decodeHTML(name)}`}`;
		})
		.join("\n")
)}
**Time Left**: ${((startTime + 20000 - new Date().getTime()) / 1000).toFixed(
						0
					)}s`
			);

		await updateResultMessage();

		let doneTimer = setTimeout(() => rxn.end(), 20000);
		let updateInterval = setInterval(() => updateResultMessage(), 3000);

		await rxn.done;

		clearTimeout(doneTimer);
		clearInterval(updateInterval);
	}
});

export default router;
