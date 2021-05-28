import moment from "moment";

export function durationFormat(time: number): string {
	const duration = moment.duration(time, "ms");
	// return duration.humanize();
	return duration
		.format(
			"y [years,] M [months,] w [weeks,] d [days,] h [hours,] m [minutes,] s [seconds,] SSS[ms]",
		)
		.split(", ")
		.map(l =>
			+l.trim().split(" ")[0] === 0
				? undefined
				: l === "000ms"
				? undefined
				: l,
		)
		.filter(q => q)
		.filter((q, i) => i <= 2)
		.join(", ")
	;
}
