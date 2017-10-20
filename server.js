const { Client } = require('discord.js');
var yt = require('ytdl-core');
var lodash = require('lodash');
var urlchk = require('valid-url');
const tokens = require('./tokens.json');
const client = new Client();
var search = require('youtube-search');
var opts = {
  maxResults: 5,
  key: tokens.yt_api_key
};
let queue = {};
let customcmds = {};
let roleids = [];
let canPlay = {};
let nowPlaying = [];
const fs = require('fs');

const commands = {
	'play': (msg) => {
    if (!canPlay.hasOwnProperty(msg.channel.id)) canPlay[msg.channel.id] = {}, canPlay[msg.channel.id].canPlay = true, canPlay[msg.channel.id].id = 0;
    if (canPlay[msg.channel.id].canPlay == false && !msg.author.id == canPlay[msg.channel.id].id) return msg.channel.send('Someone is choosing a song to play on this channel. Please wait 20 seconds and try again.');
    if (canPlay[msg.channel.id].canPlay == false) return;
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
		let url = msg.content.split(' ')[1];
		if(urlchk.isWebUri(url)){
		if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, search term, or id after ${tokens.prefix}play`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.send('Invalid YouTube Link: ' + err);
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username, info: info, avatarURL: msg.author.avatarURL});
			if (queue[msg.guild.id].playing == true) {
        var minutes = Math.floor(info.length_seconds / 60);
        var seconds = info.length_seconds - minutes * 60;
        var finalTime = minutes + ':' + seconds;
        var thumbUrl = 'https://img.youtube.com/vi/' + info.video_id + '/mqdefault.jpg';
        m.channel.send({
          "embed": {
            "description": "**Added song to queue: [" + info.title + "](" + url + ")**",
            "color": 123433,
            "thumbnail": {
              "url": thumbUrl
            },
            "author": {
              "name": msg.author.username,
              "icon_url": msg.author.avatarURL
            },
            "fields": [
              {
                "name": "Channel",
                "value": info.author.name,
                "inline": true
              },
              {
                "name": "Duration",
                "value": finalTime,
                "inline": true
              },
              {
                "name": "Position in queue",
                "value": queue[msg.guild.id].length,
                "inline": true
              }
            ]
          }
        }
      )
			} else {
			let dispatcher;
			queue[msg.guild.id].playing = true;
			play(queue[msg.guild.id].songs.shift());
			}
		});
	}else{
  function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
  }
  var parts = msg.content.split(' ');
  parts.shift();
	var searchTerms = parts.join(' ');
	search(searchTerms, opts, function(err,results){
	if(err) return console.log('Error searching youtube: ' + err);
	//console.dir(results);
  var tosend = ['**Select a song with the `' + tokens.prefix + 'play (song)` command, or cancel using the `' + tokens.prefix + 'cancel` command (Automatically cancels after 20 seconds.): **'];
  for (i = 0; i < results.length; i++) {
    var lineNumber = i + 1;
    tosend.push(lineNumber + ': ' + results[i].title);
  }
  msg.channel.send(tosend.join("\n"));
  let collector = msg.channel.createCollector(m => m);
  var timeout = setTimeout(function() {msg.channel.send('Canceled playing song.'); collector.stop(); }, 20000);
  canPlay[msg.channel.id].canPlay = false;
  canPlay[msg.channel.id].id = msg.author.id;
  collector.on('collect', m => {
    if(!m.author.id == msg.author.id) return;
    if(m.content.startsWith(tokens.prefix + 'play ')) {
    var parts = m.content.split(' ');
    parts.shift();
  	var number = parts.join(' ');
    if(!isNumeric(number)) return;
    if(!number < 6 && !number > 0) return;
    var number = number - 1;
    var url = results[number].link;
    yt.getInfo(url, (err, info) => {
			if(err) { msg.channel.send('Error playing song: `' + err + '`'); collector.stop(); clearTimeout(timeout); return; }
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username, info: info, avatarURL: msg.author.avatarURL});
			if (queue[msg.guild.id].playing == true) {
      var minutes = Math.floor(info.length_seconds / 60);
      var seconds = info.length_seconds - minutes * 60;
      var finalTime = minutes + ':' + seconds;
      m.channel.send({
        "embed": {
          "description": "**Added song to queue: [" + info.title + "](" + url + ")**",
          "color": 123433,
          "thumbnail": {
            "url": results[number].thumbnails.high.url
          },
          "author": {
            "name": m.author.username,
            "icon_url": m.author.avatarURL
          },
          "fields": [
            {
              "name": "Channel",
              "value": results[number].channelTitle,
              "inline": true
            },
            {
              "name": "Duration",
              "value": finalTime,
              "inline": true
            },
            {
              "name": "Position in queue",
              "value": queue[m.guild.id].songs.length,
              "inline": true
            }
          ]
        }
      }
      );
      collector.stop();
      canPlay[msg.channel.id].canPlay = true;
      delete canPlay[msg.channel.id].id;
      clearTimeout(timeout);
			} else {
			let dispatcher;
			queue[msg.guild.id].playing = true;
			play(queue[msg.guild.id].songs.shift());
      collector.stop();
      canPlay[msg.channel.id].canPlay = true;
      delete canPlay[msg.channel.id].id;
      clearTimeout(timeout);
			}
		});
  } else {
    if(!m.content.startsWith(tokens.prefix + 'cancel')) return;
    collector.stop();
    m.channel.send('Canceled playing song.');
    canPlay[msg.channel.id].canPlay = true;
    delete canPlay[msg.channel.id].id;
    clearTimeout(timeout);
  }
  });
	});
	}
		//console.log(queue);
		function play(song) {
			if (song === undefined) return msg.channel.send('Queue is empty. Leaving from voice channel.').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : tokens.passes });
      var minutes = Math.floor(song.info.length_seconds / 60);
      var seconds = song.info.length_seconds - minutes * 60;
      var finalTime = minutes + ':' + seconds;
      msg.channel.send({
        "embed": {
          "description": "**Playing: [" + song.title + "](" + song.info.video_url + ")**",
          "color": 123433,
          "thumbnail": {
            "url": 'https://img.youtube.com/vi/' + song.info.video_id + '/mqdefault.jpg'
          },
          "author": {
            "name": song.requester,
            "icon_url": song.avatarURL
          },
          "fields": [
            {
              "name": "Channel",
              "value": song.info.author.name,
              "inline": true
            },
            {
              "name": "Duration",
              "value": finalTime,
              "inline": true
            }
          ]
        }
      });
      console.log(`Playing: ${song.title} as requested by: ${song.requester} in guild: ${msg.guild.name}`);
			let collector = msg.channel.createCollector(m => m);
			collector.on('collect', m => {
				if (m.content.startsWith(tokens.prefix + 'pause')) {
					msg.channel.send('Paused.').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(tokens.prefix + 'resume')){
					msg.channel.send('Resumed.').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(tokens.prefix + 'skip')){
          msg.channel.send({
            "embed": {
              "description": "**Skipped [" + song.title + "](" + song.info.video_url + ")**",
              "color": 123433,
              "thumbnail": {
                "url": 'https://img.youtube.com/vi/' + song.info.video_id + '/mqdefault.jpg'
              },
              "author": {
                "name": m.author.username,
                "icon_url": m.author.avatarURL
              },
              "fields": [
                {
                  "name": "Channel",
                  "value": song.info.author.name,
                  "inline": true
                }
              ]
            }
          }).then(() => {dispatcher.end();});
				} else if (m.content.startsWith(tokens.prefix + 'volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(tokens.prefix + 'volume-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(tokens.prefix + 'time')){
					msg.channel.send(`time: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`);
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.send('error: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		}
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t connect to your voice channel...');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id].length == 0) return msg.channel.send(`Add some songs to the queue first with ${tokens.prefix}play`);
		let tosend = [];
    var songs = songs;
    if (queue[msg.guild.id].length == 1) songs = song;
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.send(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** ${songs} queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'help': (msg) => {
		let tosend = ['```xl', tokens.prefix + 'join: "Join voice channel of message sender."', tokens.prefix + 'queue: "Shows the current queue, up to 15 songs shown."', tokens.prefix + 'play: "Play a song. Enter search terms or link after this command. "', 'Bot Controller commands:', tokens.prefix + 'addcommand: "Adds a custom command, example: ' + tokens.prefix + 'addcommand (command here) (response here)"' , tokens.prefix + 'removecommand: "Removes a custom command, example: ' + tokens.prefix + '(command)"',  'the following commands only function while the play command is running:'.toUpperCase(), tokens.prefix + 'pause: "Pauses the music."',	tokens.prefix + 'resume: "Resumes the music."', tokens.prefix + 'skip: "Skips the playing song."', tokens.prefix + 'time: "Shows the playtime of the song."',	'volume+(+++): "Increases volume by 2%."',	'volume-(---): "Decreases volume by 2%."',	'```'];
		msg.channel.send(tosend.join('\n'));
	},
	/*'reboot': (msg) => {
		for(var i = 0; i < roleids.length; i++) {
		if(roleids[i].guildid == msg.guild.id) {
		if (msg.member.roles.has(roleids[i].roleid)) process.exit(); //Requires a node module like Forever to work.
		}}
		//removed to stop anyone from rebooting the bot, if used as a public bot
	}, */
	'addcommand': (msg) => {
		for(var i = 0; i < roleids.length; i++) {
		if(roleids[i].guildid == msg.guild.id) {
		if (msg.member.roles.has(roleids[i].roleid)) {
		let args = msg.content.toLowerCase().split('"');
		var command = args[1];
		var response = args[3];
		msg.channel.send('Are you sure you want to add this command: **' + command + '** with response: **' + response + '**. Reply yes/no.');
		let collector = msg.channel.createCollector(m => m);
		collector.on('collect', m => {
		console.log(m.content + ' ' + m.author.id + ' ' + msg.author.id);
		if (m.content == 'yes' && m.author.id == msg.author.id) {
		console.log('Added command: **' + command + '** with response: **' + response + '** by: **' + msg.author.username + '#' + msg.author.discriminator + '** in guild: ' + msg.guild.name);
		customcmds[msg.guild.id].cmds.push({command: command, response: response, creator: msg.author.username + '#' + msg.author.discriminator});
		msg.channel.send('Added command: **' + args[1] + '** with response: **' + args[3] + '** by: **' + msg.author.username + '#' + msg.author.discriminator + '**');
		fs.writeFile( "./.data/cmds_" + msg.guild.id + '.json', JSON.stringify( customcmds[msg.guild.id].cmds ), "utf8", (err) => {
		if (err) console.log('Error saving command to file: ' + err);
	});
	collector.stop();
} else if (m.content == 'no' && m.author.id == msg.author.id) {
	msg.channel.send('Canceled creating command.');
	collector.stop();
}
});
} else {
msg.channel.send("Couldn't add command, because you are not in the Bot Controller role.");
}
}}},
	'customcommands': (msg) => {
		if (customcmds[msg.guild.id].cmds.length == 0) return msg.channel.send(`Add some custom commands first with ${tokens.prefix}addcommand`);
		let tosend = [];
		customcmds[msg.guild.id].cmds.forEach((cmd, i) => { tosend.push(`${i+1}. Command: ${cmd.command} Response: ${cmd.response} - Created by: ${cmd.creator}`);});
		msg.channel.send(`${msg.guild.name}'s Custom Commands: \n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'removecommand': (msg) => {
		for(var i = 0; i < roleids.length; i++) {
		if(roleids[i].guildid == msg.guild.id) {
		if (msg.member.roles.has(roleids[i].roleid)) {
		var splitcommand = msg.content.split('"')[1];
		for(var i = 0; i < customcmds[msg.guild.id].cmds.length; i++) {
    if(customcmds[msg.guild.id].cmds[i].command == splitcommand) {
			msg.channel.send('Removed command: **' + customcmds[msg.guild.id].cmds[i].command + '** with response: **' + customcmds[msg.guild.id].cmds[i].response + '** created by: **' + customcmds[msg.guild.id].cmds[i].creator + '**')
      customcmds[msg.guild.id].cmds.splice(i, 1);
			fs.writeFile( "./.data/cmds_" + msg.guild.id + '.json', JSON.stringify( customcmds[msg.guild.id].cmds ), "utf8", (err) => {
			if (err) console.log('Error saving commands to file: ' + err);
			});
      break;
    }
	}
} else {
msg.channel.send("Couldn't add command, because you're not in the Bot Controller role.");
}}}}
};
client.on('ready', () => {
	console.log('ready!');
	fs.stat('./.data/', (err,stat) => {
		if(err == null) {
	fs.stat('./.data/roleids.json', (err, stat) => {
		if(err == null) {
			fs.readFile("./.data/roleids.json", (err, data) => {
			if(err) {
			console.log('Error reading roleids from file: ' + err);
			}else{
				roleids = JSON.parse(data);
			}
			})
		} else if (err.code == 'ENOENT') {
				// file does not exist
		} else {
				console.log('Error reading roleids file: ', err.code);
	}
});
} else if (err.code == 'ENOENT') {
	// file does not exist
	fs.mkdirSync('./.data/');
} else {
	console.log('Error checking if ./.data/ exists: ', err.code);
}});
});

client.on('guildCreate',function(guild){
  console.log(defaultChannel);
	guild.channels.first().send("Thanks for adding me to this server! \nAdd everyone you want to be able to add commands for the bot to the Bot Controller role. Don't remove the bot controller role, or anyone can not add commands or remove them. \nUse " + tokens.prefix + "help to view the commands.");
	guild.createRole({
    name: "LitBot Controller",
		color: "BLUE"
})
		.then(role => writeRolesToFile(role))
		.catch(console.error);
		function writeRolesToFile(role){
		roleids.push({guildid: guild.id, roleid: role.id})
		console.log('Bot added to guild ' + guild.name);
		fs.writeFile( "./.data/roleids.json", JSON.stringify( roleids ), "utf8", (err) => {
		if (err) console.log('Error saving admin role to file: ' + err);
	});
}});
client.on('guildDelete',function(guild){
	console.log('Removed from guild: ' + guild.name)
	for(var i = 0; i < roleids.length; i++) {
	if(roleids[i].guildid == guild.id) {
	roleids.splice(i, 1);
	fs.writeFile( "./.data/roleids.json", JSON.stringify( roleids ), "utf8", (err) => {
	if (err) console.log('Error saving admin role to file: ' + err);
});
}}});
client.on('message', msg => {
	if (!customcmds.hasOwnProperty(msg.guild.id)) {
		customcmds[msg.guild.id] = {};
		fs.stat('./.data/cmds_' + msg.guild.id + '.json', (err, stat) => {
    	if(err == null) {
				fs.readFile("./.data/cmds_" + msg.guild.id + '.json', (err, data) => {
		  	if (err) { console.log ('Error reading custom commands from file: ' + err);
				customcmds[msg.guild.id].cmds = [];
				message();
		 	} else {
				customcmds[msg.guild.id].cmds = JSON.parse(data);
				message();
			}});
    	} else if(err.code == 'ENOENT') {
        	// file does not exist
        	customcmds[msg.guild.id].cmds = [];
					message();
    	} else {
        	console.log('Error reading custom commands: ', err.code);
					customcmds[msg.guild.id].cmds = [];
					message();
    }
});
	/*if (fs.existsSync('./.data/cmds_' + msg.guild.id + '.json')) {
		fs.readFile("./.data/cmds_" + msg.guild.id + '.json', (err, data) => {
	  if (err) { console.log ('Error reading custom commands from file: ' + err);
		customcmds[msg.guild.id].cmds = [];
	 } else {
		customcmds[msg.guild.id].cmds = JSON.parse(data);
		console.log(customcmds[msg.guild.id].cmds);
	}});
	}else{
	customcmds[msg.guild.id].cmds = [];
}*/}else{
message();
}
function message(){
	let obj = customcmds[msg.guild.id].cmds.find(o => o.command === msg.content.toLowerCase());
	if (obj) msg.channel.send(obj.response);
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
}});

client.login(tokens.d_token).catch(console.error);
