
exports.up = (knex, Promise) => {
	return knex.schema.createTable("channeloptions", (t) => {
		t.string("id").notNull().primary();
        t.string("guildID").notNull();
		t.json("options");
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.dropTable("channeloptions");
};
