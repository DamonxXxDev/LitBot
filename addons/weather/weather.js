var request = require('request');
let weatherdata = {};
function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
var config = require(__dirname.replace(/\\/g, "/") + "/config.json");
exports.commands = new Object();
exports.commands.weather = {
	usage: '<city>',
	description: 'Shows current weather in city.',
	aliases: ['wthr'],
	command: (msg, tokens) => {
		var args = msg.content.split(' ');
		args.splice(0,1);
		if (args[0] == undefined){
			msg.channel.send('Argument city missing.');
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
			request('http://api.openweathermap.org/data/2.5/weather?q=' + args[0] + '&type=like&lang=en&cnt=1&APPID=' + config.weatherkey, function(error, response, body) {
				if(error) {
					console.log('Error: ' + error);
					msg.channel.send('Error getting weather info.');
					return;
				}
				var obj = JSON.parse(body);
				if(obj.message == 'city not found'){
					msg.channel.send('City not found.');
					return;
				}
				if (!obj.cod == 200)
				{
					msg.channel.send('Error getting weather data.');
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
			msg.channel.send({
				'embed': {
					'description': '**Weather for: [' + obj.name + ', ' + obj.sys.country + '](https://openweathermap.org/city/' + obj.sys.id + ')**',
					'color': 16073282,
					'thumbnail': {
						'url': 'http://openweathermap.org/img/w/' + obj.weather[0].icon + '.png'
					},
					'author': {
						'name': msg.author.username,
						'icon_url': msg.author.avatarURL
					},
					'fields': [
						{
							'name': 'Weather condition',
							'value': capitalizeFirstLetter(obj.weather[0].description),
							'inline': true
						},
						{
							'name': 'Temperature',
							'value': Math.round(obj.main.temp - 273.15) + ' °C',
							'inline': true
						},
						{
							'name': 'Humidity',
							'value': obj.main.humidity + '%',
							'inline': true
						},
						{
							'name': 'Wind',
							'value': 'Speed: ' + obj.wind.speed + ' m/s ' + 'Degrees: ' + obj.wind.deg + '°',
							'inline': true
						},
						{
							'name': 'Cloudiness',
							'value': obj.clouds.all + '%',
							'inline': true
						}
					]
				}
			});
		}
	}
};
