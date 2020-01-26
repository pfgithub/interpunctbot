export type Command = {};
export function MakeCommand() {}

export default async function handler(command, info) {
	await command("management", async command => {
		if (!info.pm) return await info.error("no perm");
		return await info.success("good");
	});
	await command("set", async command => {
		// throws an error on success. a success error. uuh...
		await command("mode", async command => {
			if (!info.perm.superpowers) return await info.success("good");
		});
	});
}

// handling commands:

/*

for(let command of commands){
	await ilt(command(message, info));
	if(error) return await info.log(errororpddakjndfs)
}

*/
