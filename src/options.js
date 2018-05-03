const client = require("../bot");

function about(otherData, cb) {
  return (data, odInfo) => {
    if(odInfo) {
      let finalData = {};
      for(let key in odInfo) {
        finalData[key] = otherData[key].split`%s`.join(odInfo[key]) || "No information available";
      }
      return finalData;
    }
    return cb(data);
  };
}

//module.exports.deleteOriginal = time => data => data.msg.delete(time || 0) || true; // This should not be an option. Options can be checked when running the help command
module.exports.pm = yn => about({"preCheck": `This command can${!yn ? "not" : " only"} be used in PMs`}, data => data.pm == yn); //eslint-disable-line eqeqeq
// one for if has permission
// module.exports.perm = perm => data => data.msg.guild.member().hasPermission(perm);
module.exports.myPerm = perm => about({"preCheck": `I need access to the ${perm} permission to enable this command`}, data => data.msg.guild.member(client.user).hasPermission(perm));
module.exports.perm = perm => about({"preCheck": `You need to have access to the ${perm} permission to use this command`}, data => data.msg.member.hasPermission(perm));
// perm will have a few permissions. Once a role is set, they will use the role instead ofr
// Failed to get --- because  ---- is not set // o.setting(quotesPastebin)
