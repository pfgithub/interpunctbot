
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.string("rankmojiChannel", 255);
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("rankmojiChannel");
  });
};
