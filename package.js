Package.describe({
    summary: "Mink - Meteor integration for INK File Picker"
});

Package.on_use(function (api) {
	api.use('underscore', ['client', 'server']);	
	api.add_files('mink.js', ['client', 'server']);

	api.add_files('mink-server.js', 'server');

	api.use(['templating', 'handlebars'], 'client');
	api.add_files('filepicker-nonblock.js', 'client');
	api.add_files(['mink.html', 'mink-client.js', 'mink.css'], 'client');

	api.add_files([
		'icons/winzip_icon_xp.gif', 'icons/msword_icon.gif',
		'icons/pdf-icon.png', 'icons/Microsoft_Excel_icon.gif'
	], 'client');

	api.export('mink', ['client', 'server']);
});