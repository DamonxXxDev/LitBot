const { Client } = require('discord.js');
var yt = require('ytdl-core');
var lodash = require('lodash');
var urlchk = require('valid-url');
const tokens = require('./.data/tokens.json');
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
let canPlayAutoplaylist = true;
const fs = require('fs');
//korjaa playn ignore autoplaylistiin lisäämisen jälkeen
function play(song, msg) {
    if (!canPlayAutoplaylist.hasOwnProperty(msg.guild.id)) canPlayAutoplaylist[msg.guild.id] = true;
    if (canPlayAutoplaylist[msg.guild.id] = false) {
        canPlayAutoplaylist[msg.guild.id] = true;
        return;
    }
    if (song === undefined) {
        return;
        queue[msg.guild.id].playing = false;
        playAutoPlaylist(msg);
    }
    dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, {audioonly: true}), {passes: tokens.passes});
    var minutes = Math.floor(song.length / 60);
    var seconds = song.length - minutes * 60;
    var finalTime = minutes + ':' + seconds;
    msg.channel.send({
        "embed": {
            "description": "**Playing: [" + song.title + "](" + song.url + ") from:  " + song.type + "**",
            "color": 123433,
            "thumbnail": {
                "url": 'https://img.youtube.com/vi/' + song.video_id + '/mqdefault.jpg'
            },
            "author": {
                "name": song.requester,
                "icon_url": song.avatarURL
            },
            "fields": [{
                    "name": "Channel",
                    "value": song.author,
                    "inline": true
                },
                {
                    "name": "Duration",
                    "value": finalTime,
                    "inline": true
                },
                {
                    "name": "Requester",
                    "value": song.requester,
                    "inline": true
                },
            ]
        }
    });
    console.log(`Playing: ${song.title} as requested by: ${song.requester} in guild: ${msg.guild.name}`);
    let collector = msg.channel.createCollector(m => m);
    collector.on('collect', m => {
        if (m.content.startsWith(tokens.prefix + 'pause')) {
            msg.channel.send('Paused.').then(() => {
                dispatcher.pause();
            });
        } else if (m.content.startsWith(tokens.prefix + 'resume')) {
            msg.channel.send('Resumed.').then(() => {
                dispatcher.resume();
            });
        } else if (m.content.startsWith(tokens.prefix + 'skip')) {
            var minutes = Math.floor(song.length / 60);
            var seconds = song.length - minutes * 60;
            var finalTime = minutes + ':' + seconds;
            msg.channel.send({
                "embed": {
                    "description": "**Skipped [" + song.title + "](" + song.url + ")**",
                    "color": 14335,
                    "thumbnail": {
                        "url": 'https://img.youtube.com/vi/' + song.video_id + '/mqdefault.jpg'
                    },
                    "author": {
                        "name": m.author.username,
                        "icon_url": m.author.avatarURL
                    },
                    "fields": [{
                            "name": "Channel",
                            "value": song.author,
                            "inline": true
                        },
                        {
                            "name": "Duration",
                            "value": finalTime,
                            "inline": true
                        },
                        {
                            "name": "Requester",
                            "value": song.requester,
                            "inline": true
                        }
                    ]
                }
            }).then(() => {
                dispatcher.end();
            });
        } else if (m.content.startsWith(tokens.prefix + 'volume+')) {
            if (Math.round(dispatcher.volume * 50) >= 100) return msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
            dispatcher.setVolume(Math.min((dispatcher.volume * 50 + (2 * (m.content.split('+').length - 1))) / 50, 2));
            msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
        } else if (m.content.startsWith(tokens.prefix + 'volume-')) {
            if (Math.round(dispatcher.volume * 50) <= 0) return msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
            dispatcher.setVolume(Math.max((dispatcher.volume * 50 - (2 * (m.content.split('-').length - 1))) / 50, 0));
            msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
        } else if (m.content.startsWith(tokens.prefix + 'np')) {
            var minutes = Math.floor(song.length_seconds / 60);
            var seconds = song.length_seconds - minutes * 60;
            var finalTime = minutes + ':' + seconds;
            m.channel.send({
                "embed": {
                    "description": "**Now Playing: [" + song.title + "](" + song.url + ") from: " + song.type + "**",
                    "color": 16073282,
                    "thumbnail": {
                        "url": 'https://img.youtube.com/vi/' + song.video_id + '/mqdefault.jpg'
                    },
                    "author": {
                        "name": m.author.username,
                        "icon_url": m.author.avatarURL
                    },
                    "fields": [{
                            "name": "Channel",
                            "value": song.author,
                            "inline": true
                        },
                        {
                            "name": "Duration",
                            "value": finalTime,
                            "inline": true
                        },
                        {
                            "name": "Playtime",
                            "value": `${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}/` + finalTime,
                            "inline": true
                        }
                    ]
                }
            });
        }
    });
    dispatcher.on('end', () => {
        collector.stop();
        if (queue[msg.guild.id].loop == true) {
            var songPush = queue[msg.guild.id].songs.shift();
            play(songPush, msg);
            if (!songPush == undefined) queue[msg.guild.id].songs.push(songPush);
        } else {
            play(queue[msg.guild.id].songs.shift(), msg);
        }
    });
    dispatcher.on('error', (err) => {
        return msg.channel.send('error: ' + err).then(() => {
            collector.stop();
            if (queue[msg.guild.id].loop == true) {
                var songPush = queue[msg.guild.id].songs.shift();
                play(songPush, msg);
                queue[msg.guild.id].songs.push(songPush);
            } else {
                play(queue[msg.guild.id].songs.shift(), msg);
            }
        });
    });
}

function playAutoPlaylist(msg) {
    if (!canPlayAutoplaylist.hasOwnProperty(msg.guild.id)) canPlayAutoplaylist[msg.guild.id] = true;
    if (canPlayAutoplaylist[msg.guild.id] = false) {
        canPlayAutoplaylist[msg.guild.id] = true;
        return;
    }
    if (!msg.guild.voiceConnection) return commands.join(msg).then(() => playAutoPlaylist(msg));
    fs.stat('./.data/', (err, stat) => {
        if (err == null) {
            fs.stat('./.data/autoPL_' + msg.guild.id + '.json', (err, stat) => {
                if (err == null) {
                    fs.readFile('./.data/autoPL_' + msg.guild.id + '.json', (err, data) => {
                        if (err) {
                            console.log('Error reading roleids from file: ' + err);
                        } else {
                            queue[msg.guild.id].autoplaylist = JSON.parse(data);

                            function getRandomInt(min, max) {
                                return Math.floor(Math.random() * (max - min + 1)) + min;
                            }
                            if (queue[msg.guild.id].autoplaylist.length == 0) {
                                msg.channel.send("No songs in autoplaylist. Leaving voice channel.");
                                queue[msg.guild.id].playing = false;
                                msg.member.voiceChannel.leave();
                                return;
                            }
                            playNumber = getRandomInt(0, queue[msg.guild.id].autoplaylist.length - 1);
                            console.log("PlayNumber: " + playNumber);
                            yt.getInfo(queue[msg.guild.id].autoplaylist[playNumber].url, (err, info) => {
                                if (err) {
                                    console.log("Invalid song in Autoplaylist: " + song.url + "in guild: " + msg.guild.name);
                                    msg.channel.send("Invalid song in Autoplaylist: " + song.url);
                                }
                                queue[msg.guild.id].songs.push({
                                    url: queue[msg.guild.id].autoplaylist[playNumber].url,
                                    title: info.title,
                                    requester: queue[msg.guild.id].autoplaylist[playNumber].requester,
                                    video_id: info.video_id,
                                    avatarURL: queue[msg.guild.id].autoplaylist[playNumber].avatarURL,
                                    length: info.length_seconds,
                                    author: info.author.name,
                                    type: "Autoplaylist"
                                });
                                play(queue[msg.guild.id].songs.shift(), msg);
                                queue[msg.guild.id].playing = true;
                            });
                        }
                    })
                } else if (err.code == 'ENOENT') {
                    // file does not exist
                    msg.channel.send("No songs in autoplaylist. Leaving voice channel.");
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

}
const commands = {
    'sus': (msg) => {

    },
  //TODO korjaa /
  //array not defined before autoplaylist.push
  //define msg.guild.id as a variable here
    'autoplaylist': (msg) => {
      if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [];
      var guildid = msg.guild.id;
          fs.stat('./.data/', (err, stat) => {
              if (err == null) {
                  fs.stat('./.data/autoPL_' + guildid + '.json', (err, stat) => {
                      if (err == null) {
                          fs.readFile('./.data/autoPL_' + guildid + '.json', (err, data) => {
                              if (err) {
                                  console.log('Error reading autoplaylist from file: ' + err);
                              } else {
                                  queue[msg.guild.id].autoplaylist = JSON.parse(data);
                              }
                          })
                      } else if (err.code == 'ENOENT') {
                          // file does not exist
                          queue[guildid].autoplaylist = [];
                      } else {
                          console.log('Error reading autoplaylist: ', err);
                          msg.channel.send('Error reading autoplaylist: ', err);
                          return;
                      }
                  });
              } else if (err.code == 'ENOENT') {
                  // .data does not exist
                  fs.mkdirSync('./.data/');
                  queue[guildid].autoplaylist = [];
              } else {
                  console.log('Error checking if ./.data/ exists: ', err);
                  msg.channel.send('Error checking if ./.data/ exists: ', err);
                  return;
              }
          });
          /*queue[msg.guild.id].autoplaylist.push({
              sus: sus
          });
          queue[msg.guild.id].autoplaylist.pop();*/
        if (!queue == {}) {
            console.log("json: " + JSON.stringify(queue[guildid].autoplaylist));
            msg.channel.send("No songs in autoplaylist.");
        } else {
            console.log("json: " + JSON.stringify(queue[guildid].autoplaylist));
            let tosend = [];
            var songs = "songs";
            if (queue[guildid].autoplaylist.length == 1) songs = "song";
            queue[guildid].autoplaylist.forEach((song, i) => {
                tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);
            });
            msg.channel.send(`__**${msg.guild.name}'s Autoplaylist:**__ Currently **${tosend.length}** ${songs} in autoplaylist \n\`\`\`${tosend.join('\n')}\`\`\``, {split: true});
        }
    },
    'autoplaylistadd': (msg) => {
        let url = msg.content.split(' ')[1];
        if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, search term, or id after ${tokens.prefix}autoplaylistadd`);
        if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [];
            fs.stat('./.data/', (err, stat) => {
                if (err == null) {
                    fs.stat('./.data/autoPL_' + msg.guild.id + '.json', (err, stat) => {
                        if (err == null) {
                            fs.readFile('./.data/autoPL_' + msg.guild.id + '.json', (err, data) => {
                                if (err) {
                                    console.log('Error reading autoplaylist from file: ' + err);
                                } else {
                                    queue[msg.guild.id].autoplaylist = JSON.parse(data);
                                }
                            })
                        } else if (err.code == 'ENOENT') {
                            // file does not exist
                            queue[msg.guild.id].autoplaylist = [];
                        } else {
                            console.log('Error reading autoplaylist: ', err);
                            msg.channel.send('Error reading autoplaylist: ', err);
                        }
                    });
                } else if (err.code == 'ENOENT') {
                    // .data does not exist
                    fs.mkdirSync('./.data/');
                    commands.autoplaylistadd(msg);
                } else {
                    console.log('Error checking if ./.data/ exists: ', err);
                    msg.channel.send('Error checking if ./.data/ exists: ', err);
                }
            });

        if (urlchk.isWebUri(url)) {
            yt.getInfo(url, (err, info) => {
                if (err) return msg.channel.send('Invalid YouTube Link: ' + err);
                let obj = queue[msg.guild.id].autoplaylist.find(o => o.url.toLowerCase() === url.toLowerCase());
                if (obj) return msg.channel.send("This song is already on the Autoplaylist.");
                requester = msg.author.username + "#" + msg.author.discriminator;
                queue[msg.guild.id].autoplaylist.push({
                    url: url,
                    title: info.title,
                    requester: requester,
                    video_id: info.video_id,
                    avatarURL: msg.author.avatarURL,
                    length: info.length_seconds,
                    author: info.author.name
                });
                console.log(JSON.stringify(queue[msg.guild.id].autoplaylist));
                fs.writeFile('./.data/autoPL_' + msg.guild.id + '.json', JSON.stringify(queue[msg.guild.id].autoplaylist), (err) => {
                    if (err) {
                        console.log("Error " + err + " saving autoplaylist to file in guild: " + m.guild.name);
                        msg.channel.send("Error " + err + " saving autoplaylist to file.");
                        return;
                    } else {
                        var minutes = Math.floor(info.length_seconds / 60);
                        var seconds = info.length_seconds - minutes * 60;
                        var finalTime = minutes + ':' + seconds;
                        var thumbUrl = 'https://img.youtube.com/vi/' + info.video_id + '/mqdefault.jpg';
                        msg.channel.send({
                            "embed": {
                                "description": "**Added song to autoplaylist: [" + info.title + "](" + url + ")**",
                                "color": 123433,
                                "thumbnail": {
                                    "url": thumbUrl
                                },
                                "author": {
                                    "name": msg.author.username,
                                    "icon_url": msg.author.avatarURL
                                },
                                "fields": [{
                                        "name": "Channel",
                                        "value": info.title,
                                        "inline": true
                                    },
                                    {
                                        "name": "Duration",
                                        "value": finalTime,
                                        "inline": true
                                    },
                                    {
                                        "name": "Songs in autoplaylist",
                                        "value": queue[msg.guild.id].autoplaylist.length,
                                        "inline": true
                                    }
                                ]
                            }
                        });
                    }
                });
            });
        } else {
            if (!canPlay.hasOwnProperty(msg.channel.id)) canPlay[msg.channel.id] = {}, canPlay[msg.channel.id].canPlay = true, canPlay[msg.channel.id].id = 0;
            if (canPlay[msg.channel.id].canPlay == false && !msg.author.id == canPlay[msg.channel.id].id) return msg.channel.send('Someone is choosing a song to play on this channel. Please wait 20 seconds and try again.');

            function isNumeric(n) {
                return !isNaN(parseFloat(n)) && isFinite(n);
            }
            var parts = msg.content.split(' ');
            parts.shift();
            var searchTerms = parts.join(' ');
            search(searchTerms, opts, function(err, results) {
                if (err) return console.log('Error searching youtube: ' + err);
                //console.dir(results);
                var tosend = ['**Select a song with the `' + tokens.prefix + 'play <song>` command, or cancel using the `' + tokens.prefix + 'cancel` command (Automatically cancels after 20 seconds.): **'];
                for (i = 0; i < results.length; i++) {
                    var lineNumber = i + 1;
                    tosend.push(lineNumber + ': ' + results[i].title);
                }
                msg.channel.send(tosend.join("\n"));
                let collector = msg.channel.createCollector(m => m);
                var timeout = setTimeout(function() {
                    msg.channel.send('Canceled playing song.');
                    collector.stop();
                }, 20000);
                canPlay[msg.channel.id].canPlay = false;
                canPlay[msg.channel.id].id = msg.author.id;
                collector.on('collect', m => {
                    if (!m.author.id == msg.author.id) return;
                    if (m.content.startsWith(tokens.prefix + 'play ')) {
                        var parts = m.content.split(' ');
                        parts.shift();
                        var number = parts.join(' ');
                        if (!isNumeric(number)) return;
                        if (!number < 6 && !number > 0) return;
                        var number = number - 1;
                        clearTimeout(timeout);
                        var url = results[number].link;
                        yt.getInfo(url, (err, info) => {
                            if (err) return m.channel.send("Error while adding song to autoplaylist: " + err);
                            let obj = queue[msg.guild.id].autoplaylist.find(o => o.url.toLowerCase() == url.toLowerCase());
                            if (obj) return msg.channel.send("This song is already on the Autoplaylist.");
                            requester = m.author.username + "#" + m.author.discriminator;
                            queue[msg.guild.id].autoplaylist.push({
                                url: url,
                                title: info.title,
                                requester: requester,
                                video_id: info.video_id,
                                avatarURL: m.author.avatarURL,
                                length: info.length_seconds,
                                author: info.author.name
                            });
                            fs.writeFile('./.data/autoPL_' + msg.guild.id + '.json', JSON.stringify(queue[msg.guild.id].autoplaylist), (err) => {
                                if (err) {
                                    console.log("Error " + err + " saving autoplaylist to file in guild: " + m.guild.name);
                                    m.channel.send("Error " + err + " saving autoplaylist to file.");
                                    return;
                                } else {
                                    var minutes = Math.floor(info.length_seconds / 60);
                                    var seconds = info.length_seconds - minutes * 60;
                                    var finalTime = minutes + ':' + seconds;
                                    m.channel.send({
                                        "embed": {
                                            "description": "**Added song to autoplaylist: [" + info.title + "](" + url + ")**",
                                            "color": 123433,
                                            "thumbnail": {
                                                "url": results[number].thumbnails.high.url
                                            },
                                            "author": {
                                                "name": m.author.username,
                                                "icon_url": m.author.avatarURL
                                            },
                                            "fields": [{
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
                                                    "name": "Songs in autoplaylist",
                                                    "value": queue[m.guild.id].autoplaylist.length,
                                                    "inline": true
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
    },
    'play': (msg) => {
        if (!canPlay.hasOwnProperty(msg.channel.id)) canPlay[msg.channel.id] = {}, canPlay[msg.channel.id].canPlay = true, canPlay[msg.channel.id].id = 0;
        if (canPlay[msg.channel.id].canPlay == false && !msg.author.id == canPlay[msg.channel.id].id) return msg.channel.send('Someone is choosing a song to play on this channel. Please wait 20 seconds and try again.');
        if (canPlay[msg.channel.id].canPlay == false) return;
        if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
        if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
        let url = msg.content.split(' ')[1];
        if (urlchk.isWebUri(url)) {
            if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, search term, or id after ${tokens.prefix}play`);
            yt.getInfo(url, (err, info) => {
                if (err) return msg.channel.send('Invalid YouTube Link: ' + err);
                requester = msg.author.username + "#" + msg.author.discriminator;
                queue[msg.guild.id].songs.push({
                    url: url,
                    title: info.title,
                    requester: requester,
                    video_id: info.video_id,
                    avatarURL: msg.author.avatarURL,
                    length: info.length_seconds,
                    author: info.author.name,
                    type: "Queue"
                });
                if (queue[msg.guild.id].playing == true) {
                    var minutes = Math.floor(info.length_seconds / 60);
                    var seconds = info.length_seconds - minutes * 60;
                    var finalTime = minutes + ':' + seconds;
                    var thumbUrl = 'https://img.youtube.com/vi/' + info.video_id + '/mqdefault.jpg';
                    msg.channel.send({
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
                            "fields": [{
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
                                    "value": queue[msg.guild.id].songs.length,
                                    "inline": true
                                }
                            ]
                        }
                    })
                } else {
                    let dispatcher;
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
            function isNumeric(n) {
                return !isNaN(parseFloat(n)) && isFinite(n);
            }
            var parts = msg.content.split(' ');
            parts.shift();
            var searchTerms = parts.join(' ');
            search(searchTerms, opts, function(err, results) {
                if (err) return console.log('Error searching youtube: ' + err);
                //console.dir(results);
                var tosend = ['**Select a song with the `' + tokens.prefix + 'play (song)` command, or cancel using the `' + tokens.prefix + 'cancel` command (Automatically cancels after 20 seconds.): **'];
                for (i = 0; i < results.length; i++) {
                    var lineNumber = i + 1;
                    tosend.push(lineNumber + ': ' + results[i].title);
                }
                msg.channel.send(tosend.join("\n"));
                let collector = msg.channel.createCollector(m => m);
                var timeout = setTimeout(function() {
                    msg.channel.send('Canceled playing song.');
                    collector.stop();
                }, 20000);
                canPlay[msg.channel.id].canPlay = false;
                canPlay[msg.channel.id].id = msg.author.id;
                collector.on('collect', m => {
                    //console.log(client.voiceConnections);
                    if (!client.voiceConnections.has(m.guild.id)) {
                        clearTimeout(timeout);
                        m.channel.send("Canceled search.");
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
                        var number = number - 1;
                        clearTimeout(timeout);
                        var url = results[number].link;
                        yt.getInfo(url, (err, info) => {
                            if (err) {
                                msg.channel.send('Error playing song: `' + err + '`');
                                collector.stop();
                                clearTimeout(timeout);
                                return;
                            }
                            requester = msg.author.username + "#" + msg.author.discriminator;
                            queue[msg.guild.id].songs.push({
                                url: url,
                                title: info.title,
                                requester: requester,
                                video_id: info.video_id,
                                avatarURL: msg.author.avatarURL,
                                length: info.length_seconds,
                                author: info.author.name,
                                type: "Queue"
                            });
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
                                        "fields": [{
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
                                });
                                collector.stop();
                                canPlay[msg.channel.id].canPlay = true;
                                delete canPlay[msg.channel.id].id;
                            } else {
                                let dispatcher;
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
        //console.log(queue);

    },
    'join': (msg) => {
        return new Promise((resolve, reject) => {
            const voiceChannel = msg.member.voiceChannel;
            if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t connect to your voice channel...');
            voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
        });
    },
    'disconnect': (msg) => {
        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t disconnect from your voice channel...');
        queue[msg.guild.id].songs = [];
        queue[msg.guild.id].playing = false;
        voiceChannel.leave();
        canPlayAutoplaylist[msg.guild.id] = false;
        setTimeout(function() {
            canPlayAutoplaylist[msg.guild.id] = true
        }, 0200);
    },
    'queue': (msg) => {
        if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
        if (queue[msg.guild.id].songs.length == 0) return msg.channel.send(`Add some songs to the queue first with ${tokens.prefix}play`);
        let tosend = [];
        var songs = "songs";
        if (queue[msg.guild.id].songs.length == 1) songs = "song";
        queue[msg.guild.id].songs.forEach((song, i) => {
            tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);
        });
        msg.channel.send(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** ${songs} queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
    },
    'shuffle': (msg) => {
        if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
        if (queue[msg.guild.id].songs.length == 0) return msg.channel.send("Please add songs to the queue before shuffling.")
        originalQueue = queue[msg.guild.id].songs;

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
        msg.channel.send("Shuffled queue.");
    },
    'loopqueue': (msg) => {
        if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
        if (!queue[msg.guild.id].hasOwnProperty("loop")) queue[msg.guild.id].loop = false;
        if (queue[msg.guild.id].loop == false) {
            queue[msg.guild.id].loop = true;
            msg.channel.send("Enabled queue loop.");
            return;
        }
        if (queue[msg.guild.id].loop == true) {
            queue[msg.guild.id].loop = false;
            msg.channel.send("Disabled queue loop.");
            return;
        }
    },
    'help': (msg) => {
        let tosend = ['```xl', tokens.prefix + 'join: "Join voice channel of message sender."', tokens.prefix + 'queue: "Shows the current queue, up to 15 songs shown."', tokens.prefix + 'play: "Play a song. Enter search terms or link after this command. "', 'Bot Controller commands:', tokens.prefix + 'addcommand: "Adds a custom command, example: ' + tokens.prefix + 'addcommand (command here) (response here)"', tokens.prefix + 'removecommand: "Removes a custom command, example: ' + tokens.prefix + '(command)"', tokens.prefix + "shuffle: Shuffles queue.", tokens.prefix + "loopqueue: Puts queue on loop.", 'the following commands only function while the play command is running:'.toUpperCase(), tokens.prefix + 'pause: "Pauses the music."', tokens.prefix + 'resume: "Resumes the music."', tokens.prefix + 'skip: "Skips the playing song."', tokens.prefix + 'time: "Shows the playtime of the song."', 'volume+(+++): "Increases volume by 2%."', 'volume-(---): "Decreases volume by 2%."', '```'];
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
        for (var i = 0; i < roleids.length; i++) {
            if (roleids[i].guildid == msg.guild.id) {
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
                            customcmds[msg.guild.id].cmds.push({
                                command: command,
                                response: response,
                                creator: msg.author.username + '#' + msg.author.discriminator
                            });
                            msg.channel.send('Added command: **' + args[1] + '** with response: **' + args[3] + '** by: **' + msg.author.username + '#' + msg.author.discriminator + '**');
                            fs.writeFile("./.data/cmds_" + msg.guild.id + '.json', JSON.stringify(customcmds[msg.guild.id].cmds), "utf8", (err) => {
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
            }
        }
    },
    'customcommands': (msg) => {
        if (customcmds[msg.guild.id].cmds.length == 0) return msg.channel.send(`Add some custom commands first with ${tokens.prefix}addcommand`);
        let tosend = [];
        customcmds[msg.guild.id].cmds.forEach((cmd, i) => {
            tosend.push(`${i+1}. Command: ${cmd.command} Response: ${cmd.response} - Created by: ${cmd.creator}`);
        });
        msg.channel.send(`${msg.guild.name}'s Custom Commands: \n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
    },
    'removecommand': (msg) => {
        for (var i = 0; i < roleids.length; i++) {
            if (roleids[i].guildid == msg.guild.id) {
                if (msg.member.roles.has(roleids[i].roleid)) {
                    var splitcommand = msg.content.split('"')[1];
                    for (var i = 0; i < customcmds[msg.guild.id].cmds.length; i++) {
                        if (customcmds[msg.guild.id].cmds[i].command == splitcommand) {
                            msg.channel.send('Removed command: **' + customcmds[msg.guild.id].cmds[i].command + '** with response: **' + customcmds[msg.guild.id].cmds[i].response + '** created by: **' + customcmds[msg.guild.id].cmds[i].creator + '**')
                            customcmds[msg.guild.id].cmds.splice(i, 1);
                            fs.writeFile("./.data/cmds_" + msg.guild.id + '.json', JSON.stringify(customcmds[msg.guild.id].cmds), "utf8", (err) => {
                                if (err) console.log('Error saving commands to file: ' + err);
                            });
                            break;
                        }
                    }
                } else {
                    msg.channel.send("Couldn't add command, because you're not in the Bot Controller role.");
                }
            }
        }
    }
};
client.on('ready', () => {
    console.log('ready!');
    fs.stat('./.data/', (err, stat) => {
        if (err == null) {
            fs.stat('./.data/roleids.json', (err, stat) => {
                if (err == null) {
                    fs.readFile("./.data/roleids.json", (err, data) => {
                        if (err) {
                            console.log('Error reading roleids from file: ' + err);
                        } else {
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
        }
    });
});

client.on('guildCreate', function(guild) {
    console.log(defaultChannel);
    guild.channels.first().send("Thanks for adding me to this server! \nAdd everyone you want to be able to add commands for the bot to the Bot Controller role. Don't remove the bot controller role, or anyone can not add commands or remove them. \nUse " + tokens.prefix + "help to view the commands.");
    guild.createRole({
            name: "LitBot Controller",
            color: "BLUE"
        })
        .then(role => writeRolesToFile(role))
        .catch(console.error);

    function writeRolesToFile(role) {
        roleids.push({
            guildid: guild.id,
            roleid: role.id
        })
        console.log('Bot added to guild ' + guild.name);
        fs.writeFile("./.data/roleids.json", JSON.stringify(roleids), "utf8", (err) => {
            if (err) console.log('Error saving admin role to file: ' + err);
        });
    }
});
client.on('guildDelete', function(guild) {
    console.log('Removed from guild: ' + guild.name);
    for (var i = 0; i < roleids.length; i++) {
        if (roleids[i].guildid == guild.id) {
            roleids.splice(i, 1);
            fs.writeFile("./.data/roleids.json", JSON.stringify(roleids), "utf8", (err) => {
                if (err) console.log('Error saving admin role to file: ' + err);
            });
        }
    }
});
client.on('message', msg => {
    if (msg.channel.type == "dm" || msg.channel.type == "group") return;
    if (!customcmds.hasOwnProperty(msg.guild.id)) {
        customcmds[msg.guild.id] = {};
        fs.stat('./.data/cmds_' + msg.guild.id + '.json', (err, stat) => {
            if (err == null) {
                fs.readFile("./.data/cmds_" + msg.guild.id + '.json', (err, data) => {
                    if (err) {
                        console.log('Error reading custom commands from file: ' + err);
                        customcmds[msg.guild.id].cmds = [];
                        message();
                    } else {
                        customcmds[msg.guild.id].cmds = JSON.parse(data);
                        message();
                    }
                });
            } else if (err.code == 'ENOENT') {
                // file does not exist
                customcmds[msg.guild.id].cmds = [];
                message();
            } else {
                console.log('Error reading custom commands: ', err.code);
                customcmds[msg.guild.id].cmds = [];
                message();
            }
        });
    } else {
        message();
    }

    function message() {
        let obj = customcmds[msg.guild.id].cmds.find(o => o.command === msg.content.toLowerCase());
        if (obj) msg.channel.send(obj.response);
        if (!msg.content.startsWith(tokens.prefix)) return;
        if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
    }
});

client.login(tokens.d_token).catch(console.error);
process.on('unhandledRejection', err => console.error(`Uncaught Promise Error: \n${err.stack}`));
