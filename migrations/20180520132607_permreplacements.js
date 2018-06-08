
exports.up = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.json("permreplacements");
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.dropColumn("permreplacements");
	});
};
