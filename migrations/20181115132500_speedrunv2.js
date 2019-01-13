
exports.up = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.json("speedrunv2");
		t.json("limits");
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.dropColumn("speedrunv2");
		t.dropColumn("limits");
	});
};
