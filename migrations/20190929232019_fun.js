exports.up = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.string("funEnabled", 10); // true|false
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.dropColumn("funEnabled");
	});
};
