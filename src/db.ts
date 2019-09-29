import * as knexfile from "../knexfile.json";

const knex = require("knex")(
	(knexfile as any)[process.env.NODE_ENV || "development"]
);
export default knex;
