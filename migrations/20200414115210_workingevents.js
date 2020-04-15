exports.up = (knex, Promise) => {
	return knex.schema.table("timed_events", t => {
		t.bigInteger("time_64b");
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.table("timed_events", (t) => {
		t.dropColumn("time_64b");
	});
};
