
exports.up = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.json("rankingchannels");
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.dropColumn("rankingchannels");
	});
};
