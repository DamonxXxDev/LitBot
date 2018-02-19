exports.commands = new Object();
var tosend;
exports.commands.help = {
    usage: "",
    description: "Shows this help text.",
    command: (msg, tokens) => {
      if(tosend == undefined) {
        var commandfiles = require('../addons.js').commands;
        var keys = Object.keys(commandfiles);
        var names = Object.getOwnPropertyNames(commandfiles);
        names.splice(0,5);
        tosend = ['```xl'];
        for (var i = 0, leng = keys.length; i < leng; i++) {
          var obj = commandfiles[names[i]];
          if(obj.isAlias == true) continue;
          var aliases;
          if(obj.hasOwnProperty("aliases")) {
            aliases = obj.aliases.join(', ');
            aliases = ", " + aliases + " ";
          }else{
            aliases = " ";
          }
          tosend.push(tokens.prefix + names[i] + aliases + obj.usage +  ': "' + obj.description + '"');
        }
        tosend.push('```');
      }
      //TODO command categories, ++commands
      /*let tosend = ['```xl', tokens.prefix + 'info: "Shows uptime, bot creator, invite link and the github repository."', tokens.prefix + 'chooserole: "Choose a Bot Controller role. If a Bot Controller role is set, requires the Bot Controller role."', tokens.prefix + 'fortnite stats <psn/xbl/pc> <username> <all/solo/duo/squad>: "Get fortnite stats of player in chosen gamemode."', tokens.prefix + 'weather <city>: "Get weather in city."', tokens.prefix + 'steam sale: "Shows the next Steam sale."' , tokens.prefix + 'join: "Join voice channel of message sender."', tokens.prefix + 'queue: "Shows the current queue, up to 15 songs shown."', tokens.prefix + 'play: "Play a song. Enter search terms or link after this command. "', tokens.prefix + 'autoplaylist: "Show songs in autoplaylist. "', 'Bot Controller commands:', tokens.prefix + 'autoplaylistadd, apladd <song>: "Add a song to the autoplaylist. Enter search terms or youtube url after this command. "',tokens.prefix + 'autoplaylistremove, aplremove <url>: "Remove a song from autoplaylist. Enter URL after this command. You can see the URLs of the songs in the autoplaylist with ' + tokens.prefix + 'autoplaylist."', tokens.prefix + 'addcommand <command> <response>: "Adds a custom command."', tokens.prefix + 'removecommand <command>: "Removes a custom command."', tokens.prefix + 'shuffle: "Shuffles queue."', tokens.prefix + 'loopqueue: "Puts queue on loop."', 'the following commands only function while the play command is running:'.toUpperCase(), tokens.prefix + 'pause: "Pauses the music."', tokens.prefix + 'resume: "Resumes the music."', tokens.prefix + 'skip: "Skips the playing song."', tokens.prefix + 'time: "Shows the playtime of the song."', 'volume+(+++): "Increases volume by 2%."', 'volume-(---): "Decreases volume by 2%."', '```'];*/
      msg.channel.send(tosend.join('\n'), {split: {char: '\n', prepend: '\`\`\`', append: '\`\`\`'}});
    }
}
