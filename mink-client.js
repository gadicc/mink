Handlebars.registerHelper('minkFiles', function() {
	if (!this.rel) this.rel='group';
	console.log(this);
	return new Handlebars.SafeString(Template.minkFiles(this));
});

Template.minkFiles.helpers({
	files: function() {
		return this.files || mink.files.find();
	},

	isImage: function() {
		return this.mimetype.match(/^image/);
	},

	humanSize: function() {
		return mink.humanSize(this.size);
	},
	extIcon: function() {
		return mink.extIcon(this.filename);
	},

	s3url: function() {
		return mink.url(this, 's3');
	}
});

Template.minkFiles.events({
	'click a.minkAdd': function(event, tpl) {
		mink.pickAndStore();
	}
});

Template.minkFiles.rendered = function() {
	$('div.minkThumbs a').fancybox();
}


mink.sub = Meteor.subscribe('minkFiles');