const Usage = require("../src/Usage");
let usage = new Usage({"description": "", "requirements": ""});
usage.add("settings", new Usage({
  "description": "Adjusts settings",
  "requirements": []
}));
usage.path("settings").add("rankmoji", new Usage({
  "description": "Adjusts Rankmoji",
  "requirements": [],
  "callback": (data) => {
    data.msg.reply(data.rankmoji);
  }
}));
usage.path("settings rankmoji").add("add", new Usage({
  "description": "Adds a rankmoji",
  "requirements": [],
  "callback": (data) => {
    data.msg.reply(data.rankmoji);
  }
}));

/*
settings rankmoji add <rank> <moji>
settings rankmoji remove
 */
