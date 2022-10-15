/*
timed_events_at2 changes:
- you can only create timed events for your current guild
- other shards will not create timed events for you

on launch:
- find all non-completed timed events for your guild
- first: mark them as completed
- second: complete them
- while this may cause missing events, it will not get stuck in a loop
- also, consider deleting completed events
  - either after 30 days or immediately
*/
exports.up = (knex, Promise) => {
	return knex.schema.createTable("timed_events_at2", t => {
		t.increments("id")
			.notNull()
			.primary();
        t.bigInteger("for_guild").notNull();
		t.bigInteger("time").notNull();
		t.json("event").notNull();
		t.boolean("completed").notNull();
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.dropTable("timed_events_at2");
};
