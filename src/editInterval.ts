import { perr } from "..";

export function setEditInterval(
	cb: () => Promise<void>,
	ms = 3000,
	manual = false,
) {
	let running = false;
	let shouldQueue = false;
	const makeTimeout = () => () => (
		(async () => {
			nextTimeout = undefined;
			running = true;
			await cb();
			running = false;
			if (shouldQueue || (!nextTimeout && !manual)) {
				shouldQueue = false;
				nextTimeout = setTimeout(makeTimeout(), ms);
			}
		})().catch(e => {
			console.log(
				"edit message perr (this will stop message editing, even manually triggered)",
			);
			nextTimeout = undefined;
		}),
		undefined
	);
	let nextTimeout: NodeJS.Timeout | undefined = setTimeout(makeTimeout(), 0);
	return {
		end: () => {
			if (nextTimeout) clearTimeout(nextTimeout);
			nextTimeout = undefined;
		},
		trigger: () => {
			if (running) shouldQueue = true;
			else nextTimeout = setTimeout(makeTimeout(), 0);
		},
	};
}
