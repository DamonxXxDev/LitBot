var request = require('request');
const fs = require('fs');
const tokens = require('../.data/tokens.json');
var ids = {};
var seasons = {};
var seasonnamearr = [];
//TODO cooldown
//TODO pubg leaderboards
// recent games https://pubg.op.gg/api/users/5a678bc4a1bde000011add3c/matches/recent?server=eu&queue_size=2&mode=tpp
//TODO get recent games
exports.commands = new Object();
var getStatsIntervalInMs = 43200000;
(function () {
	setInterval(getSeasons, getStatsIntervalInMs);
	readSeasonsFromFile();
	readIdsFromFile();
	//if seasons file is more than 12 hours old, fetch seasons
	if (typeof seasons.fetchedAt == 'number') {
		if (seasons.fetchedAt < Date.now() - getStatsIntervalInMs) {
			getSeasons();
		}
	} else {
		getSeasons();
	}
	if (typeof seasons.seasons != 'undefined') {
		for (var i = 0; i < seasons.seasons.length; i++) {
			seasonnamearr[i] = seasons.seasons[i].name.replace(/\s+/g, '').toLowerCase();
		}
	}
})();
function getSeasons() {
	console.log('PUBG season data older than 12 hours, updating..');
	request('https://pubg.op.gg/api/const/seasons', function (error, res, body) {
		try {
			body = '{ "seasons": ' + body + '}';
			var data = JSON.parse(body);
			var newSeasons = {};
			if (data.seasons instanceof Array) {
				newSeasons.seasons = data.seasons.reverse();
			} else {
				throw 'API has probably changed.';
			}
			if (JSON.stringify(newSeasons) != JSON.stringify(seasons) || typeof seasons.fetchedAt != 'number') {
				console.log('PUBG seasons changed, updating..');
				seasons = newSeasons;
				seasons.fetchedAt = Date.now();
				writeSeasonsToFile();
			}
		}
		catch (err) {
			console.log('Error getting seasons: \n' + err);
		}
	});
}
async function writeSeasonsToFile() {
	try {
		fs.statSync('./.data/');
		try {
			fs.writeFileSync('./.data/pubgseasons.json', JSON.stringify(seasons, null, '\t'));
		}
		catch (err) {
			console.log('Error ' + err + ' writing PUBG seasons to file.');
		}
	}
	catch (err) {
		if (err.code == 'ENOENT') {
			// file does not exist
			fs.mkdirSync('./.data/');
			console.log('.data doesn\'t exist, creating..');
			writeIdsToFile();
		} else {
			console.log('Error checking if ./.data/ exists: ', err.code);
		}
	}
}
function readSeasonsFromFile() {
	try {
		fs.statSync('./.data/');
		try {
			var data = fs.readFileSync('./.data/pubgseasons.json');
			if (data == '') {
				data = '{}';
				fs.writeFileSync('./.data/pubgseasons.json', '{}');
				getSeasons();
			}
			seasons = JSON.parse(data);
			if (seasons == {}) getSeasons();
		}
		catch (err) {
			if (err.code == 'ENOENT') {
				fs.writeFileSync('./.data/pubgseasons.json', '{}');
				console.log('Created pubgseasons.json file.');
				seasons = {};
			} else {
				throw 'Error ' + err + ' reading PUBG seasons from file.';
			}
		}
	}
	catch (err) {
		if (err.code == 'ENOENT') {
			// file does not exist
			fs.mkdirSync('./.data/');
			console.log('.data doesn\'t exist, creating..');
			readSeasonsFromFile();
		} else {
			console.log('Error checking if ./.data/ exists: ', err);
		}
	}
}
async function writeIdsToFile() {
	try {
		fs.statSync('./.data/');
		try {
			fs.writeFileSync('./.data/pubgusernames.json', JSON.stringify(ids, null, '\t'));
		}
		catch (err) {
			console.log('Error ' + err + ' writing PUBG ids to file.');
		}
	}
	catch (err) {
		if (err.code == 'ENOENT') {
			// file does not exist
			fs.mkdirSync('./.data/');
			console.log('.data doesn\'t exist, creating..');
			writeIdsToFile();
		} else {
			console.log('Error checking if ./.data/ exists: ', err.code);
		}
	}
}
function readIdsFromFile() {
	try {
		fs.statSync('./.data/');
		try {
			var data = fs.readFileSync('./.data/pubgusernames.json');
			if (data == '') {
				fs.writeFileSync('./.data/pubgusernames.json', '{}');
				data = '{}';
			}
			ids = JSON.parse(data);
		}
		catch (err) {
			if (err.code == 'ENOENT') {
				fs.writeFileSync('./.data/pubgusernames.json', '{}');
				console.log('Created pubgusernames.json file.');
			} else {
				throw 'Error ' + err + ' reading PUBG ids from file.';
			}
		}
	}
	catch (err) {
		if (err.code == 'ENOENT') {
			// file does not exist
			fs.mkdirSync('./.data/');
			console.log('.data doesn\'t exist, creating..');
			readIdsFromFile();
		} else {
			console.log('Error checking if ./.data/ exists: ', err);
		}
	}
}
exports.commands.pubgseasons = {
	usage: '',
	description: 'Gets all available PUBG seasons.',
	aliases: ['pubgsea'],
	command: (msg) => {
		msg.channel.send('Seasons: ' + seasonnamearr.join(', '));
	}
};
exports.commands.pubgstats = {
	usage: '<username> <eu/na/as/krjp/oc/sea> <solo/duo/squad/all> <fpp/tpp> <season>',
	description: 'Gets PUBG stats of player. If you don\'t define the season, the bot will choose the current season. You can get all seasons with command ' + tokens.prefix + 'pubgseasons.',
	aliases: ['pubgs'],
	command: (msg) => {
		var args = msg.content.split(' ');
		args[1] = args[1].toLowerCase();
		if (args[1] === undefined) {
			msg.channel.send('Argument username missing.');
			return;
		}
		if (args[2] == undefined || (args[2] != 'eu' && args[2] != 'na' && args[2] != 'as' && args[2] != 'krjp' && args[2] != 'oc' && args[2] != 'sea')) {
			msg.channel.send('Argument server invalid.');
			return;
		}
		var queuesize;
		if (args[3] == undefined || (args[3] != 'solo' && args[3] != 'duo' && args[3] != 'squad' && args[3] != 'all')) {
			msg.channel.send('Argument queue size invalid.');
			return;
		} else {
			if (args[3] == 'solo') {
				queuesize = 1;
			} else if (args[3] == 'duo') {
				queuesize = 2;
			} else if (args[3] == 'squad') {
				queuesize = 4;
			}
		}
		if (args[4] == undefined || (args[4] != 'fpp' && args[4] != 'tpp')) {
			msg.channel.send('Argument perspective invalid.');
			return;
		}
		if (args[5] == undefined) {
			args[5] = seasons.seasons[0].key;
		} else {
			var invalid = false;
			for (var i = 0; i < seasons.seasons.length; i++) {
				if (args[5] == seasons.seasons[i].name.replace(/\s+/g, '').toLowerCase()) {
					args[5] = seasons.seasons[i].key;
					break;
				} else {
					if (i == seasons.seasons.length - 1) {
						msg.channel.send('Argument season invalid. Seasons: ' + seasonnamearr.join(', '));
						invalid = true;
					}
				}
			}
			if (invalid == true) {
				return;
			}
		}
		getID(args[1]);
		if (queuesize !== undefined) {
			request('https://pubg.op.gg/api/users/' + ids[args[1]] + '/ranked-stats?season=' + args[5] + '&server=' + args[2] + '&queue_size=' + queuesize + '&mode=' + args[4], function (error, res, body) {
				try {
					var statsData = JSON.parse(body);
					if (statsData.message == '') {
						msg.channel.send('The user hasn\'t played in the chosen season. Seasons: ' + seasonnamearr.join(', '));
						return;
					}
					var winPercent = statsData.stats.win_matches_cnt / statsData.stats.matches_cnt * 100;
					winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
					getPlayedWith(ids[args[1]], args[5], args[2])
						.then((value) => {
							var str = value.str;
							msg.channel.send({
								'embed': {
									'description': capitalizeFirstLetter(args[3]) + ' PUBG stats for **' + args[1] + '**.',
									'color': 16073282,
									/*"thumbnail": {
										"url": '' //could have fortnite icon here
									  },*/
									'author': {
										'name': msg.author.username,
										'icon_url': msg.author.displayAvatarURL()
									},
									'footer': {
										'text': 'Source: https://pubg.op.gg. Data updates when winner is determined.'
									},
									'fields': [{
										'name': 'Rating',
										'value': statsData.stats.rating,
										'inline': true
									},
									{
										'name': 'Matches played',
										'value': statsData.stats.matches_cnt,
										'inline': true
									},
									{
										'name': 'Kills',
										'value': statsData.stats.kills_sum,
										'inline': true
									},
									{
										'name': 'Deaths',
										'value': statsData.stats.deaths_sum,
										'inline': true
									},
									{
										'name': 'Assists',
										'value': statsData.stats.assists_sum,
										'inline': true
									},
									{
										'name': 'Headshot kills',
										'value': statsData.stats.headshot_kills_sum,
										'inline': true
									},
									{
										'name': 'Most kills in game',
										'value': statsData.stats.kills_max,
										'inline': true
									},
									{
										'name': 'Wins',
										'value': statsData.stats.win_matches_cnt,
										'inline': true
									},
									{
										'name': 'Win%',
										'value': winPercent + '%',
										'inline': true
									},
									{
										'name': 'Kills/deaths',
										'value': Math.round((statsData.stats.kills_sum / statsData.stats.deaths_sum + 0.00001) * 100) / 100 + '',
										'inline': true
									},
									{
										'name': 'Top 10',
										'value': statsData.stats.topten_matches_cnt,
										'inline': true
									},
									{
										'name': 'Longest kill',
										'value': statsData.stats.longest_kill_max + ' meters',
										'inline': true
									},
									{
										'name': 'Average damage',
										'value': Math.round((statsData.stats.damage_dealt_avg + 0.00001) * 100) / 100 + '',
										'inline': true
									},
									{
										'name': 'Average time survived',
										'value': Math.round((statsData.stats.time_survived_avg / 60 + 0.00001) * 100) / 100 + ' minutes',
										'inline': true
									},
									{
										'name': 'Recently played with',
										'value': str,
										'inline': true
									}
									]
								}
							});
						}, (reason) => {
							console.log(reason.err);
							msg.channel.send("Error fetching PUBG data:\n ```" + reason.err + "```");
						})

				}
				catch (err) {
					msg.channel.send('Error while fetching PUBG stats. The API might have been changed. \n ```' + err + '```');
					console.log('Error while fetching PUBG stats: \n' + err);
				}
			});
		} else {
			//for all stats https://pubg.op.gg/api/users/5a678bc4a1bde000011add3c/ranked-stats-groups?server=eu&mode=tpp&season=2018-02
			request('https://pubg.op.gg/api/users/' + ids[args[1]] + '/ranked-stats-groups?season=' + args[5] + '&server=' + args[2] + '&mode=' + args[4], function (error, res, body) {
				try {
					var statsData = JSON.parse(body);
					if (statsData.message == '') {
						msg.channel.send('The user hasn\'t played in the chosen season. Seasons: ' + seasonnamearr.join(', '));
						return;
					}
					var alldata = {rating: 0, matches: 0, wins: 0, top10: 0, kills: 0, assists: 0, headshots: 0, deaths: 0, avgdmg: 0, avgtime: 0};
					for (i = 0; i < statsData.length; i++) {
						alldata.rating += parseFloat(statsData[i].aggregate.stats.rating);
						alldata.matches += parseFloat(statsData[i].aggregate.stats.matches_cnt);
						alldata.wins += parseFloat(statsData[i].aggregate.stats.win_matches_cnt);
						alldata.top10 += parseFloat(statsData[i].aggregate.stats.topten_matches_cnt);
						alldata.kills += parseFloat(statsData[i].aggregate.stats.kills_sum);
						alldata.assists += parseFloat(statsData[i].aggregate.stats.assists_sum);
						alldata.headshots += parseFloat(statsData[i].aggregate.stats.headshot_kills_sum);
						alldata.deaths += parseFloat(statsData[i].aggregate.stats.deaths_sum);
						if (alldata.longestkill == undefined || alldata.longestkill < parseFloat(statsData[i].aggregate.stats.longest_kill_max)) {
							alldata.longestkill = parseFloat(statsData[i].aggregate.stats.longest_kill_max);
						}
						if (alldata.killsMax == undefined || alldata.killsMax < parseFloat(statsData[i].aggregate.stats.kills_max)) {
							alldata.killsMax = parseFloat(statsData[i].aggregate.stats.kills_max);
						}
						alldata.avgdmg += parseFloat(statsData[i].aggregate.stats.damage_dealt_avg);
						alldata.avgtime += parseFloat(statsData[i].aggregate.stats.time_survived_avg);
					}
					alldata.rating = Math.round(alldata.rating / statsData.length);
					alldata.avgdmg = Math.round(alldata.avgdmg / statsData.length);
					alldata.avgtime = Math.round(alldata.avgtime / statsData.length);
					var winPercent = alldata.wins / alldata.matches * 100;
					winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
					getPlayedWith(ids[args[1]], args[5], args[2])
						.then((value) => {
							var str = value.str;
							msg.channel.send({
								'embed': {
									'description': capitalizeFirstLetter(args[3]) + ' PUBG stats for **' + args[1] + '**.',
									'color': 16073282,
									/*"thumbnail": {
										"url": '' //could have fortnite icon here
									  },*/
									'author': {
										'name': msg.author.username,
										'icon_url': msg.author.displayAvatarURL()
									},
									'footer': {
										'text': 'Source: https://pubg.op.gg. Data updates when winner is determined.'
									},
									'fields': [{
										'name': 'Rating',
										'value': alldata.rating,
										'inline': true
									},
									{
										'name': 'Matches played',
										'value': alldata.matches,
										'inline': true
									},
									{
										'name': 'Kills',
										'value': alldata.kills,
										'inline': true
									},
									{
										'name': 'Deaths',
										'value': alldata.deaths,
										'inline': true
									},
									{
										'name': 'Assists',
										'value': alldata.assists,
										'inline': true
									},
									{
										'name': 'Headshot kills',
										'value': alldata.headshots,
										'inline': true
									},
									{
										'name': 'Most kills in game',
										'value': alldata.killsMax,
										'inline': true
									},
									{
										'name': 'Wins',
										'value': alldata.wins,
										'inline': true
									},
									{
										'name': 'Win%',
										'value': winPercent + '%',
										'inline': true
									},
									{
										'name': 'Kills/deaths',
										'value': Math.round((alldata.kills / alldata.deaths + 0.00001) * 100) / 100 + '',
										'inline': true
									},
									{
										'name': 'Top 10',
										'value': alldata.top10,
										'inline': true
									},
									{
										'name': 'Longest kill',
										'value': alldata.longestkill + ' meters',
										'inline': true
									},
									{
										'name': 'Average damage',
										'value': Math.round((alldata.avgdmg + 0.00001) * 100) / 100 + '',
										'inline': true
									},
									{
										'name': 'Average time survived',
										'value': Math.round((alldata.avgtime / 60 + 0.00001) * 100) / 100 + ' minutes',
										'inline': true
									},
									{
										'name': 'Recently played with',
										'value': str,
										'inline': true
									}
									]
								}
							});
						}, (reason) => {
							console.log(reason.err);
							msg.channel.send("Error fetching PUBG data:\n ```" + reason.err + "```");
						})

				}
				catch (err) {
					msg.channel.send('Error while fetching PUBG stats. The API might have been changed. \n ```' + err + '```');
					console.log('Error while fetching PUBG stats: \n' + err.stack);
				}
			});
		}
	}
};
function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
function getID (username){
	if (!ids.hasOwnProperty(username)) {
		request('https://pubg.op.gg/api/find/users?nickname[]=' + username, function (error, res, body) {
			try {
				var data = JSON.parse(body);
				console.log(data);
				var id = null;
				if (data[username] == null) {
					msg.channel.send('Argument username invalid.');
					return;
				} else {
					try {
						id = data[username]._id;
						ids[username] = id;
						console.log('idsincommand: ' + JSON.stringify(ids));
						writeIdsToFile();
					}
					catch (err) {
						msg.channel.send('Error while getting user id. API has probably changed.\n' + err);
						console.log('Error while getting PUBG user id: ' + err + ' API has probably changed.');
						return;
					}

				}
				if (id != null) {
					ids[username] = id;
				}
				writeIdsToFile();
			}
			catch (err) {
				console.log('Error while getting PUBG user id. API has probably changed.\n' + err);
				msg.channel.send('Error while getting user id. API has probably changed.\n' + err);
				return;
			}
		});
	}
}
function getPlayedWith(id, season, server) {
	return new Promise((resolve, reject) => {
		request('https://pubg.op.gg/api/users/' + id + '/matches/summary-played-with?season=' + season + '&server=' + server, function (error, res, body) {
			var playedWithStr = '';
			var error;
			try {
				var playedWithData = JSON.parse(body);
				for (i = 0; i < playedWithData.users.length; i++) {
					playedWithStr = playedWithStr + '**[' + playedWithData.users[i].user.nickname + '](https://steamcommunity.com/profiles/' + playedWithData.users[i].user.identity_id.slice(15, 32) + ')** ' + playedWithData.users[i].stats.matches_count + ' matches\n';
				}
			}
			catch (err) {
				error = err;
				err.message = "Error fetching played with data.";
				reject({ err: err });
			}
			if (!error) {
				resolve({ message: "Fetched played with data.", data: playedWithData, str: playedWithStr, err: undefined });
			}
		});
	})
}
