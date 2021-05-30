
exports.up = (knex, Promise) => {
	return knex.schema.createTable("panels", (t) => {
		t.string("owner_id", 60).notNull(); // guild or user id;
		t.string("name", 60).notNull(); // name of the panel
		t.primary(["owner_id", "name"]); // composite primary key. using this instead of an id because idk
		t.json("data").notNull(); // panel data
	});
};

exports.down = (knex, Promise) => {
	return knex.schema.dropTable("panels");
};
