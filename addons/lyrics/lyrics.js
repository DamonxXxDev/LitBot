var config = require("./config.json");
var music = require("../music/music.js");
var request = require('request');
var { MessageEmbed } = require("discord.js");
var cheerio = require('cheerio');
var tokens = require(global.unixdirname + "/.data/tokens.json");
exports.commands = [];
exports.commands.lyrics = {
	usage: '<song>',
    description: 'Shows lyrics for currently playing song/specified song.',
    aliases: ['l'],
	command: (msg) => {
        args = msg.content.split(' ');
        args.shift();
        if(args.length == 0){
            if(typeof music.variables.queue[msg.guild.id] == "object" && music.variables.queue[msg.guild.id].playing == true){
                if(music.variables.queue[msg.guild.id].currplaying.title){
                    try{
                        getLyrics(music.variables.queue[msg.guild.id].currplaying.title, false, msg);
                    }
                    catch(err){
                        msg.channel.send("Error getting lyrics.");
                        console.error("Error getting lyrics.");
                        console.error(err);
                    }
                }else{
                    console.error("Error getting lyrics: Couldn't get title for currently playing song.");
                    msg.channel.send("Error getting lyrics.");
                    return;
                }
                
            }else{
                msg.channel.send("Please specify a song, or play a song to get lyrics.");
                return;
            }
        }else{
            try{
                getLyrics(args.join(' '), true, msg);
            }
            catch(err){
                msg.channel.send("Error getting lyrics.");
                console.error("Error getting lyrics.");
                console.error(err);
            }
        }
	}
};
//TODO fortnite encodeURI
//TODO errors not logged anywhere
function getLyrics(songName, hasArgs, msg){
    songName = songName.replace(/ -/g, "");
    songName = songName.replace(/-/g, "");
    songName = songName.replace(/ \[ .*?\]/g, '');
    songName = songName.replace(/\[.*?\]/g, '');
    songName = songName.replace(/ \(.*?\)/g, '');
    songName = songName.replace(/\(.*?\)/g, '');
    var options = {
        url: 'https://api.genius.com/search?q=' + encodeURI(songName),
        headers: {
            'Authorization': String("Bearer " + config.genius_key)
        }
    };
    //TODO only pick song lyrics, not movie soundtracks 
    request(options, function(error, response, body) {
        if (error) console.error(error);
        try {
            var data = JSON.parse(body);
        }
        catch(err) {
            msg.channel.send('Error getting data. Try again later.');
            console.error('Error getting lyrics: ' + err + 'API might have been changed.');
            return;
        }
        var hitsArray = data.response.hits;
        var songArray = [];
        var tosend = [];
        for(i = 0; i < hitsArray.length; i++){
            if(hitsArray[i].type == "song"){
                 songArray.push(hitsArray[i]);
                tosend.push(`${i + 1}. ${hitsArray[i].result.full_title}`);
            }
        }
        if(songArray == undefined || songArray.length == 0){
            msg.channel.send("Couldn't find lyrics.");
            return;
        }
        if(hasArgs == true){
            const filter = m => {
            if((!isNaN(parseFloat(m.content)) && isFinite(m.content) && m.content > 0 && m.content < hitsArray.length + 2) || m.content == tokens.prefix + "cancel"){
                return true;
            }
            }
            var collector = msg.channel.createMessageCollector(filter, { time: 10000 });
            msg.channel.send('Choose a song by sending a number, or cancel with ' + tokens.prefix + 'cancel: \n' + tosend.join('\n'));
            collector.on('end', (collected, reason) => {
                if(reason == "time"){
                    msg.channel.send("Timed out.");
                    return;
                }
            });
            collector.on('collect', m => {
                if (m.content == tokens.prefix + "cancel"){
                    collector.stop("cancel");
                    msg.channel.send("Canceled.");
                    return;
                }
                collector.stop();
                var song = songArray[Number(m.content) - 1];
                request(song.result.url, function(error, response, body){
                    if(error) {
                        console.error("Error getting lyrics.");
                        console.error(error);
                        msg.channel.send("Error getting lyrics.");
                        return;
                    }
                    //scrape lyrics from webpage
                    const $ = cheerio.load(body);
                    var lyricsString = String($(".lyrics").children().text());
                    //create embed
                    sendLyricsEmbed(msg, lyricsString, song);
                })
            });
        }else{
            var song = songArray[0];
                request(song.result.url, function(error, response, body){
                    if(error) {
                        console.error("Error getting lyrics.");
                        console.error(error);
                        msg.channel.send("Error getting lyrics.");
                        return;
                    }
                    //scrape lyrics from webpage
                    const $ = cheerio.load(body);
                    var lyricsString = String($(".lyrics").children().text());
                    sendLyricsEmbed(msg, lyricsString, song);
                })
        }
    });

}
function sendLyricsEmbed(msg, lyricsString, song){
    if(lyricsString.length > 2048){
        var alreadyInMsg = 0;
        var embedArray = [];
        //split embed on newline
        var substr = lyricsString.substring(0, 2047);
        var lastIndex = substr.lastIndexOf("\n");
        var substr_lastindex = lyricsString.substring(alreadyInMsg, alreadyInMsg + lastIndex);
        embedArray.push(
            new MessageEmbed()
            .setTitle('**Lyrics for: ' + String(song.result.full_title) + '**')
            .setDescription(substr_lastindex)
            .setColor(14549247)
            .setThumbnail(String(song.result.header_image_url))
            .setAuthor(msg.author.username, msg.author.avatarURL())
        )
        alreadyInMsg = alreadyInMsg + substr_lastindex.length + 1;
        for(null; alreadyInMsg < lyricsString.length; null){
            //splits embed on newline
            var substr = lyricsString.substring(alreadyInMsg, alreadyInMsg + 2047);
            if(substr > 2047){
                var lastIndex = substr.lastIndexOf("\n");
                var substr_lastindex = lyricsString.substring(alreadyInMsg, alreadyInMsg + lastIndex);
            }else{
                var substr_lastindex = substr;
            }   
            embedArray.push(
                new MessageEmbed()
                .setDescription(substr_lastindex)
                .setColor(14549247)
            )
            alreadyInMsg = alreadyInMsg + substr_lastindex.length + 1;
        }
        embedArray[embedArray.length - 1].setFooter("Lyrics from genius.com");
        for(i = 0; i < embedArray.length; i++){
            msg.channel.send(embedArray[i]);
        }
    }else{
        //create embed
        var embed = new MessageEmbed()
        .setTitle('**Lyrics for: ' + String(song.result.full_title) + '**')
        .setDescription(lyricsString)
        .setColor(14549247)
        .setThumbnail(String(song.result.header_image_url))
        .setAuthor(msg.author.username, msg.author.avatarURL())
        .setFooter("Lyrics from genius.com");
        msg.channel.send(embed);
    }
}