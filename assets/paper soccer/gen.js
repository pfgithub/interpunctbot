const choices = [
    ["bg"],
    ["", "line_bottom"],
    ["", "line_left"],
    ["", "line_right"],
    ["", "line_top"],
    ["", "line_diagonbr"],
    ["", "line_diagonur"],
    ["", "balldl", "balldr", "ballul", "ballur"],
];

function advanceMode(mode) {
    for(let i = 0; i <= mode.length; i++) {
        if(i === mode.length) return false;
        let selitm = choices[i];
        // advance mode[i]
        mode[i] += 1;
        if(mode[i] >= selitm.length) {
            mode[i] = 0;
        } else break;
    }
    return true;
}

const cp = require("child_process");

(async () => {
    const res = cp.spawnSync("pwd", []).stdout.toString();
    if(res.trim() !== __dirname) {throw new Error("wrong cwd");}

    cp.spawnSync("rm", ["-rf", "inter"]);
    cp.spawnSync("rm", ["-rf", "res"]);

    cp.spawnSync("mkdir", ["-p", "inter"]);
    cp.spawnSync("mkdir", ["-p", "res"]);

    cp.spawnSync("convert", ["ball.png", "-crop", "32x32+0+0", "inter/balldr.png"]);
    cp.spawnSync("convert", ["ball.png", "-crop", "32x32+32+0", "inter/balldl.png"]);
    cp.spawnSync("convert", ["ball.png", "-crop", "32x32+0+32", "inter/ballur.png"]);
    cp.spawnSync("convert", ["ball.png", "-crop", "32x32+32+32", "inter/ballul.png"]);

    cp.spawnSync("convert", ["lines.png", "-crop", "32x16+0+0", "-background", "none", "-gravity", "north", "-splice", "0x16", "inter/line_bottom.png"]);
    cp.spawnSync("convert", ["lines.png", "-crop", "32x16+0+16", "-background", "none", "-gravity", "south", "-splice", "0x16", "inter/line_top.png"]);

    cp.spawnSync("convert", ["lines.png", "-crop", "16x32+32+0", "-background", "none", "-gravity", "west", "-splice", "16x0", "inter/line_right.png"]);
    cp.spawnSync("convert", ["lines.png", "-crop", "16x32+48+0", "-background", "none", "-gravity", "east", "-splice", "16x0", "inter/line_left.png"]);

    cp.spawnSync("convert", ["lines.png", "-crop", "32x32+0+32", "inter/line_diagonur.png"]);
    cp.spawnSync("convert", ["lines.png", "-crop", "32x32+32+32", "inter/line_diagonbr.png"]);

    cp.spawnSync("cp", ["bg.png", "inter/bg.png"]);

    let mode = new Array(choices.length).fill(0);
    let i = 0;
    do {
        const foldernum = Math.floor(i / 50);
        const fldrnme = "res/⚽"+(foldernum + 1);

        cp.spawnSync("mkdir", ["-p", fldrnme]);

        const layers = mode.map((pce, i) => choices[i][pce]).filter(pce => pce);
        const resarr = [];
        layers.forEach((layer, i) => {
            resarr.push("inter/"+layer+".png"); if(i !== 0) resarr.push("-composite");
        });
        resarr.push(fldrnme + "/" + layers.join("_") + ".png");
        console.log("convert " + resarr.join(" "));
        const res = cp.spawnSync("convert", resarr);
        //console.log(res.stderr.toString());
        i += 1;
    } while(advanceMode(mode))
})()
