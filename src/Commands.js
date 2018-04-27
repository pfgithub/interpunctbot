class Commands {
  constructor() { // TODO store commands in an object and have regex seperate for after commands
    this._commands = [];
  }
  registerCommand(cmd, requirements, callback) {
    this.register(cmd, requirements, [], callback); // warning depricated
  }
  register(cmd, requirements, options, callback) {
    this._commands.push({"cmd": cmd, "requirements": requirements, "options": options || [], "callback": callback});
  }
  handleCommand(...args) {
    this.handle(...args); // warning depricated
  }
  handle(fullcmd, data) {
    let args = fullcmd.split(" ");
    let command = args[0];
    args.shift();
    return this._commands.some(cmd => {
      let cbargs;
      if(cmd.cmd instanceof RegExp) {
        let match = fullcmd.match(cmd.cmd);
        if(match) {
          cbargs = match;
        }
      }else if(command === cmd.cmd) {
        cbargs = args;
      }
      if(cbargs == undefined) return; //eslint-disable-line eqeqeq

      // if(data.requirements.every(option => option(data))) {
      if(cmd.requirements.every(option => option(data)))
        try{
          return cmd.callback(data, ...args) || true;
        }catch(e) {
          console.log(e);
          return data.msg.reply("An internal error occured while attempting to run this command");
        }
      return data.msg.reply("This command could not be run because some pre-checks failed. More description is coming in a future update") || true;
      // }
    });
  }
  registerCommands(...commands) {
    commands.forEach(command => this._commands.push(...command._commands));
  }
}
// Commands.prototype.
// let mirror(a,b,c)=>a.prototype[c]=()=>this[b];

module.exports = Commands;
