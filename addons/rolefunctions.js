const fs = require('fs');
var addons = require('../addons.js');
let roleids = null;
var client = null;
exports.functions = new Object();
exports.functions.getRoleIds = (msg) => {
  try{
    fs.statSync('./.data/');
    try{
      var data = fs.readFileSync('./.data/roleids.json');
      roleids = JSON.parse(data);
      return roleids;
    }
    catch(err){
      if(err.code == "ENOENT") {
        // file does not exist
        try{
          fs.writeFileSync('./.data/roleids.json', "[]", "utf8");
        }
        catch(err){
          console.log('Error saving admin role to file: ' + err);
        }
        exports.functions.getRoleIds();
      } else {
          console.log('Error checking if ./.data/ exists: ', err.code);
      }
    }
  }
  catch(err){
    if(err.code == "ENOENT") {
      // file does not exist
      fs.mkdirSync('./.data/');
      console.log(".data doesn't exist, creating..");
      exports.functions.getRoleIds();
    } else {
        console.log('Error checking if ./.data/ exists: ', err.code);
    }
  }
}
exports.functions.hasRole = (msg, tokens) => {
  exports.functions.getRoleIds(msg);
  for (var i = 0; i < roleids.length; i++) {
    if (roleids[i].guildid == msg.guild.id) {
      if(msg.member.roles.has(roleids[i].roleid)){
        return true;
      }
    }
  }
  msg.channel.send("Couldn't execute command, because you don't have the Bot Controller role. If the role has been removed, use the command " + tokens.prefix + "chooserole to choose a Bot Controller role.");
  return false;
}
exports.functions.initBot = (cli) => {
  client = cli;
  exports.functions.setGame();
  initClientEvents();
  exports.functions.checkRoleIds();
  console.log('Discord ready!');
}
exports.functions.checkRoleIds = () => {
  exports.functions.getRoleIds();
  var tried = 0;
  setTimeout(function next(){
  tried = tried + 1;
  if ((roleids == undefined || roleids == null || roleids == 0 || roleids == "") && !JSON.stringify(roleids) == "[]"){
    if (tried > 30){
      console.error("Couldn't get roleids from file.");
      return;
    }
    setTimeout(next, 0010);
    return;
  }
  var guilds = client.guilds;
  for (var i = 0; i < roleids.length; i++) {
      if (!guilds.findKey("id", roleids[i].guildid)) {
        console.log("Removed guild " + roleids[i].guildid + " from roleids file.");
        roleids.splice(i, 1);
        fs.writeFile("./.data/roleids.json", JSON.stringify(roleids, null, '\t'), "utf8", (err) => {
            if (err) console.log('Error saving admin role to file: ' + err);
        });
      }
    }
}, 0030);
}
exports.functions.setGame = () => {
  client.user.setPresence({activity: {name: client.guilds.size + " guilds", type: 'WATCHING'}});
}
function initClientEvents () {
  client.on('guildDelete', function(guild) {
      exports.functions.setGame();
      console.log('Removed from guild: ' + guild.name);
      for (var i = 0; i < roleids.length; i++) {
          if (roleids[i].guildid == guild.id) {
              roleids.splice(i, 1);
              fs.writeFile("./.data/roleids.json", JSON.stringify(roleids, null, '\t'), "utf8", (err) => {
                  if (err) console.log('Error saving admin role to file: ' + err);
              });
          }
      }
  });
  client.on('guildCreate', function(guild) {
      console.log('Bot added to guild ' + guild.name);
      exports.functions.setGame();
  });
  client.on('roleDelete', function(role) {
    len = roleids.length;
    for (var i = 0; i < len; i++) {
        if (roleids[i].roleid === role.id) {
          console.log("Role removed in guild: " + role.guild.name);
          roleids.splice(i, 1);
          fs.writeFile("./.data/roleids.json", JSON.stringify(roleids, null, '\t'), "utf8", (err) => {
              if (err) console.log('Error saving admin role to file: ' + err);
          });
          return;
        }
    }
  });
}
exports.commands = {
  chooserole: {
    usage: '',
    description: "Chooses a Bot Controller role.",
    aliases: [],
    command: (msg, tokens) => {
    for (var i = 0; i < roleids.length; i++) {
      if (roleids[i].guildid == msg.guild.id) {
        if(msg.guild.roles.get(roleids[i].roleid)){
          if(addons.functions.hasRole(msg, tokens) === false){
            return;
          }
        }
      }
    }
    var tosend = [];
    var roleArray = msg.guild.roles.array();
    roleArray.forEach((role, i) => {
        if(role.name !== "@everyone"){
        tosend.push(`${i}. ${role.name} ID: ${role.id}`);
      }
    });
    //msg.channel.send(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** ${songs} queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
    msg.channel.send("Choose a role that will be used as the Bot Controller role with " + tokens.prefix + "select <number>, or cancel with " + tokens.prefix + "cancel: \n" + tosend.join("\n"));
    var collector = msg.channel.createMessageCollector(m => m);
    var timeout;
    setAutoCancel();
    function setAutoCancel(){
      timeout = setTimeout(function(){
        msg.channel.send("Canceled.");
        if(typeof collector !== 'undefined'){
          if(collector.ended === false){
          collector.stop();
          }
        }
        if(typeof collector2 !== 'undefined'){
          if(collector2.ended === false){
          collector2.stop();
          }
        }
      }, 20000)
    }

    collector.on('collect', m => {
    if(m.author.id !== msg.author.id) return;
    var cmd = tokens.prefix + "select";
    var canc = tokens.prefix + "cancel";
    if(m.content === canc){
      msg.channel.send("Canceled.");
      collector.stop();
      clearTimeout(timeout);
    }
    if(m.content.startsWith(cmd)){
      var num = m.content.split(' ')[1];
      if (!isNumeric(num) || !num || num < 1 || num > tosend.length){
        msg.channel.send("Argument 2: number invalid.");
        return;
      }
      msg.channel.send("Are you sure you want to set " + roleArray[num].name + " with ID " + roleArray[num].id + " as the Bot Controller role? Reply yes/no.");
      let collector2 = m.channel.createMessageCollector(m => m);
      collector.stop();
      collector2.on('collect', mesg => {
        if(mesg.content === canc){
          collector2.stop();
          clearTimeout(timeout);
        }
        if(mesg.content === "yes"){
            for (var i = 0; i < roleids.length; i++) {
                if (roleids[i].guildid === mesg.guild.id) {
                  roleids.splice(i, 1);
                  fs.writeFile("./.data/roleids.json", JSON.stringify(roleids, null, '\t'), "utf8", (err) => {
                      if (err) console.log('Error saving admin role to file: ' + err);
                    });
                }
            }
            writeRolesToFile(roleArray[num]);
            msg.channel.send("Bot Controller role set.");
            console.log("Wrote roleid for guild " + roleArray[num].guild.name + ", " + roleArray[num].name + " to file.");
            clearTimeout(timeout);
            collector.stop();
            if(collector2){
              if(collector2.ended === false){
              collector2.stop();
              }
            }
        }else if(mesg.content === "no"){
          collector2.stop();
          clearTimeout(timeout);
          commands.chooserole(msg);
        }
      })

    }
  })
  }
  }
}
function writeRolesToFile(role) {
  if (role){
    roleids = addons.functions.getRoleIds();
    setTimeout(function(){
      roleids.push({
      name: role.guild.name,
      guildid: role.guild.id,
      roleid: role.id
    });
    fs.writeFile("./.data/roleids.json", JSON.stringify(roleids, null, '\t'), "utf8", (err) => {
    if (err) console.log('Error saving admin role to file: ' + err);
});
},0200);
}
}
function isNumeric(n) {
return !isNaN(parseFloat(n)) && isFinite(n);
}
