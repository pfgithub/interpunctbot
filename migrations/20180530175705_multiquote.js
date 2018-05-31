
exports.up = async(knex, Promise) => {
  await knex.schema.table("guilds", (t) => {
    t.json("searchablePastebins");
  });
};

exports.down = async(knex, Promise) => {
  await knex.schema.table("guilds", (t) => {
    t.dropColumn("searchablePastebins");
  });
};
