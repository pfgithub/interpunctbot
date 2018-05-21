/*global describe it*/

const assert = require("assert");

const Usage = require("../src/Usage");
let usage = new Usage({});
usage.add("settings", new Usage({
  "description": "Adjusts settings",
  "requirements": []
}));
usage.path("settings").add("rankmoji", new Usage({
  "description": "Adjusts Rankmoji",
  "requirements": [],
  "callback": (data) => {
    data("MYrankmoji");
  }
}));
usage.path("settings rankmoji").add("add", new Usage({
  "description": "Adds a rankmoji",
  "requirements": [],
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
    assert.equal(usage.parse(o => c+="x", "settings"), "TODO put usage here");
    assert.equal(usage.parse(o => assert.equal(o, "MYrankmoji", c+="a"), "settings rankmoji"), undefined);
    assert.equal(usage.parse(o => assert.equal(o, "rankID, my moji", c+="b"), "settings rankmoji add rankID   my moji "), undefined);
    assert.equal(usage.parse(o => assert.equal(o, "moji to remove", c+="c"), "settings rankmoji remove   moji to remove   "), undefined);
    setTimeout(a => {
      assert.equal(c, "abc");
      done();
    }, 10);
  });
});

/*
settings rankmoji add <rank> <moji>
settings rankmoji remove
 */
