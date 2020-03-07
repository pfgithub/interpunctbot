exports.up = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.json("nameScreening2");
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("guilds", t => {
		t.dropColumn("nameScreening2");
	});
};
