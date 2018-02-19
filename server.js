const { Client } = require('discord.js');
const tokens = require('./.data/tokens.json');
const client = new Client();
var addons = require('./addons.js');
var commandfiles = addons.commands;
//TODO fix cache downloading video, fix audioonly downloading video

client.on('ready', () => {
    roleids = addons.functions.getRoleIds();
    addons.functions.initBot(client);
});
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function isNumeric(n) {
return !isNaN(parseFloat(n)) && isFinite(n);
}
client.on('message', async msg => {
    if (msg.author.id === client.user.id) return;
    if (msg.channel.type == "dm" || msg.channel.type == "group") {
      msg.channel.send("DMs or groups are not yet supported.");
      return;
    }
    try {
      addons.functions.checkCmd(msg);
    }
    catch(err){}
        if (!msg.content.startsWith(tokens.prefix)) return;
        if (commandfiles.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
        commandfiles[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]].command(msg, tokens, commandfiles, client);
        return;
        }
        Object.entries(commandfiles).forEach(
          ([key, value]) => {
            if(commandfiles[key].hasOwnProperty("aliases")) {
            for (i = 0; i < commandfiles[key].aliases.length; i++) {
              if (commandfiles[key].aliases[i] == msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]) {
                commandfiles[key].command(msg, tokens, commandfiles, client);
                return;
              }
            }
          }
          }
        );
        //if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});

client.login(tokens.d_token).catch(console.error);
process.on('unhandledRejection', err => console.error(`Uncaught Promise Error: \n${err.stack}`));
