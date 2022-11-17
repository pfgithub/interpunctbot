
exports.up = async (knex, Promise) => {
	await knex.schema.table("timed_events_at2", t => {
        t.index(["time", "completed"], "idx_time_and_completed", "btree"); // these fields are often used together
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("timed_events_at2", t => {
        t.dropIndex("idx_time_and_completed");
	});
};
