exports.up = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.json("managebotrole");
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.dropColumn("managebotrole");
	});
};
