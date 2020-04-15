exports.up = (knex, Promise) => {
	return knex.schema.table("timed_events", t => {
		t.dropColumn("time");
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.table("timed_events", (t) => {
        throw new Error("Oops! you can't revert a dropped column... rip :("); // I guess the column could be recreated with values set to 0 in case the timedevents upgrade doesn't work
	});
};
