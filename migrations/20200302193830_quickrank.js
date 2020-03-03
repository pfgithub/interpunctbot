exports.up = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.json("quickrank");
		t.integer("quickrank_limit");
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.dropColumn("quickrank");
		t.dropColumn("quickrank_limit");
	});
};
