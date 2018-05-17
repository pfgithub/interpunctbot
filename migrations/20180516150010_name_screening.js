
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.string("nameScreening");
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("nameScreening");
  });
};
