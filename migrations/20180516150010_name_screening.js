
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.json("nameScreening");
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("nameScreening");
  });
};
