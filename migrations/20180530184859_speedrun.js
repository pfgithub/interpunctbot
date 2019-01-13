
exports.up = async(knex, Promise) => {
  await knex.schema.table("guilds", (t) => {
    t.string("speedrun", 255);
  });
};

exports.down = async(knex, Promise) => {
  await knex.schema.table("guilds", (t) => {
    t.dropColumn("speedrun");
  });
};
