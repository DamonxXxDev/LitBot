var request = require('request');
var fortniteApiCooldown = false;
var config = require(__dirname.replace(/\\/g, "/") + "/config.json");
exports.commands = new Object();
//fix fns, currently solo,duo,and squad stats are actually from all gamemodes stats
exports.commands.fortnitestats = {
	usage: '<pc/psn/xbl> <username> <all/solo/duo/squad>',
	description: 'Gets lifetime Fortnite stats of player. Fortnite stats from 1 season not implemented yet.',
	aliases: ['fnstats', 'fns'],
	command: (msg, tokens) => {
		var args = msg.content.split(' ');
		if (args[1] === undefined) {
			msg.channel.send('Argument platform missing.');
			return;
		}
		args[1] = args[1].toLowerCase();
		if (args[1] == 'xboxone' || args[1] == 'xbox' || args[1] == 'xboxlive' || args[1] == 'xb') {
			args[1] = 'xbl';
		}
		if (args[1] == 'ps4' || args[1] == 'ps' || args[1] == 'playstation') {
			args[1] = 'psn';
		}
		if (args[1] !== 'pc' && args[1] !== 'xbl' && args[1] !== 'psn') {
			msg.channel.send('Invalid platform.');
			return;
		}
		if (args[2] === undefined) {
			msg.channel.send('Argument username missing.');
			return;
		}
		if (args[3] !== 'all' && args[3] !== 'solo' && args[3] !== 'duo' && args[3] !== 'squad') {
			msg.channel.send('Argument gamemode invalid.');
			return;
		}
		if (fortniteApiCooldown == true) {
			msg.channel.send('API on cooldown. Please wait 2 seconds and try again.');
			return;
		}
		var options = {
			url: 'https://api.fortnitetracker.com/v1/profile/' + args[1] + '/' + args[2],
			headers: {
				'TRN-Api-Key': config.fortnite_api_key
			}
		};
		request(options, function(error, response, body) {
			if (error) console.log(error);
			try {
				var data = JSON.parse(body);
				console.log(data);
			}
			catch(error) {
				msg.channel.send('Error getting data. Try again later.');
				console.log('Error getting fortnite stats: ' + error + 'API might have been changed.');
				return;
			}
			fortniteApiCooldown = true;
			setTimeout(function() {
				fortniteApiCooldown = false;
			}, 2000);
			if (data.error) {
				if (data.error == 'Player Not Found') {
					msg.channel.send('Invalid username.');
					return;
				} else {
					msg.channel.send('Error getting data. Try again later.');
					return;
				}
			}
			var winPercent;
			try{
			if (args[3] === 'all') {
				winPercent = data.lifeTimeStats.find(o => o.key === 'Wins').value / data.lifeTimeStats.find(o => o.key === 'Matches Played').value * 100;
				winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
				var obj = [];
				var placenumber = 0;
				for(i = 0; i < data.lifeTimeStats.length; i++){
					if (data.lifeTimeStats[i].key == "Win%") continue;
					if(data.lifeTimeStats[i].key.startsWith("Top")) {
						data.lifeTimeStats[i].value = data.lifeTimeStats[i].value.replace(/\D/g,'');
						placenumber = placenumber + parseInt(data.lifeTimeStats[i].value);
						obj.push({
							"name": data.lifeTimeStats[i].key,
							"value": String(placenumber),
							"inline" : true
						});
						continue;
					}
					obj.push({
						"name": data.lifeTimeStats[i].key,
						"value": data.lifeTimeStats[i].value,
						"inline" : true
					});
				}
				obj.push({
					"name": "Win%",
					"value": winPercent,
					"inline" : true
				});
				var msgObj = {
					'embed': {
						'description': 'All Gamemodes Fortnite stats for **' + args[2] + '** on platform **' + data.platformNameLong + '**.',
						'color': 16073282,
						'author': {
							'name': msg.author.username,
							'icon_url': msg.author.avatarURL
						},
						'footer': {
							'text': 'Source: https://fortnitetracker.com'
						},
						'fields': obj
					}
				};
				console.log(msgObj);
				msg.channel.send(msgObj);
			} else if (args[3] === 'solo'){
				var stats = Object.values(data.stats.p2);
				winPercent = stats.find(o => o.label === 'Wins').value / stats.find(o => o.label === 'Matches').value * 100;
				winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
				var obj = [];
				var placenumber = 0;
				for(i = 0; i < stats.length; i++){
					if (stats[i].label == "Win%") continue;
					if (stats[i].label == "TRN Rating") continue;
					if(stats[i].label.startsWith("Top")) {
						stats[i].value = stats[i].value.replace(/\D/g,'');
						placenumber = placenumber + parseInt(stats[i].value);
						obj.push({
							"name": String(stats[i].label),
							"value": String(placenumber),
							"inline" : true
						});
						continue;
					}
					obj.push({
						"name": String(stats[i].label),
						"value": String(stats[i].value),
						"inline": true
					});
				}
				obj.push({
					"name": "Win%",
					"value": winPercent,
					"inline" : true
				});
				var msgObj = {
					'embed': {
						'description': 'Solo Fortnite stats for **' + args[2] + '** on platform **' + data.platformNameLong + '**.',
						'color': 16073282,
						'author': {
							'name': msg.author.username,
							'icon_url': msg.author.avatarURL
						},
						'footer': {
							'text': 'Source: https://fortnitetracker.com'
						},
						'fields': obj
					}
				};
				console.log(msgObj);
				msg.channel.send(msgObj);
			} else if (args[3] === 'duo'){
				var stats = Object.values(data.stats.p10);
				winPercent = stats.find(o => o.label === 'Wins').value / stats.find(o => o.label === 'Matches').value * 100;
				winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
				var obj = [];
				var placenumber = 0;
				for(i = 0; i < stats.length; i++){
					if (stats[i].label == "Win%") continue;
					if (stats[i].label == "TRN Rating") continue;
					if(stats[i].label.startsWith("Top")) {
						stats[i].value = stats[i].value.replace(/\D/g,'');
						placenumber = placenumber + parseInt(stats[i].value);
						obj.push({
							"name": stats[i].label,
							"value": String(placenumber),
							"inline" : true
						});
						continue;
					}
					obj.push({
						"name": String(stats[i].label),
						"value": String(stats[i].value),
						"inline" : true
					});
				}
				obj.push({
					"name": "Win%",
					"value": String(winPercent),
					"inline" : true
				});
				var msgObj = {
					'embed': {
						'description': 'Solo Fortnite stats for **' + args[2] + '** on platform **' + data.platformNameLong + '**.',
						'color': 16073282,
						'author': {
							'name': msg.author.username,
							'icon_url': msg.author.avatarURL
						},
						'footer': {
							'text': 'Source: https://fortnitetracker.com'
						},
						'fields': obj
					}
				};
				console.log(msgObj);
				msg.channel.send(msgObj);
			} else if (args[3] === 'squad'){
				var stats = Object.values(data.stats.p9);
				winPercent = stats.find(o => o.label === 'Wins').value / stats.find(o => o.label === 'Matches').value * 100;
				winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
				var obj = [];
				var placenumber = 0;
				for(i = 0; i < stats.length; i++){
					if (stats[i].label == "Win%") continue;
					if (stats[i].label == "TRN Rating") continue;
					if(stats[i].label.startsWith("Top")) {
						stats[i].value = stats[i].value.replace(/\D/g,'');
						placenumber = placenumber + parseInt(stats[i].value);
						obj.push({
							"name": stats[i].label,
							"value": String(placenumber),
							"inline" : true
						});
						continue;
					}
					obj.push({
						"name": String(stats[i].label),
						"value": String(stats[i].value),
						"inline" : true
					});
				}
				obj.push({
					"name": "Win%",
					"value": String(winPercent),
					"inline" : true
				});
				var msgObj = {
					'embed': {
						'description': 'Solo Fortnite stats for **' + args[2] + '** on platform **' + data.platformNameLong + '**.',
						'color': 16073282,
						'author': {
							'name': msg.author.username,
							'icon_url': msg.author.avatarURL
						},
						'footer': {
							'text': 'Source: https://fortnitetracker.com'
						},
						'fields': obj
					}
				};
				console.log(msgObj);
				msg.channel.send(msgObj);
			} else if (args[3] === undefined) {
				msg.channel.send('Argument 4: gamemode missing.');
				return;
			} else {
				msg.channel.send('Invalid gamemode.');
				return;
			}
		}
		catch(err){
			msg.channel.send('Error getting data.');
			console.log("Error getting Fortnite data. API has probably changed.");
			console.error(err);
			return;
		}
		});
	}
};
