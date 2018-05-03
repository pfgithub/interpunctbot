
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.string("disabled_commands");
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("disabled_commands");
  });
};
