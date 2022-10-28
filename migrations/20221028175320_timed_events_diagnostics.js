exports.up = async (knex, Promise) => {
	await knex.schema.table("timed_events_at2", t => {
		t.bigInteger("created_time"); // when the event was queued
		t.bigInteger("started_at_time"); // when the event was dequeued and marked 'completed'
		t.bigInteger("completed_at_time"); // when the event actually finished
        t.string("status", 10); // NEW | LOAD | SUCCESS | ERROR
        t.integer("error_id"); // id of any associated errors

        t.string("search", 100); // a string that can be used to search for this event.
        // ie an autodelete might put a search string "AUTODELETE:${message_id}"
        // that way the event can be cancelled if eg the message gets pinned or deleted
	});
};

exports.down = async (knex, Promise) => {
	await knex.schema.table("timed_events_at2", t => {
		t.dropColumn("ticket");
	});
};
