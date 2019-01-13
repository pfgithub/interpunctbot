
exports.up = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.string("channel_spacing", 255);
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.table("guilds", (t) => {
		t.dropColumn("channel_spacing");
	});
};
