
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.string("logging", 255);
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("logging");
  });
};
