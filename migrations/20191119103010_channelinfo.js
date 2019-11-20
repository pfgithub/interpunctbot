
exports.up = (knex, Promise) => {
	return knex.schema.createTable("channels", (t) => {
		t.string("id").notNull().primary();
        t.string("guildID").notNull();
		t.string("pinnedMessageID").notNull();
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.dropTable("channels");
};
