import moment = require("moment");

export function durationFormat(time: number) {
	const duration = moment.duration(time, "seconds");
	// return duration.humanize();
	return duration.format(
		"y [years,] M [months,] w [weeks,] d [days,] h [hours,] m [minutes,] s [seconds,] SSS[ms]"
	);
}
