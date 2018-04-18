//TODO always choose WebmOpus streams in chooseFormat()
//TODO fix format saved in autoplaylist file saving all data
//TODO auto disconnect when no one is in voice channel
//TODO youtube autoplay
var yt = require('ytdl-core');
var urlchk = require('valid-url');
let queue = {};
let canPlay = {};
let canPlayAutoplaylist = {};
var search = require('youtube-search');
const tokens = require('../.data/tokens.json');
var opts = {
	maxResults: 5,
	key: tokens.yt_api_key
};
const fs = require('fs');
var addons = require('../addons.js');
function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}
process.on('exit', () => {
	for (var p in queue) {
		if (!queue[p].hasOwnProperty('downloading')) continue;
		if (queue[p].downloading == true) {
			queue[p].ytdl.unpipe();
			fs.unlinkSync('./.data/downloadedSongs/' + queue[p].currplaying.video_id + '.' + queue[p].currplaying.format.container);
		}
	}
});
function play(song, msg) {
	var dispatcher;
	if (!canPlayAutoplaylist.hasOwnProperty(msg.guild.id)) {
		canPlayAutoplaylist[msg.guild.id] = {};
		canPlayAutoplaylist[msg.guild.id].canPlay = true;
	}
	if (canPlayAutoplaylist[msg.guild.id].canPlay == false) {
		canPlayAutoplaylist[msg.guild.id].canPlay = true;
		return;
	}
	if (song === undefined) {
		queue[msg.guild.id].playing = false;
		playAutoPlaylist(msg);
		return;
	}
	var playOptions = { passes: tokens.passes };
	if (song.format.container == 'webm' && song.format.audioEncoding == 'opus') {
		playOptions.type = 'webm/opus';
	}
	if (tokens.cache_songs == true) {
		fs.stat('./.data/downloadedSongs/' + song.video_id + '.' + song.format.container, (err) => {
			if (err == null) {
				queue[msg.guild.id].downloading = false;
				dispatcher = msg.guild.voiceConnection.play(fs.createReadStream('./.data/downloadedSongs/' + song.video_id + '.' + song.format.container), playOptions);
				afterDownload();
			} else if (err.code == 'ENOENT') {
				// file does not exist
				queue[msg.guild.id].writeStream = fs.createWriteStream('./.data/downloadedSongs/' + song.video_id + '.' + song.format.container);
				queue[msg.guild.id].ytdl = yt(song.url, {
					format: song.format,
					highWaterMark: 65536
				});
				try {
					dispatcher = msg.guild.voiceConnection.play(queue[msg.guild.id].ytdl, playOptions);
				}
				catch (err) {
					queue[msg.guild.id].ytdl.unpipe();
					queue[msg.guild.id].writeStream.destroy('Error piping to Discord');
					console.log('Error playing: \n' + err);
					msg.channel.send('Error playing: \n```' + err + '```');
					play(song, msg);
					fs.unlinkSync('./.data/downloadedSongs/' + song.video_id + '.' + song.format.container);
					return;
				}
				queue[msg.guild.id].ytdl.pipe(queue[msg.guild.id].writeStream);
				queue[msg.guild.id].downloading = true;
				afterDownload();
			} else {
				console.log('Error reading song file.');
				msg.channel.send('Error playing. Try again later.');
				return;
			}
		});
	} else {
		if (song.format.container == 'webm' && song.format.audioEncoding == 'opus') {
			playOptions.type = 'webm/opus';
		}
		queue[msg.guild.id].downloading = false;
		dispatcher = msg.guild.voiceConnection.play(yt(song.url, {
			format: song.format,
			highWaterMark: 65536
		}), playOptions);
		afterDownload();
	}
    
	function afterDownload() {
		queue[msg.guild.id].currplaying = song;
		var minutes = Math.floor(song.length / 60);
		var seconds = song.length - minutes * 60;
		var finalTime = minutes + ':' + seconds;
		msg.channel.send({
			'embed': {
				'description': '**Playing: [' + song.title + '](' + song.url + ') from:  ' + song.type + '**',
				'color': 123433,
				'thumbnail': {
					'url': 'https://img.youtube.com/vi/' + song.video_id + '/mqdefault.jpg'
				},
				'author': {
					'name': song.requester,
					'icon_url': song.avatarURL
				},
				'fields': [{
					'name': 'Channel',
					'value': song.author,
					'inline': true
				},
				{
					'name': 'Duration',
					'value': finalTime,
					'inline': true
				},
				{
					'name': 'Requester',
					'value': song.requester,
					'inline': true
				},
				]
			}
		});
		console.log(`Playing: ${song.title} as requested by: ${song.requester} in guild: ${msg.guild.name}`);
		dispatcher.on('end', () => {
			queue[msg.guild.id].downloading = false;
			if (queue[msg.guild.id].loop == true) {
				var songPush = queue[msg.guild.id].songs.shift();
				play(songPush, msg);
				if (songPush != undefined) queue[msg.guild.id].songs.push(songPush);
			} else {
				play(queue[msg.guild.id].songs.shift(), msg);
			}
		});
		dispatcher.on('error', (err) => {
			queue[msg.guild.id].downloading = false;
			return msg.channel.send('Error while playing: ' + err).then(() => {
				console.log(err);
				//collector.stop();
				queue[msg.guild.id].playing = false;
				//TODO fix this needing the bot controller role
				exports.commands.disconnect(msg, tokens);
			});
		});
	}
}

function join(msg) {
	return new Promise((resolve, reject) => {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel || voiceChannel.type !== 'voice') return msg.channel.send('I couldn\'t connect to your voice channel...');
		voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
	});
}
function chooseFormat(formats) {
	return yt.chooseFormat(formats, {
		filter: 'audioonly',
		quality: 'highestaudio'
	});
}
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function playAutoPlaylist(msg) {
	if (!canPlayAutoplaylist.hasOwnProperty(msg.guild.id)) {
		canPlayAutoplaylist[msg.guild.id] = {};
		canPlayAutoplaylist[msg.guild.id].canPlay = true;
	}
	if (canPlayAutoplaylist[msg.guild.id].canPlay == false) {
		canPlayAutoplaylist[msg.guild.id].canPlay = true;
		return;
	}
	//TODO finish
	if (!msg.guild.voiceConnection) return join(msg).then(() => playAutoPlaylist(msg)).catch(msg.channel.send("I couldn't join your voice channel.."));
	fs.stat('./.data/', (err) => {
		if (err == null) {
			fs.stat('./.data/autoPL_' + msg.guild.id + '.json', (err) => {
				if (err == null) {
					fs.readFile('./.data/autoPL_' + msg.guild.id + '.json', (err, data) => {
						if (err) {
							console.log('Error reading roleids from file: ' + err);
						} else {
							queue[msg.guild.id].autoplaylist = JSON.parse(data);
							if (queue[msg.guild.id].autoplaylist.length == 0) {
								msg.channel.send('No songs in autoplaylist. Leaving voice channel.');
								queue[msg.guild.id].playing = false;
								msg.member.voiceChannel.leave();
								return;
							}
							var playNumber = getRandomInt(0, queue[msg.guild.id].autoplaylist.length - 1);
							yt.getInfo(queue[msg.guild.id].autoplaylist[playNumber].url, (err, info) => {
								if (err) {
									console.log('Invalid song in Autoplaylist: ' + queue[msg.guild.id].autoplaylist[playNumber].url + 'in guild: ' + msg.guild.name);
									msg.channel.send('Invalid song in Autoplaylist: ' + queue[msg.guild.id].autoplaylist[playNumber].url);
									return;
								}
								var format = chooseFormat(info.formats);
								if (!format) {
									msg.channel.send('Could not download. Try again later.');
									console.log('Error downloading. Could not get format.');
									return;
								}
								queue[msg.guild.id].songs.push({
									url: queue[msg.guild.id].autoplaylist[playNumber].url,
									title: info.title,
									requester: queue[msg.guild.id].autoplaylist[playNumber].requester,
									video_id: info.video_id,
									avatarURL: queue[msg.guild.id].autoplaylist[playNumber].avatarURL,
									length: info.length_seconds,
									author: info.author.name,
									type: 'Autoplaylist',
									format: format
								});
								play(queue[msg.guild.id].songs.shift(), msg);
								queue[msg.guild.id].playing = true;
							});
						}
					});
				} else if (err.code == 'ENOENT') {
					// file does not exist
					msg.channel.send('No songs in autoplaylist. Leaving voice channel.');
					queue[msg.guild.id].playing = false;
					msg.member.voiceChannel.leave();
				} else {
					console.log('Error reading autoplaylist: ', err);
					msg.channel.send('Error reading autoplaylist: ', err);
					msg.member.voiceChannel.leave();
				}
			});
		} else if (err.code == 'ENOENT') {
			// .data does not exist
			fs.mkdirSync('./.data/');
			playAutoPlaylist(msg);
		} else {
			console.log('Error checking if ./.data/ exists: ', err);
			msg.channel.send('Error checking if ./.data/ exists: ', err);
			msg.member.voiceChannel.leave();
		}
	});
}

function getAPL(msg) {
	if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [];
	fs.stat('./.data/', (err) => {
		if (err == null) {
			fs.stat('./.data/autoPL_' + msg.guild.id + '.json', (err) => {
				if (err == null) {
					fs.readFile('./.data/autoPL_' + msg.guild.id + '.json', (err, data) => {
						if (err) {
							console.log('Error reading autoplaylist from file: ' + err);
						} else {
							queue[msg.guild.id].autoplaylist = JSON.parse(data);
						}
					});
				} else if (err.code == 'ENOENT') {
					// file does not exist
					queue[msg.guild.id].autoplaylist = [];
				} else {
					console.log('Error reading autoplaylist: ', err);
					msg.channel.send('Error reading autoplaylist: ', err);
					return;
				}
			});
		} else if (err.code == 'ENOENT') {
			// .data does not exist
			fs.mkdirSync('./.data/');
			queue[msg.guild.id].autoplaylist = [];
		} else {
			console.log('Error checking if ./.data/ exists: ', err);
			msg.channel.send('Error checking if ./.data/ exists: ', err);
			return;
		}
	});
}
exports.commands = {
	pause: {
		usage: '',
		description: 'Pauses the song that is currently playing.',
		aliases: [],
		command: (msg) => {
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [];
			if (queue[msg.guild.id].playing == true) {
				if (msg.guild.voiceConnection) {
					msg.guild.voiceConnection.dispatcher.pause();
					msg.channel.send('Paused.');
				} else {
					msg.channel.send('The bot is not currently connected to a voice channel.');
					if (queue[msg.guild.id]) return queue[msg.guild.id].playing = false;
				}
			} else {
				msg.channel.send('The bot is not currently playing music.');
			}
		}
	},
	resume: {
		usage: '',
		description: 'Resumes the song that is currently playing.',
		aliases: [],
		command: (msg) => {
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [];
			if (queue[msg.guild.id].playing == true) {
				if (msg.guild.voiceConnection) {
					msg.guild.voiceConnection.dispatcher.resume();
					msg.channel.send('Resumed.');
				} else {
					msg.channel.send('The bot is not currently connected to a voice channel.');
					if (queue[msg.guild.id]) return queue[msg.guild.id].playing = false;
				}
			} else {
				msg.channel.send('The bot is not currently playing music.');
			}
		}
	},
	skip: {
		usage: '',
		description: 'Skips the song that is currently playing.',
		aliases: ['s'],
		command: (msg) => {
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [];
			if (queue[msg.guild.id].playing == true) {
				if (msg.guild.voiceConnection) {
					var song = queue[msg.guild.id].currplaying;
					var minutes = Math.floor(song.length / 60);
					var seconds = song.length - minutes * 60;
					var finalTime = minutes + ':' + seconds;
					msg.channel.send({
						'embed': {
							'description': '**Skipped [' + song.title + '](' + song.url + ')**',
							'color': 14335,
							'thumbnail': {
								'url': 'https://img.youtube.com/vi/' + song.video_id + '/mqdefault.jpg'
							},
							'author': {
								'name': msg.author.username,
								'icon_url': msg.author.displayAvatarURL()
							},
							'fields': [{
								'name': 'Channel',
								'value': song.author,
								'inline': true
							},
							{
								'name': 'Duration',
								'value': finalTime,
								'inline': true
							},
							{
								'name': 'Requester',
								'value': song.requester,
								'inline': true
							}
							]
						}
					}).then(() => {
						msg.guild.voiceConnection.dispatcher.end();
						if (queue[msg.guild.id].downloading == true) {
							queue[msg.guild.id].ytdl.unpipe();
							fs.unlink('./.data/downloadedSongs/' + song.video_id + '.' + song.format.container, (err) => {
								if (err) throw err;
							});
						}
						queue[msg.guild.id].downloading = false;
					});
				} else {
					msg.channel.send('The bot is not currently connected to a voice channel.');
					if (queue[msg.guild.id]) return queue[msg.guild.id].playing = false;
					queue[msg.guild.id].downloading = false;
				}
			} else {
				msg.channel.send('The bot is not currently playing music.');
			}
		}
	},
	nowplaying: {
		usage: '',
		description: 'Shows what song is currently playing.',
		aliases: ['np'],
		command: (msg) => {
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [];
			if (queue[msg.guild.id].playing == true) {
				if (msg.guild.voiceConnection) {
					var song = queue[msg.guild.id].currplaying;
					var minutes = Math.floor(song.length / 60);
					var seconds = song.length - minutes * 60;
					var finalTime = minutes + ':' + seconds;
					//TODO change webserver-wip server icons to use .displayAvatarURL()
					msg.channel.send({
						'embed': {
							'description': '**Now Playing: [' + song.title + '](' + song.url + ') from: ' + song.type + '**',
							'color': 16073282,
							'thumbnail': {
								'url': 'https://img.youtube.com/vi/' + song.video_id + '/mqdefault.jpg'
							},
							'author': {
								'name': msg.author.username,
								'icon_url': msg.author.displayAvatarURL()
							},
							'fields': [{
								'name': 'Channel',
								'value': song.author,
								'inline': true
							},
							{
								'name': 'Duration',
								'value': finalTime,
								'inline': true
							},
							{
								'name': 'Playtime',
								'value': `${Math.floor(msg.guild.voiceConnection.dispatcher.streamTime / 60000)}:${Math.floor((msg.guild.voiceConnection.dispatcher.streamTime % 60000) / 1000) < 10 ? '0' + Math.floor((msg.guild.voiceConnection.dispatcher.streamTime % 60000) / 1000) : Math.floor((msg.guild.voiceConnection.dispatcher.streamTime % 60000) / 1000)}/` + finalTime,
								'inline': true
							}
							]
						}
					});
				} else {
					msg.channel.send('The bot is not currently connected to a voice channel.');
					if (queue[msg.guild.id]) return queue[msg.guild.id].playing = false;
					queue[msg.guild.id].downloading = false;
				}
			} else {
				msg.channel.send('The bot is not currently playing music.');
			}
		}
	},
	autoplaylist: {
		usage: '',
		description: 'Shows the autoplaylist of this server.',
		aliases: ['apl'],
		command: (msg) => {
			getAPL(msg);
			var times = 0;
			next();
			times = times + 1;
			function next() {
				if (queue[msg.guild.id].autoplaylist == undefined) {
					if (times > 30) {
						//if getting autoplaylist fails over 30 times return
						//timeout because getAPL function is async
						msg.channel.send('Error getting autoplaylist. Try again later.');
						console.log('Error getting autoplaylist.');
						return;
					}
					setTimeout(next, 10);
					return;
				}
				console.log(queue);
				if (!queue) {
					msg.channel.send('No songs in autoplaylist.');
				} else {
					let tosend = [];
					var songs = 'songs';
					if (queue[msg.guild.id].autoplaylist.length == 1) songs = 'song';
					queue[msg.guild.id].autoplaylist.forEach((song, i) => {
						tosend.push(`${i + 1}. ${song.title} \n   Requested by: ${song.requester} \n   URL: ${song.url}  \u2063`);
					});
					msg.channel.send(`__**${msg.guild.name}'s Autoplaylist:**__ Currently **${tosend.length}** ${songs} in autoplaylist \n\`\`\`${tosend.join('\n')}\`\`\``, {
						split: {
							char: '\u2063',
							prepend: '```',
							append: '```'
						}
					});
				}
			}
		}
	},
	autoplaylistremove: {
		usage: '<song url>',
		description: 'Removes a song from the autoplaylist.',
		aliases: ['aplr'],
		command: (msg, tokens) => {
			//check if user has Bot Controller role
			if (addons.functions.hasRole(msg, tokens) == false) return;
			next();
        
			function next() {
				//read autoplaylist file
				getAPL(msg);
				var times = 0;
				times = times + 1;
				if (queue[msg.guild.id].autoplaylist == undefined) {
					if (times > 30) {
						console.log('Couldn\'t get autoplaylist for guild: ' + msg.guild.name);
						msg.channel.send('Error getting autoplaylist. Try again later.');
					}
					setTimeout(next, 5);
					return;
				}
				let url = msg.content.split(' ')[1];
				if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, search term, or id after ${tokens.prefix}autoplaylistremove`);
				if (urlchk.isWebUri(url)) {
					yt.getInfo(url, (err, info) => {
						if (err) return msg.channel.send('Invalid YouTube Link: ' + err);
						let obj = queue[msg.guild.id].autoplaylist.find(o => o.url.toLowerCase() === url.toLowerCase());
						if (obj) {
							var requester = msg.author.username + '#' + msg.author.discriminator;
							queue[msg.guild.id].autoplaylist.splice(queue[msg.guild.id].autoplaylist.findIndex(o => o.url.toLowerCase() === url.toLowerCase()), 1);
							//convert time into minutes and seconds
							var minutes = Math.floor(info.length_seconds / 60);
							var seconds = info.length_seconds - minutes * 60;
							var finalTime = minutes + ':' + seconds;
							//get thumbnail url for embed
							var thumbUrl = 'https://img.youtube.com/vi/' + info.video_id + '/mqdefault.jpg';
							//send embed message
							msg.channel.send({
								'embed': {
									'description': '**Removed from autoplaylist: [' + info.title + '](' + url + ')**',
									'color': 123433,
									'thumbnail': {
										'url': thumbUrl
									},
									'author': {
										'name': requester,
										'icon_url': msg.author.displayAvatarURL()
									},
									'fields': [{
										'name': 'Channel',
										'value': info.title,
										'inline': true
									},
									{
										'name': 'Duration',
										'value': finalTime,
										'inline': true
									},
									{
										'name': 'Songs in autoplaylist',
										'value': queue[msg.guild.id].autoplaylist.length,
										'inline': true
									}
									]
								}
							});
							fs.writeFile('./.data/autoPL_' + msg.guild.id + '.json', JSON.stringify(queue[msg.guild.id].autoplaylist, null, '\t'), (err) => {
								if (err) {
									console.log('Error ' + err + ' saving autoplaylist to file in guild: ' + msg.guild.name);
									msg.channel.send('Error ' + err + ' saving autoplaylist to file.');
									return;
								}
							});
						}
					});
				} else {
					msg.channel.send('Removing by name is not yet supported. Please send the link to the video. You can get all songs in the autoplaylist with the command ' + tokens.prefix + 'autoplaylist.');
				}
			}
		}
	},
	autoplaylistadd: {
		usage: '',
		description: 'Adds a song to the autoplaylist.',
		aliases: ['apla', 'apladd'],
		command: (msg, tokens) => {
			if (addons.functions.hasRole(msg, tokens) == false) return;
			let url = msg.content.split(' ')[1];
			if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, search term, or id after ${tokens.prefix}autoplaylistadd`);
			getAPL(msg);
			if (urlchk.isWebUri(url)) {
				yt.getInfo(url, (err, info) => {
					if (err) return msg.channel.send('Invalid YouTube Link: ' + err);
					var obj = queue[msg.guild.id].autoplaylist.find(o => o.url.toLowerCase() === url.toLowerCase());
					if (obj) return msg.channel.send('This song is already on the Autoplaylist.');
					var requester = msg.author.username + '#' + msg.author.discriminator;
					//push to autoplaylist array
					queue[msg.guild.id].autoplaylist.push({
						url: url,
						title: info.title,
						requester: requester,
						video_id: info.video_id,
						avatarURL: msg.author.displayAvatarURL(),
						length: info.length_seconds,
						author: info.author.name
					});
					//save autoplaylist array to file
					fs.writeFile('./.data/autoPL_' + msg.guild.id + '.json', JSON.stringify(queue[msg.guild.id].autoplaylist, null, '\t'), (err) => {
						if (err) {
							console.log('Error ' + err + ' saving autoplaylist to file in guild: ' + msg.guild.name);
							msg.channel.send('Error ' + err + ' saving autoplaylist to file.');
							return;
						} else {
							var minutes = Math.floor(info.length_seconds / 60);
							var seconds = info.length_seconds - minutes * 60;
							var finalTime = minutes + ':' + seconds;
							var thumbUrl = 'https://img.youtube.com/vi/' + info.video_id + '/mqdefault.jpg';
							msg.channel.send({
								'embed': {
									'description': '**Added song to autoplaylist: [' + info.title + '](' + url + ')**',
									'color': 123433,
									'thumbnail': {
										'url': thumbUrl
									},
									'author': {
										'name': msg.author.username,
										'icon_url': msg.author.displayAvatarURL()
									},
									'fields': [{
										'name': 'Channel',
										'value': info.author.name,
										'inline': true
									},
									{
										'name': 'Duration',
										'value': finalTime,
										'inline': true
									},
									{
										'name': 'Songs in autoplaylist',
										'value': queue[msg.guild.id].autoplaylist.length,
										'inline': true
									}
									]
								}
							});
						}
					});
				});
			} else {
				if (!canPlay.hasOwnProperty(msg.channel.id)) canPlay[msg.channel.id] = {}, canPlay[msg.channel.id].canPlay = true, canPlay[msg.channel.id].id = 0, canPlay[msg.channel.id].reason = 'undefined';
				if (canPlay[msg.channel.id].canPlay == false && !msg.author.id == canPlay[msg.channel.id].id) return msg.channel.send(canPlay[msg.channel.id].reason);
				var parts = msg.content.split(' ');
				parts.shift();
				var searchTerms = parts.join(' ');
				search(searchTerms, opts, function (err, results) {
					if (err) return console.log('Error searching youtube: ' + err);
					//console.dir(results);
					var tosend = ['**Select a song with the `' + tokens.prefix + 'play <song>` command, or cancel using the `' + tokens.prefix + 'cancel` command (Automatically cancels after 20 seconds.): **'];
					for (var i = 0; i < results.length; i++) {
						var lineNumber = i + 1;
						tosend.push(lineNumber + ': ' + results[i].title);
					}
					msg.channel.send(tosend.join('\n'));
					let collector = msg.channel.createMessageCollector(m => m);
					var timeout = setTimeout(function () {
						msg.channel.send('Canceled playing song.');
						collector.stop();
					}, 20000);
					canPlay[msg.channel.id].canPlay = false;
					canPlay[msg.channel.id].reason = 'Someone is already choosing a song on this channel.';
					canPlay[msg.channel.id].id = msg.author.id;
					collector.on('collect', m => {
						if (!m.author.id == msg.author.id) return;
						if (m.content.startsWith(tokens.prefix + 'play' || tokens.prefix + 'p')) {
							var parts = m.content.split(' ');
							parts.shift();
							var number = parts.join(' ');
							if (!isNumeric(number)) return;
							if (!number < 6 && !number > 0) return;
							number = number - 1;
							var url = results[number].link;
							yt.getInfo(url, (err, info) => {
								if (err) return m.channel.send('Error while adding song to autoplaylist: ' + err);
								let obj = queue[msg.guild.id].autoplaylist.find(o => o.url.toLowerCase() == url.toLowerCase());
								if (obj) {
									msg.channel.send('This song is already on the Autoplaylist.');
									return;
								}
								var format = chooseFormat(info.formats);
								if (!format) {
									msg.channel.send('Could not download. Try again later.');
									console.log('Error downloading. Could not get format.');
									return;
								}
								var requester = m.author.username + '#' + m.author.discriminator;
								queue[msg.guild.id].autoplaylist.push({
									url: url,
									title: info.title,
									requester: requester,
									video_id: info.video_id,
									avatarURL: msg.author.displayAvatarURL(),
									length: info.length_seconds,
									author: info.author.name,
									format: format
								});
								fs.writeFile('./.data/autoPL_' + msg.guild.id + '.json', JSON.stringify(queue[msg.guild.id].autoplaylist, null, '\t'), (err) => {
									if (err) {
										console.log('Error ' + err + ' saving autoplaylist to file in guild: ' + m.guild.name);
										m.channel.send('Error ' + err + ' saving autoplaylist to file.');
										return;
									} else {
										clearTimeout(timeout);
										collector.stop();
										canPlay[msg.channel.id].canPlay = true;
										delete canPlay[msg.channel.id].id;
										var minutes = Math.floor(info.length_seconds / 60);
										var seconds = info.length_seconds - minutes * 60;
										var finalTime = minutes + ':' + seconds;
										m.channel.send({
											'embed': {
												'description': '**Added song to autoplaylist: [' + info.title + '](' + url + ')**',
												'color': 123433,
												'thumbnail': {
													'url': results[number].thumbnails.high.url
												},
												'author': {
													'name': m.author.username,
													'icon_url': m.author.displayAvatarURL()
												},
												'fields': [{
													'name': 'Channel',
													'value': results[number].channelTitle,
													'inline': true
												},
												{
													'name': 'Duration',
													'value': finalTime,
													'inline': true
												},
												{
													'name': 'Songs in autoplaylist',
													'value': queue[m.guild.id].autoplaylist.length,
													'inline': true
												}
												]
											}
										});
									}
								});
							});
						} else {
							if (!m.content.startsWith(tokens.prefix + 'cancel')) return;
							clearTimeout(timeout);
							collector.stop();
							m.channel.send('Canceled playing song.');
							canPlay[msg.channel.id].canPlay = true;
							delete canPlay[msg.channel.id].id;
						}
					});
				});
			}
		}
	},
	play: {
		usage: '',
		description: 'Plays a song.',
		aliases: ['p', 'add'],
		command: (msg, tokens, commandfiles, client) => {
			if (!canPlay.hasOwnProperty(msg.channel.id)) canPlay[msg.channel.id] = {}, canPlay[msg.channel.id].canPlay = true, canPlay[msg.channel.id].id = 0, canPlay[msg.channel.id].reason = 'undefined';
			if (canPlay[msg.channel.id].canPlay == false && !msg.author.id == canPlay[msg.channel.id].id) return;
			if (canPlay[msg.channel.id].canPlay == false) return;
			if (!msg.guild.voiceConnection) return join(msg).then(() => {exports.commands.play.command(msg, tokens, commandfiles, client)}, () => {msg.channel.send("I couldn't join your voice channel..")});
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
			let url = msg.content.split(' ')[1];
			if (urlchk.isWebUri(url)) {
				if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, search term, or id after ${tokens.prefix}play`);
				yt.getInfo(url, (err, info) => {
					if (err) return msg.channel.send('Invalid YouTube Link: ' + err);
					var requester = msg.author.username + '#' + msg.author.discriminator;
					var format = chooseFormat(info.formats);
					if (!format) {
						msg.channel.send('Could not download. Try again later.');
						console.log('Error downloading. Could not get format.');
						return;
					}
					queue[msg.guild.id].songs.push({
						url: url,
						title: info.title,
						requester: requester,
						video_id: info.video_id,
						avatarURL: msg.author.displayAvatarURL(),
						length: info.length_seconds,
						author: info.author.name,
						type: 'Queue',
						format: format
					});
					if (queue[msg.guild.id].playing == true) {
						var minutes = Math.floor(info.length_seconds / 60);
						var seconds = info.length_seconds - minutes * 60;
						var finalTime = minutes + ':' + seconds;
						var thumbUrl = 'https://img.youtube.com/vi/' + info.video_id + '/mqdefault.jpg';
						msg.channel.send({
							'embed': {
								'description': '**Added song to queue: [' + info.title + '](' + url + ')**',
								'color': 123433,
								'thumbnail': {
									'url': thumbUrl
								},
								'author': {
									'name': msg.author.username,
									'icon_url': msg.author.displayAvatarURL()
								},
								'fields': [{
									'name': 'Channel',
									'value': info.author.name,
									'inline': true
								},
								{
									'name': 'Duration',
									'value': finalTime,
									'inline': true
								},
								{
									'name': 'Position in queue',
									'value': queue[msg.guild.id].songs.length,
									'inline': true
								}
								]
							}
						});
					} else {
						queue[msg.guild.id].playing = true;
						if (queue[msg.guild.id].loop == true) {
							var songPush = queue[msg.guild.id].songs.shift();
							play(songPush, msg);
							queue[msg.guild.id].songs.push(songPush);
						} else {
							play(queue[msg.guild.id].songs.shift(), msg);
						}
					}
				});
			} else {
				var parts = msg.content.split(' ');
				parts.shift();
				var searchTerms = parts.join(' ');
				search(searchTerms, opts, function (err, results) {
					if (err) return console.log('Error searching youtube: ' + err);
					//console.dir(results);
					var tosend = ['**Select a song with the `' + tokens.prefix + 'play (song)` command, or cancel using the `' + tokens.prefix + 'cancel` command (Automatically cancels after 20 seconds.): **'];
					for (var i = 0; i < results.length; i++) {
						var lineNumber = i + 1;
						tosend.push(lineNumber + ': ' + results[i].title);
					}
					msg.channel.send(tosend.join('\n'));
					let collector = msg.channel.createMessageCollector(m => m);
					var timeout = setTimeout(function () {
						msg.channel.send('Canceled playing song.');
						collector.stop();
					}, 20000);
					canPlay[msg.channel.id].canPlay = false;
					canPlay[msg.channel.id].reason = 'Someone is already choosing a song on this channel.';
					canPlay[msg.channel.id].id = msg.author.id;
					collector.on('collect', m => {
						if (!client.voiceConnections.has(m.guild.id)) {
							clearTimeout(timeout);
							m.channel.send('Canceled search.');
							collector.stop();
							canPlay[msg.channel.id].canPlay = true;
							delete canPlay[msg.channel.id].id;
							return;
						}
						if (!m.author.id == msg.author.id) return;
						if (m.content.startsWith(tokens.prefix + 'play ')) {
							var parts = m.content.split(' ');
							parts.shift();
							var number = parts.join(' ');
							if (!isNumeric(number)) return;
							if (!number < 6 && !number > 0) return;
							number = number - 1;
							clearTimeout(timeout);
							var url = results[number].link;
							yt.getInfo(url, (err, info) => {
								if (err) {
									msg.channel.send('Error playing song: `' + err + '`');
									collector.stop();
									clearTimeout(timeout);
									return;
								}
								var requester = msg.author.username + '#' + msg.author.discriminator;
								var format = chooseFormat(info.formats);
								if (!format) {
									msg.channel.send('Could not download. Try again later.');
									console.log('Error downloading. Could not get format.');
									return;
								}
								queue[msg.guild.id].songs.push({
									url: url,
									title: info.title,
									requester: requester,
									video_id: info.video_id,
									avatarURL: msg.author.displayAvatarURL(),
									length: info.length_seconds,
									author: info.author.name,
									type: 'Queue',
									format: format
								});
								if (queue[msg.guild.id].playing == true) {
									var minutes = Math.floor(info.length_seconds / 60);
									var seconds = info.length_seconds - minutes * 60;
									var finalTime = minutes + ':' + seconds;
									m.channel.send({
										'embed': {
											'description': '**Added song to queue: [' + info.title + '](' + url + ')**',
											'color': 123433,
											'thumbnail': {
												'url': results[number].thumbnails.high.url
											},
											'author': {
												'name': m.author.username,
												'icon_url': m.author.displayAvatarURL()
											},
											'fields': [{
												'name': 'Channel',
												'value': results[number].channelTitle,
												'inline': true
											},
											{
												'name': 'Duration',
												'value': finalTime,
												'inline': true
											},
											{
												'name': 'Position in queue',
												'value': queue[m.guild.id].songs.length,
												'inline': true
											}
											]
										}
									});
									collector.stop();
									canPlay[msg.channel.id].canPlay = true;
									delete canPlay[msg.channel.id].id;
								} else {
									queue[msg.guild.id].playing = true;
									if (queue[msg.guild.id].loop == true) {
										var songPush = queue[msg.guild.id].songs.shift();
										play(songPush, msg);
										queue[msg.guild.id].songs.push(songPush);
									} else {
										play(queue[msg.guild.id].songs.shift(), msg);
									}
									collector.stop();
									canPlay[msg.channel.id].canPlay = true;
									delete canPlay[msg.channel.id].id;
								}
							});
						} else {
							if (!m.content.startsWith(tokens.prefix + 'cancel')) return;
							clearTimeout(timeout);
							collector.stop();
							m.channel.send('Canceled playing song.');
							canPlay[msg.channel.id].canPlay = true;
							delete canPlay[msg.channel.id].id;
						}
					});
				});
			}
		}
	},
	'join': {
		usage: '',
		description: 'Joins a voice channel.',
		aliases: ['j'],
		command: (msg) => {
			join(msg).catch((reason) => {msg.channel.send("I couldn't join your voice channel..");});
		}
	},
	'playautoplaylist': {
		usage: '',
		description: 'Plays the autoplaylist.',
		aliases: ['papl', 'pautoplaylist', 'autoplaylistplay', 'playapl'],
		command: (msg) => {
			msg.channel.send('Playing Autoplaylist..');
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
			playAutoPlaylist(msg);
		}
	},
	'disconnect': {
		usage: '',
		description: 'Leaves the current voice channel.',
		aliases: ['leave'],
		command: (msg, tokens) => {
			if (addons.functions.hasRole(msg, tokens) == false) return;
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t disconnect from your voice channel...');
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
			if (!canPlayAutoplaylist.hasOwnProperty(msg.guild.id)) {
				canPlayAutoplaylist[msg.guild.id] = {};
				canPlayAutoplaylist[msg.guild.id].canPlay = false;
			}
			canPlayAutoplaylist[msg.guild.id].canPlay = false;
			queue[msg.guild.id].songs = [];
			queue[msg.guild.id].playing = false;
			voiceChannel.leave();
			if (queue[msg.guild.id].downloading == true) {
				queue[msg.guild.id].ytdl.unpipe();
				fs.unlink('./.data/downloadedSongs/' + queue[msg.guild.id].currplaying.video_id + '.' + queue[msg.guild.id].currplaying.format.container, (err) => {
					if (err) throw err;
				});
			}
			queue[msg.guild.id].downloading = false;
		}
	},
	'queue': {
		usage: '',
		description: 'Shows the queue.',
		aliases: ['q'],
		command: (msg, tokens) => {
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
			if (queue[msg.guild.id].songs.length == 0) return msg.channel.send(`Add some songs to the queue first with ${tokens.prefix}play`);
			let tosend = [];
			var songs = 'songs';
			if (queue[msg.guild.id].songs.length == 1) songs = 'song';
			queue[msg.guild.id].songs.forEach((song, i) => {
				tosend.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}\u2063`);
			});
			msg.channel.send(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** ${songs} queued \n\`\`\`${tosend.join('\n')}\`\`\``, {
				split: {
					char: '\u2063',
					prepend: '```',
					append: '```'
				}
			});
		}
	},
	'shuffle': {
		usage: '',
		description: 'Shuffles the queue.',
		aliases: ['shuff'],
		command: (msg) => {
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
			if (queue[msg.guild.id].songs.length == 0) return msg.channel.send('Please add songs to the queue before shuffling.');
			var originalQueue = queue[msg.guild.id].songs;
        
			function shuffle(a) {
				var j, x, i;
				for (i = a.length - 1; i > 0; i--) {
					j = Math.floor(Math.random() * (i + 1));
					x = a[i];
					a[i] = a[j];
					a[j] = x;
				}
			}
			shuffle(queue[msg.guild.id].songs);
			if (queue[msg.guild.id].songs == originalQueue) shuffle(queue[msg.guild.id].songs);
			msg.channel.send('Shuffled queue.');
		}
	},
	'loopqueue': {
		usage: '',
		description: 'Loops the queue.',
		aliases: ['lq', 'loop'],
		command: (msg) => {
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
			if (!queue[msg.guild.id].hasOwnProperty('loop')) queue[msg.guild.id].loop = false;
			if (queue[msg.guild.id].loop == false) {
				queue[msg.guild.id].loop = true;
				msg.channel.send('Enabled queue loop.');
				return;
			}
			if (queue[msg.guild.id].loop == true) {
				queue[msg.guild.id].loop = false;
				msg.channel.send('Disabled queue loop.');
				return;
			}
		}
	}
};
