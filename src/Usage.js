class Usage {
  constructor({description, requirements, callback}) {
    this.paths = {};
    this.callback = callback;
    this.description = description || "No description provided";
    this.requirements = requirements || []; // TODO add something here so when displaying usage it says like settings rankmoji add <rank id> <moji>
  }
  add(path, usage) {
    this.paths[path] = usage;
  }
  parse(data, command) { // TODO support requirements // TODO return the thing to say so this can be unit tested
    let failedRequirement = this.requirements.find(requirement => requirement(data));
    if(failedRequirement)
      return failedRequirement(data, {"preCheck": ""}).preCheck || "This command could not be run. No reason was specified.";
    let cmd = command.split` `;
    let nextPath = cmd.shift();
    if(this.paths[nextPath]) {
      cmd = cmd.join` `;
      this.paths[nextPath].parse(data, cmd);
    }else{ // TODO else if loop over regex options
      if(!this.callback) return "TODO put usage here";
      this.callback(...command.split` `);
    }
    return;
  }
  path(path) {
    path = path.split` `;
    let nextPath = path.shift();
    if(!nextPath) return this;
    return nextPath.path(path.join` `);
  }
}

module.exports = Usage;
