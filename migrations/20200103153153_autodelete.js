exports.up = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.json("autodelete");
		t.integer("autodelete_limit");
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.dropColumn("autodelete");
		t.dropColumn("autodelete_limit");
	});
};
