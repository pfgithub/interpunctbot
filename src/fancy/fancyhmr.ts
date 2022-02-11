import type { ContextMenuCommandRouter, SlashCommandRouter } from "../SlashCommandManager";

let fancylib = require("./fancylib") as typeof import("./fancylib");

export const fancylib_persistence = new Map<string, {last_used: number, value: string}>();

// let flib = require("fancylib")
// flib.initialize();

// and then we register stuff or something

export function registerFancylib(cmcr: ContextMenuCommandRouter, scr: SlashCommandRouter): void {
    fancylib.registerFancylib(cmcr, scr);
}

export function refreshFancylib(): string {
    const start = Date.now();
    delete require.cache[require.resolve("./fancylib")];
    delete require.cache[require.resolve("./fancyuser")];

    let nfl;
    try {
        nfl = require("./fancylib");
    }catch(e) {
        console.log(e);
        return "× Failed to refresh fancylib";
    }
    fancylib.destroyFancylib();
    fancylib = nfl;

    // does not reregister yet
    const end = Date.now();
    return "✓ Fancylib reloaded in "+(end - start)+"ms.";
}