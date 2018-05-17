
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.string("bot_updates", 255);
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("bot_updates");
  });
};
