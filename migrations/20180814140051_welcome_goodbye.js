
exports.up = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.string("welcome", 1024);
		t.string("goodbye", 1024);
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.dropColumn("welcome");
		t.dropColumn("goodbye");
	});
};
