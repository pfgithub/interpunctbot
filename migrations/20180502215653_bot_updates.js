
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.string("bot_updates");
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("bot_updates");
  });
};
