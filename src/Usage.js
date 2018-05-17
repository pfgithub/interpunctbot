class Usage {
  constructor() {
    this.paths = {};
    this.gets = [];
  }
  add({path, usage}) {
    if(usage) this.paths[path] = usage;
    else return this.paths[path] = new Usage;
  }
}

module.exports = Usage;
