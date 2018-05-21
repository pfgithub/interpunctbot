class Usage {
  constructor({description = "No description provided", requirements = [], usage = [], callback}) {
    this.paths = {};
    this.callback = callback;
    this.description = description;
    this.requirements = requirements;
    console.log(requirements, this.requirements);
    usage.map(usagePart => {
      if(Array.isArray(usagePart)) usagePart = usagePart.join`|`;
      return `<${usagePart}>`;
    });
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
      return this.paths[nextPath].parse(data, cmd);
    } // TODO else if loop over regex options
    if(!this.callback) return "TODO put usage here";
    this.callback(data, ...command.split` `);

    return;
  }
  path(path) {
    path = path.split` `;
    let nextPath = path.shift();
    if(!nextPath) return this;
    nextPath = this.paths[nextPath];
    if(!nextPath) throw new Error("Path not found");
    return nextPath.path(path.join` `);
  }
}

module.exports = Usage;
