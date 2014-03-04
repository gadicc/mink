Handlebars.registerHelper('minkFiles', function() {
	console.log(this, arguments);
	if (!this.rel) this.rel = this._id || 'group';
	if (this.token) this.minkToken = this.token;
	if (this._id && !this.files && !this.editable)
		return null;
	if (!this.minkToken)
		this.minkToken = this._id || mink.randomToken();

	return typeof(Package.spacebars) == 'object'
		? Template.tMinkFiles : new Handlebars.SafeString(Template.minkFiles(this));
});

Handlebars.registerHelper('minkProfile', function() {
	console.log(this, arguments);
	if (this.token) this.minkToken = this.token;
	if (this._id && !this.profilePic && !this.editable)
		return null;
	if (!this.minkToken)
		this.minkToken = this._id || mink.randomToken();

	// withData
	return Template.tMinkProfile;
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
		var minkOptions = { token: tpl.data.minkToken };

		if (tpl.data.hasOwnProperty('thumbHeight'))
			minkOptions.thumbHeight = tpl.data.thumbHeight;
		if (tpl.data.hasOwnProperty('thumbWidth'))
			minkOptions.thumbWidth = tpl.data.thumbWidth;

		mink.pickAndStore({}, {}, minkOptions);
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

	var $img = $(this.find('img'));
	$img.css({ height: height, width: width });
	if ($img.attr('src') == '')
		$img.attr('src', '/packages/mink/no_avatar.jpg');
	$(this.find('div')).css({ height: height, width: width });
	$(this.find('a')).css('width', width);
}

Template.tMinkProfile.events({
	'click a': function(event, tpl) {
		event.preventDefault;
	},
	'click a.minkChangePic': function(event, tpl) {
		console.log('minkAdd click on ' + tpl.data.minkToken);

		var minkOptions = { token: tpl.data.minkToken, profile: 'profilePic' };
		if (tpl.data.done) minkOptions.doneCallback = tpl.data.done;

		// store the minkToken in the element itself, so we can find it
		// again later to update the pic
		$(event.target)
			.closest('div.minkProfileWrapper')
			.attr('data-mink-token', tpl.data.minkToken);

		mink.pickAndStore({}, {}, minkOptions);
	}	
});

mink.sub = Meteor.subscribe('minkFiles');

mink.dbStoreCrop = function(f, store_options, minkOptions) {
	// initial store... thumbnail placeholder will be shown
	mink.dbStore(f, minkOptions);

	// get original image dimensions
	filepicker.stat(f, { width: true, height: true }, function(stats) {

		_.extend(f, stats); // add width+height to object
		mink.files.update(f._id, {$set: { width: f.width, height: f.height }});
		mink.userJcrop(f, store_options, minkOptions);

	});
}

/*
 * All code relating to UI/Jcrop.  Given a file object / inkblob (which must
 * include width/height properties), open a modal allowing the user to crop
 * the image, and call our save callback
 */
mink.jcrop_api = null;
mink.userJcrop = function(f, store_options, minkOptions) {
	modal({
		title: 'Crop Picture',
		body: 'tMinkProfileCrop',
		save: 'mink.dbStoreCropSave',
		context: { fullSizeUrl: f.url },
		data: {
			fileId: f._id,
			store_options: store_options,
			minkOptions: minkOptions
		},
		width: 700
	});

	var boxWidth = 500, boxHeight = 500;
	var cropWidth = minkOptions.croppedWidth || 120,
		cropHeight = minkOptions.croppedHeight || 150;

	var scale;
	if (f.width > boxWidth) {		
		scale = boxWidth / f.width;
		boxHeight = f.height * scale;
	} else {
		scale =  boxHeight / f.height;
		boxWidth = f.width * scale;
	}

	// data for our showPreview() callback passed to Jcrop
	$('#mink_jcrop_preview').data({
		scale: scale,
		cropWidth: cropWidth, cropHeight: cropHeight,
		trueWidth: f.width, trueHeight: f.height
	}).parent().css({
		width: cropWidth, height: cropHeight
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
};

mink.dbStoreCropSave = function(event, tpl, data) {
	var f = mink.files.findOne(data.data.fileId);
	var selection = mink.jcrop_api.tellSelect();
	var minkOptions = data.data.minkOptions;
	var store_options = data.data.store_options;
	mink.jcrop_api = null;	// done with this

	// crop image
	filepicker.convert(f,
		{ crop: [Math.round(selection.x), Math.round(selection.y),
				Math.round(selection.w), Math.round(selection.h)] },
		store_options,
		function(croppedFile) {
			// receive cropped image and scale it
			filepicker.convert(
				croppedFile,
				{
					width: minkOptions.croppedWidth,
					height: minkOptions.croppedHeight,
					fit: 'scale'
				},
				store_options,
				function(FPFile) {

					// This is where we end.  Save the cropped & scaled file
					FPFile.width = minkOptions.croppedWidth;
					FPFile.height = minkOptions.croppedHeight;
					mink.files.update(f._id, {$set: { csFile: FPFile }});
					f.csFile = FPFile;

					// delete original cropped only (unscaled) image
					filepicker.remove(croppedFile, function(){
					        console.log("Removed");
					});

					$div = $('div.minkProfileWrapper[data-mink-token="'
						+ minkOptions.token + '"]');
					$div.attr('data-mink-id', f._id);
					$div.find('img').attr('src', mink.url(f.csFile));

					if (minkOptions.doneCallback && window[minkOptions.doneCallback])
						window[minkOptions.doneCallback](f);

					// TODO, save thumbnail aswell

				}, function(FPError) {
					console.log(FPError);
				}, function(percent) {
					// TODO
					console.log('scale ' + percent);
				}
			);

		}, function(FPError) {
			console.log(FPError);
		}, function(percent) {
			// TODO
			console.log('crop ' + percent);
		});
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
	return;
	var f = {"url":"https://www.filepicker.io/api/file/XKlPZZOqRKWNsWVqOO20","filename":"sexy-fairy.jpg","mimetype":"image/jpeg","size":42869,"key":"profile/KTEwq4IjQsFUDCKMukEi_sexy-fairy.jpg","container":"myrez","isWriteable":true,"userId":"yBzYYBojsJiBSit22","uploadedAt":1389628948140,"token":1389628926601.5137,"profile":"profilePic","unsaved":true,"_id":"v8cifW9CYrq5JFDkP","width":1024,"height":768};
	var store_options = {"location":"S3","path":"/profile/","access":"public"};
	var minkOptions = {"token":1389628926601.5137,"profile":"profilePic","urlType":"s3","thumbHeight":50,"allowUserCrop":true,"croppedHeight":160,"croppedWidth":160,"thumbWidth":50,"doneCallback":"saveUserPic"};
	mink.userJcrop(f, store_options, minkOptions);
});
