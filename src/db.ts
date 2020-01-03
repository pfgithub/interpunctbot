import * as knexfile from "../knexfile.json";
import * as Knex from "knex";

const knex = Knex((knexfile as any)[process.env.NODE_ENV || "development"]);
export default knex;
