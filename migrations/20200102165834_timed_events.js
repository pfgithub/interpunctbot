exports.up = (knex, Promise) => {
	return knex.schema.createTable("timed_events", t => {
		t.increments("id")
			.notNull()
			.primary();
		t.integer("time").notNull();
		t.json("event").notNull();
		t.boolean("completed").notNull();
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.dropTable("timed_events");
};
