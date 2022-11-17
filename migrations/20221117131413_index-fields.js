exports.up = async (knex, Promise) => {
	await knex.schema.table("timed_events_at2", t => {
        // index:
        // - search (requires a full scan to uses a where clause)
        // - time, sorted
        // - for_guild
        t.index(["search"], "idx_search", "hash"); // for '=' only
        t.index(["for_guild"], "idx_for_guild", "hash"); // for '=' only
        t.index(["time"], "idx_time", "btree"); // for '<', '>'
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("timed_events_at2", t => {
        t.dropIndex("idx_search");
        t.dropIndex("idx_for_guild");
        t.dropIndex("idx_time");
	});
};
