// a bot that manages assets

// 1: setup - generate png files (cached, result name should include last update timestamp)
// 2: determine required server count
// 3: connect to discord. check if connected to required server count
// 4: update the mapping of emoji name -> emoji id. remove unused emojis. add new emojis.

import {promises as fs} from "fs";
import * as cp from "child_process";
import * as path from "path";


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

// basically a makefile but not a makefile
// or it could be a makefile. wouldn't be too difficult
// just generate a makefile and run `make -j4`
class Depender {
	dependencies: {[key: string]: {reqs: string[]; exec: () => void}} = {};
	depend(inv: string[], out: string[], exec: () => void) {
		if(out.length !== 1) throw new Error("only supports 1 out because I forgot how to program");
		const of = out[0];
		if(this.dependencies[of]) throw new Error("two recipes produce the same file `"+of+"`");
		this.dependencies[of] = {reqs: inv, exec};
	}
	async produceOne(cwd: string, file: string, producedList: Map<string, boolean>) {
		if(producedList.get(file) === false) throw new Error("attempting to produce something already being produced");
		if(producedList.get(file)) return; // nothing to do;
		producedList.set(file, false);
		console.log(file);
		if(!this.dependencies[file]){
			// check if the file exists
			const stat = await fs.stat(path.join(cwd, file));
			console.log("atime", stat.atimeMs, file);
		}else{
			for(const fyl of this.dependencies[file].reqs) {
				await this.produceOne(cwd, fyl, producedList);
			}
			this.dependencies[file].exec();
		}
		producedList.set(file, true);
		
	}
	async produce(cwd: string, files: string[]) {
		// const filetimes: {[key: string]: number} = {};
		const producedList = new Map<string, boolean>();
		for(const execfyl of files) {
			await this.produceOne(cwd, execfyl, producedList);
		}
	}
}

(async () => {
	const cwd = process.cwd();
	if(!cwd.endsWith("/interpunctbot")) throw new Error("Wrong cwd!");
	
	const soccer = path.join(cwd, "assets/paper soccer");
	
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

	depend(["ball.png"], ["inter/balldr.png"], () => exec(soccer, "convert", ["ball.png", "-crop", "32x32+0+0", "inter/balldr.png"]));
	depend(["ball.png"], ["inter/balldl.png"], () => exec(soccer, "convert", ["ball.png", "-crop", "32x32+32+0", "inter/balldl.png"]));
	depend(["ball.png"], ["inter/ballur.png"], () => exec(soccer, "convert", ["ball.png", "-crop", "32x32+0+32", "inter/ballur.png"]));
	depend(["ball.png"], ["inter/ballul.png"], () => exec(soccer, "convert", ["ball.png", "-crop", "32x32+32+32", "inter/ballul.png"]));

	depend(["lines.png"], ["inter/linebottom.png"], () => exec(soccer, "convert", ["lines.png", "-crop", "32x16+0+0", "-background", "none", "-gravity", "north", "-splice", "0x16", "inter/linebottom.png"]));
	depend(["lines.png"], ["inter/linetop.png"], () => exec(soccer, "convert", ["lines.png", "-crop", "32x16+0+16", "-background", "none", "-gravity", "south", "-splice", "0x16", "inter/linetop.png"]));

	depend(["lines.png"], ["inter/lineright.png"], () => exec(soccer, "convert", ["lines.png", "-crop", "16x32+32+0", "-background", "none", "-gravity", "west", "-splice", "16x0", "inter/lineright.png"]));
	depend(["lines.png"], ["inter/lineleft.png"], () => exec(soccer, "convert", ["lines.png", "-crop", "16x32+48+0", "-background", "none", "-gravity", "east", "-splice", "16x0", "inter/lineleft.png"]));

	depend(["lines.png"], ["inter/linediagonur.png"], () => exec(soccer, "convert", ["lines.png", "-crop", "32x32+0+32", "inter/linediagonur.png"]));
	depend(["lines.png"], ["inter/linediagonbr.png"], () => exec(soccer, "convert", ["lines.png", "-crop", "32x32+32+32", "inter/linediagonbr.png"]));
	
	depend(["bg.png"], ["inter/bg.png"], () => exec(soccer, "cp", ["bg.png", "inter/bg.png"]));
	
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
        const layers = mode.map((pce, i) => choices[i][pce]).filter(pce => pce);
		const pnglayers = layers.map(layer => "inter/"+layer+".png");
        const args: string[] = [];
        pnglayers.forEach((layer, i) => {
            args.push(layer); if(i !== 0) args.push("-composite");
        });
		const resfyl = "res/" + layers.join("_") + ".png";
        args.push(resfyl);
		depend(pnglayers, [resfyl], () => exec(soccer, "convert", args));
		finals.push(resfyl);
    } while(advanceMode(mode, choices));
	
	await depender.produce(soccer, finals);
	console.log("Done!");
	
	// and then once done, return
	// {emojiname: string, path: string}
	// emojiname should include a timestamp
})().catch(e => {throw e;});


// ["bg"],
// ["", "line_bottom"],
// ["", "line_left"],
// ["", "line_right"],
// ["", "line_top"],
// ["", "line_diagonbr"],
// ["", "line_diagonur"],
// ["", "balldl", "balldr", "ballul", "ballur"],