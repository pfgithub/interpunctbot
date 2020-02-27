import { perr } from "..";

export function setEditInterval(cb: () => Promise<void>) {
	const makeTimeout = () => () => (
		(async () => {
			await cb();
			nextTimeout = setTimeout(makeTimeout(), 2000);
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
