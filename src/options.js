const client = require("../bot");

function about(cb, {failureMsg}) {
  return (data, {failure}) => failure ? failureMsg : cb(data);
}

//module.exports.deleteOriginal = time => data => data.msg.delete(time || 0) || true; // This should not be an option. Options can be checked when running the help command
module.exports.pm = yn => data => data.pm == yn; //eslint-disable-line eqeqeq
// one for if has permission
// module.exports.perm = perm => data => data.msg.guild.member().hasPermission(perm);
module.exports.myPerm = perm => data => data.msg.guild.member(client.user).hasPermission(perm);
module.exports.perm = perm => data => data.msg.member.hasPermission(perm);
// perm will have a few permissions. Once a role is set, they will use the role instead ofr
// Failed to get --- because  ---- is not set // o.setting(quotesPastebin)
