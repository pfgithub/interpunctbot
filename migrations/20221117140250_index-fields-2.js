
// this query is slow
// explain (analyze, buffers) select id from timed_events_at2 where completed = false and time < extract(epoch from current_timestamp) * 1000 order by time desc limit 1;
// taking over 300ms!
// - it index scans on idx_time, but it takes forever
// so we need to include that in our index
// - index on [time & completed]

// const next_event = await ourk().where({
//     'completed': false,
// }).whereIn("for_guild", [...all_guilds]).orderBy('time', "asc").select("*").first();
// yeah

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
