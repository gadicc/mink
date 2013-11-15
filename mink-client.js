Handlebars.registerHelper('minkFiles', function(options) {
	if (!this.rel) this.rel = this._id || 'group';

	if (options && options.hash) {
		if (options.hash.editable)
			this.editable = options.hash.editable;
		if (options.hash.token)
			this.minkToken = options.hash.token;
	} 
	if (this._id && !this.files && !this.editable)
		return;
	if (!this.minkToken)
		this.minkToken = this._id || mink.randomToken();

	return new Handlebars.SafeString(Template.minkFiles(this));
});

Template.minkFiles.helpers({
	files: function() {
		var cursor = mink.files.find({token: this.minkToken});

		if (this.files) {
			return _.union(this.files, cursor.fetch()); 
		} else
			return cursor;
	},

	isImage: function() {
		return this.thumb || this.mimetype && this.mimetype.match(/^image/);
	},

	humanSize: function() {
		return mink.humanSize(this.size);
	},
	extIcon: function() {
		return mink.extIcon(this.filename);
	},

	url: function() {
		return mink.url(this, 's3');
	},

	s3url: function() {
		return mink.url(this, 's3');
	}
});

Template.minkFiles.events({
	'click a.minkAdd': function(event, tpl) {
		console.log('minkAdd click on ' + tpl.data.minkToken);
		mink.pickAndStore({}, {}, { token: tpl.data.minkToken });
	},
	'click a:not(.minkAdd)': function(event, tpl) {
		// handle the event ourselves to avoid conflicts
		event.preventDefault();
		event.stopPropagation();

		/*
		 * Ideally now, we'd like to $(event.target).trigger('click');
		 * Unfortunately owing to a Bootstrap / Fancybox incompatibility,
		 * it's a lot safer to open fancybox manually
		 */
		var rel, out = [], a = $(event.target);
		if (a[0].tagName == 'IMG')
			a = a.parent();

		rel = a.attr('rel');
		if (rel) a = $('a[rel='+rel+']');
		_.each(a, function(el) {
			out.push({
				type: 'image',
				href: el.getAttribute('href'),
				title: el.getAttribute('title')
			});
		});
		$.fancybox.open(out);

	} 
});

Template.minkFiles.rendered = function() {
	$('div.minkThumbs a').fancybox();
}

mink.sub = Meteor.subscribe('minkFiles');