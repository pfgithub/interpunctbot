// we could show a panel editor
// that could be cool
// start with just text for now though

// * goal is to share code between a text command and slash command but
//   the bot should optimize for slash commands first

// ip!command add oneword longmessage…
// ip!command add `backticked multiple words` longmessage…
// or even /command add → a modal that lets you input the command name and message

// the trouble is that thing where args need to determine their end position
// and we also don't want to break existing code

// we might be able to use the old parser stuff directly maybe