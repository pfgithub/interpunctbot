import * as config from "../config.json";
import client from "../bot";

// TODO replace about({}) with just being json

function about(otherData: {preCheck?: string; showInHelp?: boolean; }, prerequisites: any[] | never[], cb: { (data: any): boolean; (data: any): any; (data: any): any; (data: any): boolean; (data: any): boolean; (data: any): boolean; (arg0: any): void; }) {
	return (data, odInfo) => {
		const firstFailure = prerequisites.find(prereq => !prereq(data));

		if(odInfo) {
			if(firstFailure) {return firstFailure(data, odInfo);}

			const finalData = {};
			for(const key in odInfo) {
				finalData[key] = otherData[key].split`%s`.join(odInfo[key]) || "No information available";
			}
			return finalData;
		}
		if(firstFailure) {return false;}
		return cb(data);
	};
}

// TODO implement showInHelp

//module.exports.deleteOriginal = time => data => data.msg.delete(time || 0) || true; // This should not be an option. Options can be checked when running the help command
export const pm = (yn: boolean) => about({preCheck: `This command can${!yn ? "not" : " only"} be used in PMs`}, [], data => data.pm == yn); //eslint-disable-line eqeqeq
// one for if has permission
// module.exports.perm = perm => data => data.msg.guild.member().hasPermission(perm);
export const myPerm = perm => about({preCheck: `I need access to the ${perm} permission to enable this command`}, [module.exports.pm(false)], data => data.msg.guild.member(client.user).hasPermission(perm));
export const perm = perm => about({preCheck: `You need to have access to the ${perm} permission to use this command`}, [module.exports.pm(false)], data =>
	data.pm ||
	data.msg.member.hasPermission(perm) ||
	data.msg.author.id === config.owner ||
	data.msg.member.roles.get(data.permReplacements[perm])
);
// perm will have a few permissions. Once a role is set, they will use the role instead ofr
// Failed to get --- because  ---- is not set // o.setting(quotesPastebin)
export const owner = _ => about({preCheck: `You must own the bot to use this command`, showInHelp: false}, [], data => data.msg.author.id === config.owner); // this could just be o.owner instead of o.owner()
export const setting = setting => about({preCheck: `Your sever needs to have the setting ${setting} set to use this command`}, [module.exports.pm(false)], data => !!data[setting]);
export const development = _ => about({preCheck: `This bot must be in development mode to use this command`, showInHelp: false}, [], data => process.env.NODE_ENV === "development"); // this could just be o.development instaead of o.development()
