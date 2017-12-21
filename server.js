const { Client } = require('discord.js');
var yt = require('ytdl-core');
var lodash = require('lodash');
var urlchk = require('valid-url');
const tokens = require('./.data/tokens.json');
const client = new Client();
var search = require('youtube-search');
var request = require('request');
var cheerio = require('cheerio');

var opts = {
    maxResults: 5,
    key: tokens.yt_api_key
};
let queue = {};
let weatherdata = {};
let customcmds = {};
let roleids = 0;
let canPlay = {};
let nowPlaying = [];
var saleDataArray = {};
let canPlayAutoplaylist = {};
const fs = require('fs');
function play(song, msg) {
    if (!canPlayAutoplaylist.hasOwnProperty(msg.guild.id)) {canPlayAutoplaylist[msg.guild.id] = {}; canPlayAutoplaylist[msg.guild.id].canPlay = true; console.log("sus");}
    if (canPlayAutoplaylist[msg.guild.id].canPlay == false) {
        canPlayAutoplaylist[msg.guild.id].canPlay = true;
        return;
    }
    if (song === undefined) {
      queue[msg.guild.id].playing = false;
      playAutoPlaylist(msg);
      return;
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
            var minutes = Math.floor(song.length / 60);
            var seconds = song.length - minutes * 60;
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
        return msg.channel.send('Error while playing: ' + err).then(() => {
            console.log(err);
            collector.stop();
        });
    });
}
function join(msg){
  return new Promise((resolve, reject) => {
      const voiceChannel = msg.member.voiceChannel;
      if (!voiceChannel || voiceChannel.type !== 'voice') return msg.channel.send('I couldn\'t connect to your voice channel...');
      voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
  })
}
function playAutoPlaylist(msg) {
    if (!canPlayAutoplaylist.hasOwnProperty(msg.guild.id)) {canPlayAutoplaylist[msg.guild.id] = {}; canPlayAutoplaylist[msg.guild.id].canPlay = true;}
    if (canPlayAutoplaylist[msg.guild.id].canPlay == false) {
        canPlayAutoplaylist[msg.guild.id].canPlay = true;
        return;
    }
    if (!msg.guild.voiceConnection) return join(msg).then(() => playAutoPlaylist(msg));
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
function getAPL(msg){
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
const commands = {
  //TODO autoplaylistremove, check permissions every command, same guild files in 1 file, change prefix by guild
    'autoplaylist': (msg) => {
      var times = 0;
      next();
      times = times + 1;
      function next(){
      getAPL(msg);
      if (queue[msg.guild.id].autoplaylist == undefined){
        if (times > 30){
          //if getting autoplaylist fails over 30 times return
          //timeout because getAPL function is async
          msg.channel.send("Error getting autoplaylist. Try again later.");
          console.log("Error getting autoplaylist.");
          return;
        }
        setTimeout(next,0010);
        return;
      }
      if (!queue == {}) {
          msg.channel.send("No songs in autoplaylist.");
      } else {
          let tosend = [];
          var songs = "songs";
          if (queue[msg.guild.id].autoplaylist.length == 1) songs = "song";
          queue[msg.guild.id].autoplaylist.forEach((song, i) => {
              tosend.push(`${i+1}. ${song.title} \n   Requested by: ${song.requester} \n   URL: ${song.url}`);
          });
          msg.channel.send(`__**${msg.guild.name}'s Autoplaylist:**__ Currently **${tosend.length}** ${songs} in autoplaylist \n\`\`\`${tosend.join('\n')}\`\`\``, {split: true});
      }
    }
    },
    'autoplaylistremove': (msg) => {
      //check if user has Bot Controller role
      for (var i = 0; i < roleids.length; i++) {
          if (roleids[i].guildid == msg.guild.id) {
              if (msg.member.roles.has(roleids[i].roleid)) {
                next();
                function next(){
                  //read autoplaylist file
                  getAPL(msg);
                  var times = 0;
                  var times = times + 1;
                  if (queue[msg.guild.id].autoplaylist == undefined){
                    if (times > 30) {
                    console.log("Couldn't get autoplaylist for guild: " + msg.guild.name);
                    msg.channel.send("Error getting autoplaylist. Try again later.");
                    }
                    setTimeout(next,0005);
                    return;
                  }
                  let url = msg.content.split(' ')[1];
                  if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, search term, or id after ${tokens.prefix}autoplaylistremove`);
                  if (urlchk.isWebUri(url)) {
                      yt.getInfo(url, (err, info) => {
                          if (err) return msg.channel.send('Invalid YouTube Link: ' + err);
                          let obj = queue[msg.guild.id].autoplaylist.find(o => o.url.toLowerCase() === url.toLowerCase());
                          if(obj){
                          requester = msg.author.username + "#" + msg.author.discriminator;
                          queue[msg.guild.id].autoplaylist.splice(queue[msg.guild.id].autoplaylist.findIndex(o => o.url.toLowerCase() === url.toLowerCase()),1);
                          //convert time into minutes and seconds
                          var minutes = Math.floor(info.length_seconds / 60);
                          var seconds = info.length_seconds - minutes * 60;
                          var finalTime = minutes + ':' + seconds;
                          //get thumbnail url for embed
                          var thumbUrl = 'https://img.youtube.com/vi/' + info.video_id + '/mqdefault.jpg';
                          //send embed message
                          msg.channel.send({
                              "embed": {
                                  "description": "**Removed from autoplaylist: [" + info.title + "](" + url + ")**",
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
                          fs.writeFile('./.data/autoPL_' + msg.guild.id + '.json', JSON.stringify(queue[msg.guild.id].autoplaylist, null, '\t'), (err) => {
                              if (err) {
                                  console.log("Error " + err + " saving autoplaylist to file in guild: " + m.guild.name);
                                  msg.channel.send("Error " + err + " saving autoplaylist to file.");
                                  return;
                              } else {
                              }
                          });
                        }
                      });
                  }else{
                    msg.channel.send("Removing by name is not yet supported. Please send the link to the video. You can get all songs in the autoplaylist with the command " + tokens.prefix + "autoplaylist.");
                  }
                }
              }else{
                msg.channel.send("Could not remove from autoplaylist, because you are not in the LitBot controller role.");
              }
            }
          }
    },
    'aplremove': (msg) => {
      commands.autoplaylistremove(msg);
    },
    'apladd': (msg) => {
      commands.autoplaylistadd(msg);
    },
    'apl': (msg) => {
      commands.autoplaylist(msg);
    },
    'autoplaylistadd': (msg) => {
      for (var i = 0; i < roleids.length; i++) {
          if (roleids[i].guildid == msg.guild.id) {
              if (msg.member.roles.has(roleids[i].roleid)) {
        let url = msg.content.split(' ')[1];
        if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, search term, or id after ${tokens.prefix}autoplaylistadd`);
        getAPL(msg);
        if (urlchk.isWebUri(url)) {
            yt.getInfo(url, (err, info) => {
                if (err) return msg.channel.send('Invalid YouTube Link: ' + err);
                var obj = queue[msg.guild.id].autoplaylist.find(o => o.url.toLowerCase() === url.toLowerCase());
                if (obj) return msg.channel.send("This song is already on the Autoplaylist.");
                requester = msg.author.username + "#" + msg.author.discriminator;
                //push to autoplaylist array
                queue[msg.guild.id].autoplaylist.push({
                    url: url,
                    title: info.title,
                    requester: requester,
                    video_id: info.video_id,
                    avatarURL: msg.author.avatarURL,
                    length: info.length_seconds,
                    author: info.author.name
                });
                //save autoplaylist array to file
                fs.writeFile('./.data/autoPL_' + msg.guild.id + '.json', JSON.stringify(queue[msg.guild.id].autoplaylist, null, '\t'), (err) => {
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
            if (!canPlay.hasOwnProperty(msg.channel.id)) canPlay[msg.channel.id] = {}, canPlay[msg.channel.id].canPlay = true, canPlay[msg.channel.id].id = 0, canPlay[msg.channel.id].reason = "undefined";
            if (canPlay[msg.channel.id].canPlay == false && !msg.author.id == canPlay[msg.channel.id].id) return msg.channel.send(reason);

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
                canPlay[msg.channel.id].reason = "Someone is already choosing a song on this channel.";
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
                        var url = results[number].link;
                        yt.getInfo(url, (err, info) => {
                            if (err) return m.channel.send("Error while adding song to autoplaylist: " + err);
                            let obj = queue[msg.guild.id].autoplaylist.find(o => o.url.toLowerCase() == url.toLowerCase());
                            if (obj) {
                              msg.channel.send("This song is already on the Autoplaylist.")
                              return;
                            }
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
                            fs.writeFile('./.data/autoPL_' + msg.guild.id + '.json', JSON.stringify(queue[msg.guild.id].autoplaylist, null, '\t'), (err) => {
                                if (err) {
                                    console.log("Error " + err + " saving autoplaylist to file in guild: " + m.guild.name);
                                    m.channel.send("Error " + err + " saving autoplaylist to file.");
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
          }else{
        msg.channel.send("Could not add to autoplaylist, because you aren't in the LitBot controller role.");
        }
      }
    }
    },
    'play': (msg) => {
        if (!canPlay.hasOwnProperty(msg.channel.id)) canPlay[msg.channel.id] = {}, canPlay[msg.channel.id].canPlay = true, canPlay[msg.channel.id].id = 0, canPlay[msg.channel.id].reason = "undefined";
        if (canPlay[msg.channel.id].canPlay == false && !msg.author.id == canPlay[msg.channel.id].id) return msg.channel.send(reason);
        if (canPlay[msg.channel.id].canPlay == false) return;
        if (!msg.guild.voiceConnection) return join(msg).then(() => commands.play(msg));
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
                canPlay[msg.channel.id].reason = "Someone is already choosing a song on thic channel.";
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
      join(msg);
    },
    'playautoplaylist': (msg) => {
      msg.channel.send("Playing Autoplaylist..");
      if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
      playAutoPlaylist(msg);
    },
    'disconnect': (msg) => {
      for (var i = 0; i < roleids.length; i++) {
          if (roleids[i].guildid == msg.guild.id) {
              if (msg.member.roles.has(roleids[i].roleid)) {
                const voiceChannel = msg.member.voiceChannel;
                if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t disconnect from your voice channel...');
                if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].loop = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].autoplaylist = [];
                canPlayAutoplaylist[msg.guild.id].canPlay = false;
                queue[msg.guild.id].songs = [];
                queue[msg.guild.id].playing = false;
                voiceChannel.leave();
              }else{
                msg.channel.send("Could not disconnect, because you aren't in the LitBot Controller role.")
              }
            }
          }
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
        let tosend = ['```xl', tokens.prefix + 'weather <city>: "Get weather in city."', tokens.prefix + 'steam sale: "Shows the next Steam sale."' , tokens.prefix + 'join: "Join voice channel of message sender."', tokens.prefix + 'queue: "Shows the current queue, up to 15 songs shown."', tokens.prefix + 'play: "Play a song. Enter search terms or link after this command. "', tokens.prefix + 'autoplaylist: "Show songs in autoplaylist. "', 'Bot Controller commands:', tokens.prefix + 'autoplaylistadd, apladd <song>: "Add a song to the autoplaylist. Enter search terms or youtube url after this command. "',tokens.prefix + 'autoplaylistremove, aplremove <url>: "Remove a song from autoplaylist. Enter URL after this command. You can see the URLs of the songs in the autoplaylist with ' + tokens.prefix + 'autoplaylist."', tokens.prefix + 'addcommand <"command"> <"response">: "Adds a custom command. Enter command in quotes."', tokens.prefix + 'removecommand <"command">: "Removes a custom command. Enter command in quotes."', tokens.prefix + 'shuffle: "Shuffles queue."', tokens.prefix + 'loopqueue: "Puts queue on loop."', 'the following commands only function while the play command is running:'.toUpperCase(), tokens.prefix + 'pause: "Pauses the music."', tokens.prefix + 'resume: "Resumes the music."', tokens.prefix + 'skip: "Skips the playing song."', tokens.prefix + 'time: "Shows the playtime of the song."', 'volume+(+++): "Increases volume by 2%."', 'volume-(---): "Decreases volume by 2%."', '```'];
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
                        if (m.content == 'yes' && m.author.id == msg.author.id) {
                            console.log('Added command: ' + command + ' with response: ' + response + ' by: ' + msg.author.username + '#' + msg.author.discriminator + ' in guild: ' + msg.guild.name);
                            customcmds[msg.guild.id].cmds.push({
                                command: command,
                                response: response,
                                creator: msg.author.username + '#' + msg.author.discriminator
                            });
                            msg.channel.send('Added command: **' + args[1] + '** with response: **' + args[3] + '** by: **' + msg.author.username + '#' + msg.author.discriminator + '**');
                            fs.writeFile("./.data/cmds_" + msg.guild.id + '.json', JSON.stringify(customcmds[msg.guild.id].cmds, null, '\t'), "utf8", (err) => {
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
                            fs.writeFile("./.data/cmds_" + msg.guild.id + '.json', JSON.stringify(customcmds[msg.guild.id].cmds, null, '\t'), "utf8", (err) => {
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
    },
    'steam': (msg) => {
      var args = msg.content.split(' ');
        if(args[1] == "sale"){
          var today = new Date();
          if (!saleDataArray.hasOwnProperty("time")){
          saleDataArray.time = 0;
          }
          var diff = today.getTime() - saleDataArray.time;
          if(diff > 3600000){
          request("https://www.whenisthenextsteamsale.com/", function(error, response, body) {
            if(error) {
              console.log("Error: " + error);
              msg.channel.send("Error getting sale info.");
              return;
            	}
              var $ = cheerio.load(body);
              if($('#form1').serializeArray()[3] == undefined){
                msg.channel.send("Error reading sale info. Site has probably changed.");
                console.log("Error reading sale info. Site has probably changed.");
                return;
              }
              var saleData = JSON.stringify($('#form1').serializeArray()[3].value);
              var saleDataLC = saleData.replace(/"([^"]+)":/g,function($0,$1){return ('"'+$1.toLowerCase()+'":');});
              //saleDataLC = saleDataLC.replace("length","salelength");
              saleDataArray = JSON.parse(saleDataLC);
              saleDataArray = JSON.parse(saleDataArray);
              saleDataArray.time = today.getTime();
              sale();
              })
              }else{
                sale();
              }
              function sale(){
              var confirmed;
              if (saleDataArray.isconfirmed == true)
              {
                confirmed = "Yes";
              }else{
                confirmed = "No";
              }
              var saleStartDate = new Date(Date.parse(saleDataArray.startdate));

              var saleStartHour;
              if (saleStartDate.getHours() > -1 && saleStartDate.getHours() < 10)
              {
                saleStartHour = "0" + saleStartDate.getHours().toString();
              }else{
                saleStartHour = saleStartDate.getHours().toString();
              }
              var saleStartMin;
              if (saleStartDate.getMinutes() > -1 && saleStartDate.getMinutes() < 10)
              {
                saleStartMin = "0" + saleStartDate.getMinutes().toString();
              }else{
                saleStartMin = saleStartDate.getMinutes().toString();
              }
              var saleEndDate = new Date(Date.parse(saleDataArray.enddate));

              var saleEndHour;
              if (saleEndDate.getHours() > -1 && saleEndDate.getHours() < 10)
              {
                saleEndHour = "0" + saleEndDate.getHours().toString();
              }else{
                saleEndHour = saleEndDate.getHours().toString();
              }
              var saleEndMin;
              if (saleEndDate.getMinutes() > -1 && saleEndDate.getMinutes() < 10)
              {
                saleEndMin = "0" + saleEndDate.getMinutes().toString();
              }else{
                saleEndMin = saleEndDate.getMinutes().toString();
              }

              msg.channel.send({
                "embed": {
                  "description": "**Next [Steam](http://store.steampowered.com/) sale: " + saleDataArray.name + "**",
                  "color": 123433,
                  "footer": {
                    "text": "Times in UTC/GMT. Source: https://www.whenisthenextsteamsale.com/"
                  },
                  "author": {
                    "name": msg.author.username,
                    "icon_url": msg.author.avatarURL
                  },
                  "fields": [
                    {
                      "name": "Sale Date Confirmed",
                      "value": confirmed,
                      "inline": true
                    },
                    {
                      "name": "Start Date",
                      "value": saleStartDate.toDateString() + " " + saleStartHour + ":" + saleStartMin,
                      "inline": true
                    },
                    {
                      "name": "End Date",
                      "value": saleEndDate.toDateString() + " " + saleEndHour + ":" + saleEndMin,
                      "inline": true
                    }
                  ]
                }
              }
            )
          }
    }
  },
  'weather': (msg) => {
    var args = msg.content.split(' ');
    args.splice(0,1);
    if (args[0] == undefined){
    msg.channel.send("Argument city missing.");
    return;
    }
    var today = new Date();
    var arg0 = args[0].toLowerCase();
    if (!weatherdata.hasOwnProperty(arg0)){
    weatherdata[arg0] = {};
    weatherdata[arg0].time = 0;
    weatherdata[arg0].data = {};
    }
    var diff = today.getTime() - weatherdata[arg0].time;
    if (diff > 600000) {
    request("http://api.openweathermap.org/data/2.5/weather?q=" + args[0] + "&type=like&lang=en&cnt=1&APPID=" + tokens.weatherkey, function(error, response, body) {
      if(error) {
        console.log("Error: " + error);
        msg.channel.send("Error getting weather info.");
        return;
        }
        var obj = JSON.parse(body);
        if(obj.message == "city not found"){
          msg.channel.send("City not found.");
          return;
        }
        if (!obj.cod == 200)
        {
          msg.channel.send("Error getting weather data.");
          return;
        }
        weatherdata[arg0].time = today.getTime();
        weatherdata[arg0].data = obj;
        send(obj);
      });
    }else{
      send(weatherdata[arg0].data);
    }
      function send (obj) {
        var tosend = [];
        var currentdate = new Date();
        msg.channel.send({
          "embed": {
            "description": "**Weather for: [" + obj.name + ", " + obj.sys.country + "](https://openweathermap.org/city/" + obj.sys.id + ")**",
            "color": 16073282,
            "thumbnail": {
              "url": 'http://openweathermap.org/img/w/' + obj.weather[0].icon + ".png"
            },
            "author": {
              "name": msg.author.username,
              "icon_url": msg.author.avatarURL
            },
            "fields": [
              {
                "name": "Weather condition",
                "value": capitalizeFirstLetter(obj.weather[0].description),
                "inline": true
              },
              {
                "name": "Temperature",
                "value": Math.round(obj.main.temp - 273.15) + " °C",
                "inline": true
              },
              {
                "name": "Humidity",
                "value": obj.main.humidity + "%",
                "inline": true
              },
              {
                "name": "Wind",
                "value": "Speed: " + obj.wind.speed + " m/s " + "Degrees: " + obj.wind.deg + "°",
                "inline": true
              },
              {
                "name": "Cloudiness",
                "value": obj.clouds.all + "%",
                "inline": true
              }
            ]
          }
        });
      }
  },
  'ping': (msg) => {
    msg.channel.send("Ping?")
    .then(m => m.edit(`Pong! Latency is ${m.createdTimestamp - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`));
  }
};
function getRoleIds(){
  fs.stat('./.data/', (err, stat) => {
      if (err == null) {
          fs.stat('./.data/roleids.json', (err, stat) => {
              if (err == null) {
                  var rf = fs.readFile("./.data/roleids.json", (err, data) => {
                      if (err) {
                          console.log('Error reading roleids from file: ' + err);
                      } else {
                          roleids = JSON.parse(data);
                      }
                  })
              } else if (err.code == 'ENOENT') {
                fs.writeFile("./.data/roleids.json", "[]", "utf8", (err) => {
                    if (err) console.log('Error saving admin role to file: ' + err);
                });
                getRoleIds();
              } else {
                  console.log('Error reading roleids file: ', err.code);
              }
          });
      } else if (err.code == 'ENOENT') {
          // file does not exist
          fs.mkdirSync('./.data/');
          getRoleIds();
      } else {
          console.log('Error checking if ./.data/ exists: ', err.code);
      }
  });
}

function checkRoleIds(){
  //var startts = new Date().getTime();
  getRoleIds();
  var tried = 0;
  //timeout because getRoleIds is async
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
  var guildArray = guilds.array();
  //check if bot has been added to guild while offline
  for (var i = 0; i < guildArray.length; i++){
    function check(id) {
    return id.guildid == guildArray[i].id;
    }
    if (roleids.find(check) == undefined){
      if (guildArray[i].roles.find("name", "LitBot Controller")){
        writeRolesToFile(guildArray[i].roles.find("name", "LitBot Controller"));
        console.log("Wrote roleid for guild " + guildArray[i].name + " to file.");
        guildArray[i].owner.send("Thanks for adding me to this server! \nAdd everyone you want to be able to add commands for the bot to the LitBot Controller role. Don't remove the bot controller role, or anyone can not add commands or remove them. \nUse " + tokens.prefix + "help to view the commands.");
      }else{
        console.log("Added to guild: " + guildArray[i].name);
        guildArray[i].owner.send("Thanks for adding me to this server! \nAdd everyone you want to be able to add commands for the bot to the LitBot Controller role. Don't remove the bot controller role, or anyone can not add commands or remove them. \nUse " + tokens.prefix + "help to view the commands.");
        guildArray[i].createRole({
                name: "LitBot Controller",
                color: "BLUE"
            })
            .catch(function(reason){
            console.log("Removed from guild: " + guild.name + " because the bot didn't have the Manage Roles permission.");
            guildArray[i].owner.send("Couldn't create Bot Controller role. Please reinvite the bot to the server with the permission Manage Roles. You can remove the permission after inviting.")
            .then(function(){
            guildArray[i].leave();
            });
            })
            .then(role => writeRolesToFile(role));
      }
    }
  }
  /*var endts = new Date().getTime();
  var took = endts - startts;
  console.log("Took " + took + "ms");*/
}, 0030);
}
client.on('ready', () => {
    console.log('ready!');
    getRoleIds();
    checkRoleIds();
});

client.on('guildCreate', function(guild) {
    console.log('Bot added to guild ' + guild.name);
    guild.owner.send("Thanks for adding me to this server! \nAdd everyone you want to be able to add commands for the bot to the LitBot Controller role. Don't remove the bot controller role, or anyone can not add commands or remove them. \nUse " + tokens.prefix + "help to view the commands.");
    guild.createRole({
            name: "LitBot Controller",
            color: "BLUE"
        })
        .catch(function(reason){
        console.log("Removed from guild: " + guild.name + " because the bot didn't have the Manage Roles permission.");
        guild.owner.send("Couldn't create Bot Controller role. Please reinvite the bot to the server with the permission Manage Roles. You can remove the permission after inviting.")
        .then(function(){
        guild.leave();
        });
        })
        .then(role => writeRolesToFile(role));
});
function writeRolesToFile(role) {
  if (role){
    getRoleIds();
    roleids.push({
      name: role.guild.name,
      guildid: role.guild.id,
      roleid: role.id
    });
    fs.writeFile("./.data/roleids.json", JSON.stringify(roleids, null, '\t'), "utf8", (err) => {
    if (err) console.log('Error saving admin role to file: ' + err);
});
}
}
client.on('guildDelete', function(guild) {
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
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function isNumeric(n) {
return !isNaN(parseFloat(n)) && isFinite(n);
}
client.on('roleDelete', function(role) {
  len = roleids.length;
  for (var i = 0; i < len; i++) {
      if (roleids[i].roleid === role.id) {
        role.guild.owner.send("LitBot controller role deleted. Leaving guild. Reinvite with the permission Manage Roles, if you want to get the bot back to the guild.");
        role.guild.leave();
        return;
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
        if (msg.author.id === client.user.id) return;
        let obj = customcmds[msg.guild.id].cmds.find(o => o.command === msg.content.toLowerCase());
        if (obj) msg.channel.send(obj.response);
        if (!msg.content.startsWith(tokens.prefix)) return;
        if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
    }
});

client.login(tokens.d_token).catch(console.error);
process.on('unhandledRejection', err => console.error(`Uncaught Promise Error: \n${err.stack}`));
