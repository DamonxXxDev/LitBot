const { Client } = require('discord.js');
const yt = require('ytdl-core');
const lodash = require('lodash');
const tokens = require('./tokens.json');
const client = new Client();
let queue = {};
let customcmds = {};
let roleids = [];
const fs = require('fs');

const commands = {
	'play': (msg) => {

		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, or id after ${tokens.prefix}play`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.send('Invalid YouTube Link: ' + err);
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			if (queue[msg.guild.id].playing == true) {
			msg.channel.send(`added **${info.title}** to the queue`);
			} else {
			let dispatcher;
			queue[msg.guild.id].playing = true;
			play(queue[msg.guild.id].songs.shift());
			}
		});


		//console.log(queue);
		function play(song) {
			if (song === undefined) return msg.channel.send('Queue is empty').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.send(`Playing: **${song.title}** as requested by: **${song.requester}**`);
			console.log(`Playing: **${song.title}** as requested by: **${song.requester}** in guild: ${msg.guild.name}`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : tokens.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('collect', m => {
				if (m.content.startsWith(tokens.prefix + 'pause')) {
					msg.channel.send('Paused.').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(tokens.prefix + 'resume')){
					msg.channel.send('Resumed.').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(tokens.prefix + 'skip')){
					msg.channel.send('Skipped.').then(() => {dispatcher.end();});
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
	'add': (msg) => {
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, or id after ${tokens.prefix}add`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.send('Invalid YouTube Link: ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.send(`added **${info.title}** to the queue`);
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(`Add some songs to the queue first with ${tokens.prefix}add`);
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.send(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'help': (msg) => {
		let tosend = ['```xl', tokens.prefix + 'join: "Join voice channel of message sender."', tokens.prefix + 'queue: "Shows the current queue, up to 15 songs shown."', tokens.prefix + 'play: "Play a song."', 'Bot Controller commands:', tokens.prefix + 'addcommand: "Adds a custom command, example: ' + tokens.prefix + 'addcommand (command here) (response here)"' , tokens.prefix + 'removecommand: "Removes a custom command, example: ' + tokens.prefix + '(command)"',  'the following commands only function while the play command is running:'.toUpperCase(), tokens.prefix + 'pause: "Pauses the music."',	tokens.prefix + 'resume: "Resumes the music."', tokens.prefix + 'skip: "Skips the playing song."', tokens.prefix + 'time: "Shows the playtime of the song."',	'volume+(+++): "Increases volume by 2%."',	'volume-(---): "Decreases volume by 2%."',	'```'];
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
		let args = msg.content.toLowerCase().split(' ');
		var command = args[1];
		var response = args[2];
		customcmds[msg.guild.id].cmds.push({command: command, response: response, creator: msg.author.username + '#' + msg.author.discriminator});
		msg.channel.send('Added command: **' + args[1] + '** with response: **' + args[2] + '** by: **' + msg.author.username + '#' + msg.author.discriminator + '**');
		fs.writeFile( "./savedfiles/cmds_" + msg.guild.id + '.json', JSON.stringify( customcmds[msg.guild.id].cmds ), "utf8", (err) => {
		if (err) console.log('Error saving command to file: ' + err);
	});
}}}},
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
		var splitcommand = msg.content.split(' ')[1];
		for(var i = 0; i < customcmds[msg.guild.id].cmds.length; i++) {
    if(customcmds[msg.guild.id].cmds[i].command == splitcommand) {
			msg.channel.send('Removed command: **' + customcmds[msg.guild.id].cmds[i].command + '** with response: **' + customcmds[msg.guild.id].cmds[i].response + '** created by: **' + customcmds[msg.guild.id].cmds[i].creator + '**')
      customcmds[msg.guild.id].cmds.splice(i, 1);
			fs.writeFile( "./savedfiles/cmds_" + msg.guild.id + '.json', JSON.stringify( customcmds[msg.guild.id].cmds ), "utf8", (err) => {
			if (err) console.log('Error saving commands to file: ' + err);
			});
      break;
    }
	}
}}}}
};
client.on('ready', () => {
	console.log('ready!');
	fs.stat('./savedfiles/roleids.json', (err, stat) => {
		if(err == null) {
			fs.readFile("./savedfiles/roleids.json", (err, data) => {
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
});

client.on('guildCreate',function(guild){
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
		fs.writeFile( "./savedfiles/roleids.json", JSON.stringify( roleids ), "utf8", (err) => {
		if (err) console.log('Error saving admin role to file: ' + err);
	});
}});
client.on('guildDelete',function(guild){
	console.log('Removed from guild: ' + guild.name)
	for(var i = 0; i < roleids.length; i++) {
	if(roleids[i].guildid == guild.id) {
	roleids.splice(i, 1);
	fs.writeFile( "./savedfiles/roleids.json", JSON.stringify( roleids ), "utf8", (err) => {
	if (err) console.log('Error saving admin role to file: ' + err);
});
}}});
client.on('message', msg => {
	if (!customcmds.hasOwnProperty(msg.guild.id)) {
		customcmds[msg.guild.id] = {};
		fs.stat('./savedfiles/cmds_' + msg.guild.id + '.json', (err, stat) => {
    	if(err == null) {
				fs.readFile("./savedfiles/cmds_" + msg.guild.id + '.json', (err, data) => {
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
	/*if (fs.existsSync('./savedfiles/cmds_' + msg.guild.id + '.json')) {
		fs.readFile("./savedfiles/cmds_" + msg.guild.id + '.json', (err, data) => {
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
	let obj = customcmds[msg.guild.id].cmds.find(o => o.command === msg.content.toLowerCase()/*.split(' ')[0]*/);
	if (obj) msg.channel.send(obj.response);
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
}});
client.login(tokens.d_token);
//TODO komennot jotka "" merkeissä että saa monta sanaa, hae youtubesta että ei tarvitse laittaa linkkiä
