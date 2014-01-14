Handlebars.registerHelper('minkFiles', function(options) {
	console.log(options);
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

	return typeof(Package.spacebars) == 'object'
		? Template.tMinkFiles : new Handlebars.SafeString(Template.minkFiles(this));
});

Handlebars.registerHelper('minkProfile', function(options) {
	if (options && options.hash) {
		if (options.hash.editable)
			this.editable = options.hash.editable;
		if (options.hash.token)
			this.minkToken = options.hash.token;
	} 
	if (this._id && !this.profilePic && !this.editable)
		return;
	if (!this.minkToken)
		this.minkToken = this._id || mink.randomToken();

	return typeof(Package.spacebars) == 'object'
		? Template.tMinkProfile : new Handlebars.SafeString(Template.minkProfile(this));
});

Template.tMinkFiles.helpers({
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

Template.tMinkFiles.events({
	'click a.minkAdd': function(event, tpl) {
		console.log('minkAdd click on ' + tpl.data.minkToken);
		mink.pickAndStore({}, {}, { token: tpl.data.minkToken });
	},
	'click a:not(.minkAdd)': function(event, tpl) {
		// fancybox open: handle the event ourselves to avoid conflicts
		event.preventDefault();
		event.stopPropagation();

		/*
		 * Ideally now, we'd like to $(event.target).trigger('click');
		 * Unfortunately owing to a Bootstrap / Fancybox incompatibility,
		 * it's a lot safer to open fancybox manually
		 */
		var rel, out=[], index=0, a=$(event.target);
		if (a[0].tagName == 'IMG')
			a = a.parent();

		rel = a.attr('rel');
		_.each(rel ? $('a[rel='+rel+']') : a, function(el) {
			if (el.getAttribute('href') == a.attr('href'))
				index = out.length;
			out.push({
				type: 'image',
				href: el.getAttribute('href'),
				title: el.getAttribute('title')
			});
		});

		$.fancybox.open(out, { index: index });
	} 
});

Template.tMinkFiles.rendered = function() {
	$('div.minkThumbs a').fancybox();
}

Template.tMinkProfile.rendered = function() {
	// TODO, specify profile/sizes in options
	var height = mink.profiles.profilePic.minkOptions.croppedHeight,
		width = mink.profiles.profilePic.minkOptions.croppedWidth; 

	$(this.find('div')).css({ height: height, width: width });
	$(this.find('img')).css({ height: height, width: width });
	$(this.find('a')).css('width', width);
}

Template.tMinkProfile.events({
	'click a': function(event, tpl) {
		event.preventDefault;
	},
	'click a.minkChangePic': function(event, tpl) {
		console.log('minkAdd click on ' + tpl.data.minkToken);
		mink.pickAndStore({}, {}, { token: tpl.data.minkToken, profile: 'profilePic' });
	}	
});

mink.sub = Meteor.subscribe('minkFiles');

mink.jcrop_api = null;
mink.dbStoreCropSave = function() {
	var boxWidth = 500, boxHeight = 500;
	var cropWidth = 120, cropHeight = 150;

	// tellSelect()	 Query current selection values (true size, same as coords)
	// tellScaled()  Query current selection values (interface)
	var selection = jcrop_api.tellSelect();
	console.log(selection);

	this.jcrop_api = null;
};

mink.showPreview = function(coords) {
	var preview = $('#mink_jcrop_preview');
	var target = $('#mink_jcrop_target');
	var data = preview.data();

	var rx = data.cropWidth / coords.w;
	var ry = data.cropHeight / coords.h;

	preview.css({
		width: Math.round(data.trueWidth * rx) + 'px',
		height: Math.round(data.trueHeight * ry) + 'px',
		marginLeft: '-' + Math.round(coords.x * rx) + 'px',
		marginTop: '-' + Math.round(coords.y * ry) + 'px'
	});
}

Meteor.startup(function() {
	var f = {"url":"https://www.filepicker.io/api/file/XKlPZZOqRKWNsWVqOO20","filename":"sexy-fairy.jpg","mimetype":"image/jpeg","size":42869,"key":"profile/KTEwq4IjQsFUDCKMukEi_sexy-fairy.jpg","container":"myrez","isWriteable":true,"userId":"yBzYYBojsJiBSit22","uploadedAt":1389628948140,"token":1389628926601.5137,"profile":"profilePic","unsaved":true,"_id":"v8cifW9CYrq5JFDkP","width":1024,"height":768};
	var o = {"token":1389628926601.5137,"profile":"profilePic","urlType":"s3","thumbHeight":50,"allowUserCrop":true,"croppedHeight":160,"croppedWidth":160,"thumbWidth":50};

	modal({
		title: 'Crop Picture',
		body: 'tMinkProfileCrop',
		save: 'mink.dbStoreCropSave',
		context: {
			fullSizeUrl: f.url
		}
	});

	var boxWidth = 500, boxHeight = 500;
	var cropWidth = 120, cropHeight = 150;

	var scale;
	if (f.width > boxWidth) {		
		scale = boxWidth / f.width;
		boxHeight = boxHeight * scale;
	} else {
		scale =  f.height / boxHeight;
		boxWidth = boxWidth * scale;
	}

	// data for our showPreview() callback passed to Jcrop
	$('#mink_jcrop_preview').data({
		scale: scale,
		cropWidth: cropWidth, cropHeight: cropHeight,
		trueWidth: f.width, trueHeight: f.height
	});

	$('#mink_jcrop_target').css({
		// Set image to final width/height (capped/scaled boxWidth/Height)
		width: boxWidth, height: boxHeight
	}).Jcrop({
		trueSize: [f.width, f.height],			// REAL image size (unscaled)
		allowSelect: false,						// don't let user set selection
		aspectRatio: cropWidth / cropHeight,	// force fixed aspect ratio
		onChange: mink.showPreview,				// update preview on move
		onSelect: mink.showPreview				// and on init / setSelect
	}, function() {
		// post JCrop init, store api variable
		mink.jcrop_api = this;

		// Start centered (TODO, facial recognition :))
		mink.jcrop_api.setSelect([
			f.width/2-cropWidth/2, f.height/2-cropHeight/2,
			f.width/2+cropWidth/2, f.height/2+cropHeight/2
		]);
	});

});
