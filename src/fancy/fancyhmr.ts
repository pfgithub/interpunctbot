import type { ContextMenuCommandRouter, SlashCommandRouter } from "../SlashCommandManager";

let fancylib = require("./fancylib") as typeof import("./fancylib");

export const fancylib_persistence = new Map<string, {last_used: number, value: string}>();

// let flib = require("fancylib")
// flib.initialize();

// and then we register stuff or something

let g_cmcr: ContextMenuCommandRouter | null = null;
let g_scr: SlashCommandRouter | null = null;

export function registerFancylib(cmcr: ContextMenuCommandRouter, scr: SlashCommandRouter): void {
    fancylib.registerFancylib(cmcr, scr, {allow_overwrite: false});
    g_cmcr = cmcr;
    g_scr = scr;
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

    // ah right. we unfortunately put callbacks in our registration so we'll reregister
    // here. since we read directly from this router in slash_command_manager, it
    // should be okay to do this even though the commands won't update.
    if(g_cmcr && g_scr) fancylib.registerFancylib(g_cmcr, g_scr, {allow_overwrite: true});

    const end = Date.now();
    return "✓ Fancylib reloaded in "+(end - start)+"ms.";
}