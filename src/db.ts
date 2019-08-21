const knex = require("knex")(require("../knexfile")[process.env.NODE_ENV || "production"]);
export default knex;
