import { refreshFancylib } from "../../../fancyhmr";
import { Message, renderEphemeral, renderError, SlashCommand, u } from "../../../fancylib";

export default function Command() {
    return SlashCommand({
        label: u("reload_libfancy"),
        description: u("Reload libfancy"),
        children: [],
        onSend: ev => {
            // if(dev) {delete require.cache(require.resolve(__filename))
            // return require(require.resolve(__filename)).onSend(ev)}
            // else return onSend(ev);
            const user = ev.interaction.member?.user ?? ev.interaction.user;
            if(!user || user.id !== "341076015663153153") return renderError(u("× You can't do that"));
            const result = refreshFancylib();
            return renderEphemeral(Message({
                text: u(result),
            }), {visibility: "public"});
        },
    });
}