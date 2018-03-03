exports.commands = new Object();
exports.commands.info = {
	usage: '',
	description: 'Shows bot creator, uptime, the github repo and the invite link.',
	command: (msg) => {
		var seconds = Math.floor(process.uptime());
		var days = Math.floor(seconds / (3600*24));
		seconds  -= days*3600*24;
		var hrs   = Math.floor(seconds / 3600);
		seconds  -= hrs*3600;
		var mnts = Math.floor(seconds / 60);
		seconds  -= mnts*60;
		msg.channel.send({
			'embed': {
				'description': '**LitBot**',
				'color': 3145472,
				'author': {
					'name': msg.author.username + '#' + msg.author.discriminator,
					'icon_url': msg.author.avatarURL
				},
				'fields': [
					{
						'name': 'Creator',
						'value': 'tontool#2136, and creators of OhGodMusicBot',
						'inline': true
					},
					{
						'name': 'Github Repository',
						'value': 'https://github.com/tontool/LitBot',
						'inline': true
					},
					{
						'name': 'Invite link',
						'value': 'https://discordapp.com/api/oauth2/authorize?client_id=370613072181854218&permissions=36759552&scope=bot',
						'inline': true
					},
					{
						'name': 'Uptime',
						'value': days+' days, '+hrs+' Hrs, '+mnts+' Minutes, '+seconds+' Seconds',
						'inline': true
					},
				]
			}
		}
		);
	}
};
