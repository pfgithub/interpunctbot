
exports.up = (knex, Promise) => {
	return knex.schema.createTable("messages_per", (t) => {
		t.string("id").notNull().primary();
        t.json("data").notNull();
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.dropTable("messages_per");
};
