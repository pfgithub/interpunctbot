
exports.up = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.string("quotes");
  });
};

exports.down = (knex, Promise) => {
  return knex.schema.table("guilds", (t) => {
    t.dropColumn("quotes");
  });
};
