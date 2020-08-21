// a bot that manages assets

// 1: setup - generate png files (cached, result name should include last update timestamp)
// 2: determine required server count
// 3: connect to discord. check if connected to required server count
// 4: update the mapping of emoji name -> emoji id. remove unused emojis. add new emojis.

import {promises as fs} from "fs";
import * as cp from "child_process";
import * as path from "path";
import * as discord from "discord.js";

function exec(cwd: string, cmd: string, args: string[]) {
	const res = cp.spawnSync(cmd, args, {cwd});
	if(res.error) throw res.error;
}

function advanceMode(mode: number[], choices: string[][]) {
    for(let i = 0; i <= mode.length; i++) {
        if(i === mode.length) return false;
        const selitm = choices[i];
        // advance mode[i]
        mode[i] += 1;
        if(mode[i] >= selitm.length) {
            mode[i] = 0;
        } else break;
    }
    return true;
}

// makefile escape. not actually good, will break for certain characters in filenames
const se = (filename: string) => filename.split(" ").join("\\ ");

// basically a makefile but not a makefile
// or it could be a makefile. wouldn't be too difficult
// just generate a makefile and run `make -j4`
class Depender {
	makefile: string[] = [];
	depend(inv: string[], out: string[], cmd: string, args: string[]) {
		if(out.length !== 1) throw new Error("")
		this.makefile.push(out[0] + ": " + inv.map(se).join(" "));
		this.makefile.push("\t"+se(cmd)+" "+args.map(se).join(" "));
	}
	async produce(cwd: string, files: string[]) {
		await fs.writeFile(path.join(cwd, "Makefile"), this.makefile.join("\n"));
		exec(cwd, "make", ["-j4", ...files]);
		await fs.unlink(path.join(cwd, "Makefile"));
	}
}

type ProjectResult = {emojiname: string; path: string; data: string};

async function createPaperSoccer(_cwd: string): Promise<ProjectResult[]> {
	const soccer = path.join(_cwd, "assets/paper soccer");
	
	// : to create:
	// check if the source files changed
	// if so: create the dist file
	// if any dist files are unneeded: delete them
	// basically: generate and run a makefile
	// then: see what changed
	// then: update those on discord
	
	const depender = new Depender();
	const depend = depender.depend.bind(depender);
	const finals: string[] = [];
	
	exec(soccer, "mkdir", ["-p", "inter"]);
	exec(soccer, "mkdir", ["-p", "res"]);

	depend(["ball.png"], ["inter/balldr.png"], "convert", ["ball.png", "-crop", "32x32+0+0", "inter/balldr.png"]);
	depend(["ball.png"], ["inter/balldl.png"], "convert", ["ball.png", "-crop", "32x32+32+0", "inter/balldl.png"]);
	depend(["ball.png"], ["inter/ballur.png"], "convert", ["ball.png", "-crop", "32x32+0+32", "inter/ballur.png"]);
	depend(["ball.png"], ["inter/ballul.png"], "convert", ["ball.png", "-crop", "32x32+32+32", "inter/ballul.png"]);

	depend(["lines.png"], ["inter/linebottom.png"], "convert", ["lines.png", "-crop", "32x16+0+0", "-background", "none", "-gravity", "north", "-splice", "0x16", "inter/linebottom.png"]);
	depend(["lines.png"], ["inter/linetop.png"], "convert", ["lines.png", "-crop", "32x16+0+16", "-background", "none", "-gravity", "south", "-splice", "0x16", "inter/linetop.png"]);

	depend(["lines.png"], ["inter/lineright.png"], "convert", ["lines.png", "-crop", "16x32+32+0", "-background", "none", "-gravity", "west", "-splice", "16x0", "inter/lineright.png"]);
	depend(["lines.png"], ["inter/lineleft.png"], "convert", ["lines.png", "-crop", "16x32+48+0", "-background", "none", "-gravity", "east", "-splice", "16x0", "inter/lineleft.png"]);

	depend(["lines.png"], ["inter/linediagonur.png"], "convert", ["lines.png", "-crop", "32x32+0+32", "inter/linediagonur.png"]);
	depend(["lines.png"], ["inter/linediagonbr.png"], "convert", ["lines.png", "-crop", "32x32+32+32", "inter/linediagonbr.png"]);
	
	depend(["bg.png"], ["inter/bg.png"], "cp", ["bg.png", "inter/bg.png"]);
	
	const choices = [
	    ["bg"],
	    ["", "linebottom"],
	    ["", "lineleft"],
	    ["", "lineright"],
	    ["", "linetop"],
	    ["", "linediagonbr"],
	    ["", "linediagonur"],
	    ["", "balldl", "balldr", "ballul", "ballur"],
	];
    const mode = new Array(choices.length).fill(0);
	
	// ok now generate all possible combanations
	do {
		const pnglayers = mode.map((pce, i) => choices[i][pce]).filter(pce => pce).map(layer => "inter/"+layer+".png");
        const args: string[] = [];
        pnglayers.forEach((layer, i) => {
            args.push(layer); if(i !== 0) args.push("-composite");
        });
		const resfyl = "res/_" + mode.map(m => "" + m).join("_") + "_.png";
        args.push(resfyl);
		depend(pnglayers, [resfyl], "convert", args);
		finals.push(resfyl);
    } while(advanceMode(mode, choices));
	
	await depender.produce(soccer, finals);
	
	const res: ProjectResult[] = await Promise.all(finals.map(async final => {
		const selections = final.split("_").map(a => +a);
		selections.shift();
		selections.pop();
		const stat = await fs.stat(path.join(soccer, final));
		const fyltime = stat.atime.getTime().toString(36);
		const resname = selections.join("") + "_" + fyltime;
		return {emojiname: resname, path: path.join(soccer, final), data: "papersoccer-" + JSON.stringify(selections)};
	}))
	
	return res;
}
(async () => {
	const cwd = process.cwd();
	if(!cwd.endsWith("/interpunctbot")) throw new Error("Wrong cwd!");
	
	const allEmojis: ProjectResult[] = [];
	// paper soccer is now locked in and will not be changed in the future.
	if(false as true) allEmojis.push(...await createPaperSoccer(cwd));
	
	const requiredServerCount = Math.ceil(allEmojis.length / 50);
	
	const token = await fs.readFile(path.join(cwd, "assets/token"), "utf-8");
	
	const client = new discord.Client();
	await client.login(token);
	
	console.log("Connected to discord!");
	if(client.guilds.cache.size < requiredServerCount)
		throw new Error("Not connected to enough servers. Need "+requiredServerCount);
	
	const progress = new Map(allEmojis.map(emji => [emji.emojiname, emji]));
	const emojisToDelete: discord.GuildEmoji[] = [];
	for(const guild of client.guilds.cache.array()) {
		await guild.fetch();
		console.log("Checking server ", guild.name);
		for(const emoji of guild.emojis.cache.array()) {
			if(progress.has(emoji.name)) {
				progress.delete(emoji.name);
			}else{
				emojisToDelete.push(emoji);
			}
		};
		console.log("Done with server ", guild.name);
	}
	
	console.log("Deleting "+emojisToDelete.length+" emojis.");
	for(const emoji of emojisToDelete) {
		process.stdout.write("- :"+emoji.name+":");
		await emoji.delete("No longer needed");
		console.log("\r× :"+emoji.name+":\x1b[K");
	}
	
	const remaining = [...progress.values()];

	for(const guild of client.guilds.cache.array()) {
		console.log("Uploading emojis to server ", guild.name);
		const putCount = 50 - guild.emojis.cache.size;
		for(let i = 0; i < putCount; i++) {
			const emoji = remaining.pop();
			if(!emoji) continue;
			
			process.stdout.write("+ :"+emoji.emojiname+":");
			await guild.emojis.create(emoji.path, emoji.emojiname);
			console.log("\r√ :"+emoji.emojiname+":\x1b[K");
			
		}
		console.log("Done with server ", guild.name);
	}
	if(remaining.length > 0) throw new Error("Some emojis are left over");
	
	console.log("All emojis are synced");
	// now generate the id cache
	const emojidata = new Map(allEmojis.map(emji => [emji.emojiname, emji]));
	const resfile: {[data: string]: string} = {};
	for(const guild of client.guilds.cache.array()) {
		for(const emoji of guild.emojis.cache.array()) {
			const ted = emojidata.get(emoji.name);
			if(!ted) throw new Error("unexpected emoji :"+emoji.name+": on server "+guild.name);
			resfile[ted.data] = "<:v:"+emoji.id+">";
		}
	}
	await fs.writeFile(path.join(cwd, "config/emojis.json"), JSON.stringify(resfile));
	console.log("Done!");
	process.exit(0); // I must have a hanging resource or something idk
})().catch(e => {throw e;});


// ["bg"],
// ["", "line_bottom"],
// ["", "line_left"],
// ["", "line_right"],
// ["", "line_top"],
// ["", "line_diagonbr"],
// ["", "line_diagonur"],
// ["", "balldl", "balldr", "ballul", "ballur"],