
exports.up = (knex, Promise) => {
	return knex.schema.createTable("errors", t => {
		t.increments("id")
			.notNull()
			.primary();
        // i64 guild id for error
        t.bigInteger("guild").notNull();
        // i64 ms since epoch
		t.bigInteger("time").notNull();
        // [100](character type) // no clue what the base character type is
		t.string("source", 100).notNull();
        // error detail
		t.json("content").notNull();
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.dropTable("errors");
};
