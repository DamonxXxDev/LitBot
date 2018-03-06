var request = require('request');
var cheerio = require('cheerio');
var saleDataArray = {};
exports.commands = new Object();
exports.commands.steamsale = {
	usage: '',
	description: 'Shows next steam sale.',
	aliases: ['ss', 'sale'],
	command: (msg) => {
		var today = new Date();
		if (!saleDataArray.hasOwnProperty('time')) {
			saleDataArray.time = 0;
		}
		var diff = today.getTime() - saleDataArray.time;
		if (diff > 3600000) {
			request('https://www.whenisthenextsteamsale.com/', function(error, response, body) {
				if (error) {
					console.log('Error: ' + error);
					msg.channel.send('Error getting sale info.');
					return;
				}
				var $ = cheerio.load(body);
				if ($('#form1').serializeArray()[3] == undefined) {
					msg.channel.send('Error reading sale info. Site has probably changed.');
					console.log('Error reading sale info. Site has probably changed.');
					return;
				}
				var saleData = JSON.stringify($('#form1').serializeArray()[3].value);
				var saleDataLC = saleData.replace(/"([^"]+)":/g, function($0, $1) {
					return ('"' + $1.toLowerCase() + '":');
				});
				//saleDataLC = saleDataLC.replace("length","salelength");
				saleDataArray = JSON.parse(saleDataLC);
				saleDataArray = JSON.parse(saleDataArray);
				saleDataArray.time = today.getTime();
				sale();
			});
		} else {
			sale();
		}

		function sale() {
			var confirmed;
			if (saleDataArray.isconfirmed == true) {
				confirmed = 'Yes';
			} else {
				confirmed = 'No';
			}
			var saleStartDate = new Date(Date.parse(saleDataArray.startdate));

			var saleStartHour;
			if (saleStartDate.getHours() > -1 && saleStartDate.getHours() < 10) {
				saleStartHour = '0' + saleStartDate.getHours().toString();
			} else {
				saleStartHour = saleStartDate.getHours().toString();
			}
			var saleStartMin;
			if (saleStartDate.getMinutes() > -1 && saleStartDate.getMinutes() < 10) {
				saleStartMin = '0' + saleStartDate.getMinutes().toString();
			} else {
				saleStartMin = saleStartDate.getMinutes().toString();
			}
			var saleEndDate = new Date(Date.parse(saleDataArray.enddate));

			var saleEndHour;
			if (saleEndDate.getHours() > -1 && saleEndDate.getHours() < 10) {
				saleEndHour = '0' + saleEndDate.getHours().toString();
			} else {
				saleEndHour = saleEndDate.getHours().toString();
			}
			var saleEndMin;
			if (saleEndDate.getMinutes() > -1 && saleEndDate.getMinutes() < 10) {
				saleEndMin = '0' + saleEndDate.getMinutes().toString();
			} else {
				saleEndMin = saleEndDate.getMinutes().toString();
			}

			msg.channel.send({
				'embed': {
					'description': '**Next [Steam](http://store.steampowered.com/) sale: ' + saleDataArray.name + '**',
					'color': 123433,
					'footer': {
						'text': 'Times in UTC/GMT. Source: https://www.whenisthenextsteamsale.com/'
					},
					'author': {
						'name': msg.author.username,
						'icon_url': msg.author.avatarURL
					},
					'fields': [{
						'name': 'Sale Date Confirmed',
						'value': confirmed,
						'inline': true
					},
					{
						'name': 'Start Date',
						'value': saleStartDate.toDateString() + ' ' + saleStartHour + ':' + saleStartMin,
						'inline': true
					},
					{
						'name': 'End Date',
						'value': saleEndDate.toDateString() + ' ' + saleEndHour + ':' + saleEndMin,
						'inline': true
					}
					]
				}
			});
		}
	}
};
