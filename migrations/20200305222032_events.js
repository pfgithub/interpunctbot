exports.up = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.json("events");
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.dropColumn("events");
	});
};
