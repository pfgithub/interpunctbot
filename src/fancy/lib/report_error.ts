import { QueryBuilder } from "knex";
import { globalKnex } from "../../db";

type ErrorContent = {
    message: string,
    stack: string,
    context: unknown,
};

type StringOrObject<T> = string & {__or_object: T};

type DBError = {
    id: number,
    guild: string,
    time: `${number}`,
    source: string,
    content: StringOrObject<ErrorContent>,
};

const errorsDb = (): QueryBuilder<DBError, DBError[]> => globalKnex!<DBError, DBError[]>("errors");

function stringifyv<T>(v: T): StringOrObject<T> {
    return JSON.stringify(v) as StringOrObject<T>;
}

export function reportError(guild_id: string, source: string, error: Error, context: unknown): void {
    if(process.env.NODE_ENV !== "PRODUCTION") {
        console.log("[error reported to db]", {guild_id, source, error, context});
    }
    try {
        const error_content: ErrorContent = {
            message: error.message,
            stack: error.stack ?? "",
            context,
        };

        errorsDb().insert({
            guild: guild_id,
            time: `${Date.now()}`,
            source,
            content: stringifyv(error_content),
        }).then(res => {

        }).catch(err => {
            console.log("[REPORT_ERROR] Fail to save error report:", err, error_content);
        });
    }catch(err) {
        console.log("[REPORT_ERROR] Fail to report error:", err, guild_id, source, error, context);
    }
}