exports.up = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.json("channeloptions");
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.dropColumn("channeloptions");
	});
};
