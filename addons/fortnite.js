var request = require('request');
var fortniteApiCooldown = false;
exports.commands = new Object();
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
				'TRN-Api-Key': tokens.fortnite_api_key
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
			//console.log("response: " + response + " body: " + body);
			//let obj = customcmds[msg.guild.id].cmds.find(o => o.command === msg.content.toLowerCase());
			var winPercent;
			try{
			if (args[3] === 'all') {
				winPercent = data.lifeTimeStats.find(o => o.key === 'Wins').value / data.lifeTimeStats.find(o => o.key === 'Matches Played').value * 100;
				winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
				msg.channel.send({
					'embed': {
						'description': 'All Gamemodes Fortnite stats for **' + args[2] + '** on platform **' + data.platformNameLong + '**.',
						'color': 16073282,
						/*"thumbnail": {
                          "url": '' //could have fortnite icon here
                        },*/
						'author': {
							'name': msg.author.username,
							'icon_url': msg.author.avatarURL
						},
						'footer': {
							'text': 'Source: https://fortnitetracker.com'
						},
						'fields': [{
							'name': 'Score',
							'value': data.lifeTimeStats.find(o => o.key === 'Score').value,
							'inline': true
						},
						{
							'name': 'Kills',
							'value': data.lifeTimeStats.find(o => o.key === 'Kills').value,
							'inline': true
						},
						{
							'name': 'Kills Per Minute',
							'value': data.lifeTimeStats.find(o => o.key === 'Kills Per Min').value,
							'inline': true
						},
						{
							'name': 'Wins',
							'value': data.lifeTimeStats.find(o => o.key === 'Wins').value,
							'inline': true
						},
						{
							'name': 'Win%',
							'value': winPercent + '%',
							'inline': true
						},
						{
							'name': 'Kills/deaths',
							'value': data.lifeTimeStats.find(o => o.key === 'K/d').value,
							'inline': true
						},
						{
							'name': 'Matches Played',
							'value': data.lifeTimeStats.find(o => o.key === 'Matches Played').value,
							'inline': true
						},
						{
							'name': 'Top 25',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 25s').value,
							'inline': true
						},
						{
							'name': 'Top 12',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 12s').value,
							'inline': true
						},
						{
							'name': 'Top 3',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 3').value,
							'inline': true
						}
						]
					}
				});
			} else if (args[3] === 'solo') {
				winPercent = data.lifeTimeStats.find(o => o.key === 'Wins').value / data.lifeTimeStats.find(o => o.key === 'Matches Played').value * 100;
				winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
				msg.channel.send({
					'embed': {
						'description': 'Solo Fortnite stats for **' + args[2] + '** on platform **' + data.platformNameLong + '**.',
						'color': 16073282,
						/*"thumbnail": {
                          "url": '' //could have fortnite icon here
                        },*/
						'author': {
							'name': msg.author.username,
							'icon_url': msg.author.avatarURL
						},
						'footer': {
							'text': 'Source: https://fortnitetracker.com'
						},
						'fields': [{
							'name': 'Score',
							'value': data.lifeTimeStats.find(o => o.key === 'Score').value,
							'inline': true
						},
						{
							'name': 'Kills',
							'value': data.lifeTimeStats.find(o => o.key === 'Kills').value,
							'inline': true
						},
						{
							'name': 'Kills Per Minute',
							'value': data.lifeTimeStats.find(o => o.key === 'Kills Per Min').value,
							'inline': true
						},
						{
							'name': 'Wins',
							'value': data.lifeTimeStats.find(o => o.key === 'Wins').value,
							'inline': true
						},
						{
							'name': 'Win%',
							'value': winPercent + '%',
							'inline': true
						},
						{
							'name': 'Kills/deaths',
							'value': data.lifeTimeStats.find(o => o.key === 'K/d').value,
							'inline': true
						},
						{
							'name': 'Matches Played',
							'value': data.lifeTimeStats.find(o => o.key === 'Matches Played').value,
							'inline': true
						},
						{
							'name': 'Top 25',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 25s').value,
							'inline': true
						},
						{
							'name': 'Top 12',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 12s').value,
							'inline': true
						},
						{
							'name': 'Top 3',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 3').value,
							'inline': true
						}
						]
					}
				});
			} else if (args[3] === 'duo') {
				winPercent = data.lifeTimeStats.find(o => o.key === 'Wins').value / data.lifeTimeStats.find(o => o.key === 'Matches Played').value * 100;
				winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
				msg.channel.send({
					'embed': {
						'description': 'Duo Fortnite stats for **' + args[2] + '** on platform **' + data.platformNameLong + '**.',
						'color': 16073282,
						/*"thumbnail": {
                          "url": '' //could have fortnite icon here
                        },*/
						'author': {
							'name': msg.author.username,
							'icon_url': msg.author.avatarURL
						},
						'footer': {
							'text': 'Source: https://fortnitetracker.com'
						},
						'fields': [{
							'name': 'Score',
							'value': data.lifeTimeStats.find(o => o.key === 'Score').value,
							'inline': true
						},
						{
							'name': 'Kills',
							'value': data.lifeTimeStats.find(o => o.key === 'Kills').value,
							'inline': true
						},
						{
							'name': 'Kills Per Minute',
							'value': data.lifeTimeStats.find(o => o.key === 'Kills Per Min').value,
							'inline': true
						},
						{
							'name': 'Wins',
							'value': data.lifeTimeStats.find(o => o.key === 'Wins').value,
							'inline': true
						},
						{
							'name': 'Win%',
							'value': winPercent + '%',
							'inline': true
						},
						{
							'name': 'Kills/deaths',
							'value': data.lifeTimeStats.find(o => o.key === 'K/d').value,
							'inline': true
						},
						{
							'name': 'Matches Played',
							'value': data.lifeTimeStats.find(o => o.key === 'Matches Played').value,
							'inline': true
						},
						{
							'name': 'Top 25',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 25s').value,
							'inline': true
						},
						{
							'name': 'Top 12',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 12s').value,
							'inline': true
						},
						{
							'name': 'Top 3',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 3').value,
							'inline': true
						}
						]
					}
				});
			} else if (args[3] === 'squad') {
				winPercent = data.lifeTimeStats.find(o => o.key === 'Wins').value / data.lifeTimeStats.find(o => o.key === 'Matches Played').value * 100;
				winPercent = Math.round((winPercent + 0.00001) * 100) / 100;
				msg.channel.send({
					'embed': {
						'description': 'Squad Fortnite stats for **' + args[2] + '** on platform **' + data.platformNameLong + '**.',
						'color': 16073282,
						/*"thumbnail": {
                          "url": '' //could have fortnite icon here
                        },*/
						'author': {
							'name': msg.author.username,
							'icon_url': msg.author.avatarURL
						},
						'footer': {
							'text': 'Source: https://fortnitetracker.com'
						},
						'fields': [{
							'name': 'Score',
							'value': data.lifeTimeStats.find(o => o.key === 'Score').value,
							'inline': true
						},
						{
							'name': 'Kills',
							'value': data.lifeTimeStats.find(o => o.key === 'Kills').value,
							'inline': true
						},
						{
							'name': 'Kills Per Minute',
							'value': data.lifeTimeStats.find(o => o.key === 'Kills Per Min').value,
							'inline': true
						},
						{
							'name': 'Wins',
							'value': data.lifeTimeStats.find(o => o.key === 'Wins').value,
							'inline': true
						},
						{
							'name': 'Win%',
							'value': winPercent + '%',
							'inline': true
						},
						{
							'name': 'Kills/deaths',
							'value': data.lifeTimeStats.find(o => o.key === 'K/d').value,
							'inline': true
						},
						{
							'name': 'Matches Played',
							'value': data.lifeTimeStats.find(o => o.key === 'Matches Played').value,
							'inline': true
						},
						{
							'name': 'Top 25',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 25s').value,
							'inline': true
						},
						{
							'name': 'Top 12',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 12s').value,
							'inline': true
						},
						{
							'name': 'Top 3',
							'value': data.lifeTimeStats.find(o => o.key === 'Top 3').value,
							'inline': true
						}
						]
					}
				});
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
