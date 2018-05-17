const Usage = require("../src/Usage");
let usage = new Usage();
usage.add({"path": "add"})
  .get({"name": "rank", "match": /([^ ]+) {0,1}/, "prepare": (...matches) => matches[1]})
  .get({"name": "moji", "match": /.+/, "prepare": (...matches) => matches[0].trim()});
usage.add({"path": "remove"})
  .get({"name": "rankormoji", "match": /.+/, "prepare": (...matches) => matches[0].trim()});


/*
settings rankmoji add <rank> <moji>
settings rankmoji remove
 */
