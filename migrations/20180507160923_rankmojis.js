
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.json("rankmojis");
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("rankmojis");
  });
};
