
exports.up = (knex, Promise) => {
  return knex.schema.createTable("guilds", (t) => {
    t.string("id").notNull().primary();
    t.string("prefix").notNull();
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.dropTable("guilds");
};
