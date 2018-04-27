const knex = require("knex")(require("../knexfile").development);
module.exports = knex;
