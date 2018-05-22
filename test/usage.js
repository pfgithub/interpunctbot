/*global describe it*/

const assert = require("assert");

const Usage = require("../src/Usage");
let usage = new Usage({});
usage.add("settings", new Usage({
  "description": "Adjusts settings",
  "requirements": [(o, g) => g ? {"preCheck": "Info needs to be a function to use this command"} : typeof o === "function"]
}));
usage.add("reqtest", new Usage({
  "description": "Adjusts settings",
  "requirements": [o => typeof o === "function"]
}));
usage.path("settings").add("rankmoji", new Usage({
  "description": "Adjusts Rankmoji",
  "callback": (data) => {
    data("MYrankmoji");
  }
}));
usage.path("settings rankmoji").add("add", new Usage({
  "descr!~iption": "Adds a rankmoji",
  "usage": ["rank", "moji"],
  "callback": (data, rank, ...moji) => {
    data(`${rank  }, ${ moji.join` `.trim()}`);
  }
}));
usage.path("settings rankmoji").add("remove", new Usage({
  "description": "Removes a rankmoji",
  "usage": [["rank", "moji"]],
  "requirements": [],
  "callback": (data, ...rankOrMoji) => {
    data(rankOrMoji.join` `.trim());
  }
}));

describe("Usage", () => {
  it("should parse commands", (done) => {
    let c = "";
    assert.equal(usage.parse("hi", "settings"), "Info needs to be a function to use this command");
    assert.equal(usage.parse("hi", "reqtest"), "This command could not be run. No reason was specified.");
    assert.equal(usage.parse(o => c+="x", "settings"), "TODO put usage here");
    assert.equal(usage.parse(o => assert.equal(o, "MYrankmoji", c+="a"), "settings rankmoji"), undefined);
    assert.equal(usage.parse(o => assert.equal(o, "rankID, my moji", c+="b"), "settings rankmoji add rankID   my moji "), undefined);
    assert.equal(usage.parse(o => assert.equal(o, "moji to remove", c+="c"), "settings rankmoji remove   moji to remove   "), undefined);
    setTimeout(a => {
      assert.equal(c, "abc");
      done();
    }, 10);
  });
  it("should error when the path is not found", () => {
    assert.throws(_ => usage.path("settings notfound"));
  });
});

/*
settings rankmoji add <rank> <moji>
settings rankmoji remove
 */
