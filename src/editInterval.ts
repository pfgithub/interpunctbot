import { perr } from "..";

export function setEditInterval(cb: () => Promise<void>, ms = 3000) {
	const makeTimeout = () => () => (
		(async () => {
			await cb();
			nextTimeout = setTimeout(makeTimeout(), ms);
		})().catch(e => {
			console.log("edit message perr (this will stop message editing)");
			nextTimeout = undefined;
		}),
		undefined
	);
	let nextTimeout: NodeJS.Timeout | undefined = setTimeout(makeTimeout(), 0);
	return {
		end: () => {
			if (!nextTimeout)
				throw new Error("stream ended but no timeout is active");
			clearTimeout(nextTimeout);
			nextTimeout = undefined;
		},
	};
}
