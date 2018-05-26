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
usage.depricate("rankmojiSettings", "settings rankmoji");

describe("Usage", () => {
  it("should give the reason when there is one", () => {
    assert.equal(usage.parse("hi", "settings"), "Info needs to be a function to use this command");
  });
  it("should give a no reason message when there is no reason", () => {
    assert.equal(usage.parse("hi", "reqtest"), "This command could not be run. No reason was specified.");
  });
  it("should show usage when failing", () => {
    console.log(usage.parse(_=>_, "settings"));
    assert.equal(usage.parse(_=>_, "settings"), `settings rankmoji${" "}
settings rankmoji add ...
settings rankmoji remove ...`);
  });
  it("should call the function", () => {
    assert.equal(usage.parse(o => assert.equal(o, "MYrankmoji"), "settings rankmoji"), undefined);
  });
  it("should call the function with arguments", () => {
    assert.equal(usage.parse(o => assert.equal(o, "rankID, my moji"), "settings rankmoji add rankID   my moji "), undefined);
  });
  it("should", () => {
    assert.equal(usage.parse(o => assert.equal(o, "moji to remove"), "settings rankmoji remove   moji to remove   "), undefined);
  });
  it("should", () => {
    assert.equal(usage.parse("hi", "rankmojiSettings"), "This command has been renamed to `settings rankmoji`. Please use that instead.");
  });
  it("should error when the path is not found", () => {
    assert.throws(_ => usage.path("settings notfound"));
  });
});

/*
settings rankmoji add <rank> <moji>
settings rankmoji remove
 */
