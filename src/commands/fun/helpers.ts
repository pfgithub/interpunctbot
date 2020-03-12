import { setEditInterval } from "../../editInterval";
import { perr } from "../../..";
import Info from "../../Info";

export { setEditInterval };

export function createTimer(
	...timerSpecs: [number, () => Promise<void>][]
): { reset: () => void; end: () => void; over: () => Promise<void> } {
	let overCB: (() => void) | undefined;
	const timers: NodeJS.Timeout[] = [];
	let timersCompleted = 0;
	const endTimers = () => {
		timersCompleted = 0;
		timers.forEach(timer => clearTimeout(timer));
	};
	const updateTimers = () => {
		endTimers();
		timerSpecs.forEach(([time, cb]) => {
			timers.push(
				setTimeout(() => {
					timersCompleted++;
					perr(cb(), "timer");
					if (timersCompleted == timerSpecs.length) {
						overCB && overCB();
					}
				}, time),
			);
		});
	};
	updateTimers();
	return {
		reset: () => {
			updateTimers();
		},
		end: () => {
			endTimers();
			overCB && overCB();
		},
		over: () =>
			new Promise(r => {
				if (overCB)
					throw new Error("multiple things waiting on timer end");
				overCB = () => {
					r();
					overCB = undefined;
				};
			}),
	};
}

export async function getPlayers(
	initial: string[],
	playerLimit: number,
	gameName: string,
	/*requireApprobalBeforeStart*/ info: Info,
) {
	const playersInGame: string[] = initial;
	{
		const startTime = new Date().getTime();
		const getJoinMessageText = () =>
			`${info.message.author.toString()} has started a game of ${gameName}.
> (${`${playersInGame.length}`}/${playerLimit}) ${playersInGame
				.map(pl => `<@${pl}>`)
				.join(", ")}
> React <:j:455896379210989568> to join. (${`${60 -
				Math.floor(
					(new Date().getTime() - startTime) / 1000,
				)}`}s left)`;

		const joinRequestMessage = await info.channel.send(
			getJoinMessageText(),
		);

		const updateMessage = () =>
			joinRequestMessage.edit(getJoinMessageText());

		const handleReactions = info.handleReactions(
			joinRequestMessage,
			async (reaction, user) => {
				if (reaction.emoji.name !== "➕") {
					await reaction.users.remove(user);
				}
				if (playersInGame.length < playerLimit) {
					if (!playersInGame.includes(user.id)) {
						playersInGame.push(user.id);
						if (playersInGame.length === playerLimit) {
							// start game
							handleReactions.end();
						}
					}
				}
			},
		);

		await joinRequestMessage.react("➕");

		const editInterval = setEditInterval(async () => {
			await updateMessage();
		});

		const tempt = setTimeout(() => {
			perr(updateMessage(), "updating join message 2");
			handleReactions.end();
		}, 60000);
		await handleReactions.done;
		clearTimeout(tempt);
		editInterval.end();
		await joinRequestMessage.delete();

		if (playersInGame.length !== playerLimit) {
			await info.error(`Not enough players to start game.`);
			return;
		}
	}
	return playersInGame;
}
