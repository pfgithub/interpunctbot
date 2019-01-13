
exports.up = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.string("unknownCommandMessages", 255); // shouldn't this be a boolean lol
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.dropColumn("unknownCommandMessages");
	});
};
