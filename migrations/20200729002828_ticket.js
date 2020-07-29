exports.up = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.json("ticket");
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.dropColumn("ticket");
	});
};
