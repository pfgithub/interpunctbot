
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.string("rankmojiChannel");
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("rankmojiChannel");
  });
};
