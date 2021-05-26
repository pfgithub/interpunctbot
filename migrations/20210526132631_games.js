
exports.up = (knex, Promise) => {
	return knex.schema.createTable("games", (t) => {
		t.increments("id");
        // specifies a unique id used in buttons for this game
        // format: gametype|id|btn_… for the interaction key
        t.json("data").notNull();
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.dropTable("games");
};
