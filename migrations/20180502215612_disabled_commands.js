
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.json("disabled_commands");
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("disabled_commands");
  });
};
