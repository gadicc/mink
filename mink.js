mink = {
	files: new Meteor.Collection('minkFiles'),
	inkKey: null,

	profiles: {
		'default': {
			picker_options: {
				multiple: true
			},
			store_options: {
				location: 'S3',
				path: '/default/',
				access: 'public'
			},
			minkOptions: {
				urlType: 'ink',
				thumbHeight: 80
			}
		}, 'profilePic': {
            picker_options: {
                mimetypes: ['image/*'],
                multiple: false             
            },
            store_options: {
                path: '/profile/'
            },
            minkOptions: {
            	allowUserCrop: true,
            	croppedHeight: 160,
            	croppedWidth: 160,
                thumbHeight: 50,
                thumbWidth: 50,
            }
        }, 'docs': {
            store_options: { path: '/docs/' }
        }
	},

	extIcons: {
		'xls' : 'Microsoft_Excel_icon.gif',
		'doc' : 'msword_icon.gif',
		'docx' : 'msword_icon.gif',
		'pdf' : 'pdf-icon.png',
		'zip' : 'winzip_icon_xp.gif',
		'mp3' : 'mp3_icon_32.png',
		  '*' : ''
	},

	extIcon: function(filename) {
		var ext = filename.match(/\.(.*?)$/)[1].toLowerCase();
		return this.extIcons[ext] || this.extIcons['*'];
	},

	init: function(key, options) {
		// Allow for init(key, options), init(key), init({ key: key, optA: B, etc })
		if (_.isString(key))
			this.inkKey = key;
		else if (!options)
			options = key;
		else
			throw new Error("mink.init called with invalid parameters.  Usage: mink.init(key, options)");

		if (!options)
			options = {};
		if (options.inkKey)
			this.inkKey = options.inkKey;

		if (!this.inkKey)
			throw new Error("mink.init failed, no inkKey specified as 1st param or option");

		Meteor.startup(function() {
			filepicker.setKey(mink.inkKey);
		});

		if (options.profiles) {
			if (Meteor.isClient) {
				$.extend(true, this.profiles, options.profiles);
			} else if (Meteor.isServer) {
				// TODO UNTESTED
				var extend = Npm.require('xtend');
				this.profiles = extend(this.profiles, options.profiles);
			}
		}
	},

	/*
	 * Given a profile name, fills picker_options, store_options, etc, with values
	 * from default profile, overridden by values in specified profile,
	 * overriden by specified options (if any)
	 */
	setOpts: function(profile, picker_options, store_options, minkOptions) {
		/*
		 * _.extend(obj, ..., _.clone(obj)) necessary for desired effect
		 * We want to update the original object rather than create a new
		 * one, since we were given reference.  But we still want the original
		 * values to take priority, so we clone the object before the operatn.
		 */
		_.extend(picker_options, this.profiles['default'].picker_options,
			this.profiles[profile] ? this.profiles[profile].picker_options : {},
			_.clone(picker_options));
		_.extend(store_options, this.profiles['default'].store_options,
			this.profiles[profile] ? this.profiles[profile].store_options: {},
			_.clone(store_options));
		_.extend(minkOptions, this.profiles['default'].minkOptions,
			this.profiles[profile] ? this.profiles[profile].minkOptions: {},
			_.clone(minkOptions));
		minkOptions.profile = profile;
	},

	dbStore: function(f, minkOptions) {
		f.userId = Meteor.userId();
		f.uploadedAt = new Date().getTime();
		f.token = minkOptions.token;
		f.profile = minkOptions.profile;
		f.unsaved = true;

		f._id = mink.files.insert(f);
		return f;
	},

	dbMarkSaved: function(ids) {
		if (_.isArray(ids))
			mink.files.update({_ids: {$in: ids}}, {$unset: {unsaved: 1}});
		else
			mink.files.update(ids,{$unset: {unsaved: 1}});
	},

	dbStorePic: function(f, minkOptions, store_options) {
		// initial store... thumbnail placeholder will be shown
		mink.dbStore(f, minkOptions);

		// get original image dimensions
		filepicker.stat(f, { width: true, height: true }, function(stats) {
			
			_.extend(f, stats); // add width+height to object, don't save yet

			var width = null, height = null;
			if (minkOptions.thumbHeight && minkOptions.thumbHeight == '*')
				delete(minkOptions.thumbHeight);
			if (minkOptions.thumbWidth && minkOptions.thumbWidth == '*')
				delete(minkOptions.thumbWidth);

			console.log(f);
			console.log(minkOptions);

			if (minkOptions.thumbHeight && minkOptions.thumbWidth) {

				// if both are specified, force thumbnail to this size
				// ROADMAP, allow crop/stretch/center strategies
				height = minkOptions.thumbHeight;
				width = minkOptions.thumbWidth;

			} else if (minkOptions.thumbHeight && f.height > minkOptions.thumbHeight) {

				// scale down to specified height
				height = minkOptions.thumbHeight;
				width = Math.floor(f.width * (minkOptions.thumbHeight / f.height));

			} else if (minkOptions.thumbWidth && f.width > minkOptions.thumbWidth) {

				// scale down to specified width
				width = minkOptions.thumbWidth;
				height = Math.floor(f.height * (minkOptions.thumbWidth / f.width));
			}

			if (width || height) {

				// request conversion
				filepicker.convert(f, { width: width, height: height },
					store_options,
					function(thumbBlob) {
						thumbBlob.width = width;
						thumbBlob.height = height;
						f.thumb = thumbBlob;

						// save original image dimensions + thumbnail data
						mink.files.update(f._id, {$set: {
							width: f.width, height: f.height, thumb: f.thumb
						}});
					}
				);

			} else {

				mink.files.update(f._id, {$set: { width: width, height: height }});

			}
		});
	},

	ids: function(token) {
		if (!token) token = Session.get('minkToken');
		var files = mink.files.find({token: token}, { fields: {_id: true }}).fetch();
		return _.pluck(files, '_id');
	},

	/*
	 * Return the essential data which could be stored in documents inline.  This
	 * is the minimum data required to render the default minkFiles template.
	 */
	minDataForFile: function(f) {
		var min = {
			     _id: f._id,
			mimetype: f.mimetype,
			filename: f.filename,
			     url: mink.url(f)
		};
		console.log(f);
		if (f.mimetype.match(/^image/)) {
			if (f.thumb)
				min.thumb = {
					width: f.thumb.width,
					height: f.thumb.height,
					url: mink.url(f.thumb)
				}
			if (f.csFile)
				min.csFile = {
					width: f.csFile.width,
					height: f.csFile.height,
					url: mink.url(f.csFile)
				}
		} else
			min.size = f.size;
		return min;
	},
	minDataForId: function(id) {
		var f = mink.files.findOne({_id: id});
		return mink.minDataForFile(f);
	},
	minDataForIds: function(ids) {
		var files = mink.files.find({_id: {$in: ids}}).fetch();
		var out = [];
		_.each(files, function(f) {
			out.push(mink.minDataForFile(f));
		});
		return out;
	},
	minData: function(token, save) {
		console.log('minData called with token ' + token);
		if (!token) token = Session.get('minkToken');
		var out = [],
		  files = mink.files.find({token: token}).fetch();
		_.each(files, function(f) {
			out.push(mink.minDataForFile(f));
			if (save)
				mink.dbMarkSaved(f._id);
		});
		//if (save !== false)
		//	this.dbMarkSaved(_.pluck(out, '_id'));
		return out;
	},
	minDataSave: function(token) {
		return mink.minData(token, true);
	},
	reMinData: function(collection, key) {
		var docs, query = {};
		if (!key) key='files';
		query[key] = { $exists: true };
		docs = collection.find(query).fetch();

		_.each(docs, function(doc) {
			var files = mink.minDataForIds(_.pluck(doc.files, '_id'));
			collection.update(doc._id, {$set: { files: files }});
		});
	},

	url: function(f, type) {
		if (!_.isObject(f))
			f = mink.files.findOne(id);
		if (!f.key)
			return f.url;
		if (!type) {
			var profile = this.profile || 'default';
			type = mink.profiles[profile].minkOptions.urlType
			    || mink.profiles['default'].minkOptions.urlType;
		}
		if (type == 's3') {
			return '//s3-eu-west-1.amazonaws.com/myrez/' + f.key;
		} else
			return f.url;
	},

	pickAndStore: function(picker_options, store_options, minkOptions) {
		// Set up default and profile options
		var profile = minkOptions.profile || 'default';

		if (_.isString(picker_options)) {
			profile = picker_options;
			picker_options = {};
		} else if (!picker_options)
			picker_options = {};
		if (!minkOptions)
			minkOptions = {};

		if (_.isEmpty(picker_options)) {
			if (!store_options) store_options = {};
			this.setOpts(profile, picker_options, store_options, minkOptions);
		}

		if (!minkOptions.token)
			minkOptions.token = Session.get('minkToken') || new Date().getTime();
		if (minkOptions.token != Session.get('minkToken'))
			Session.set('minkToken', minkOptions.token);

		console.log('pickAndStore called with token ' + minkOptions.token);

		filepicker.pickAndStore(picker_options, store_options, function(InkBlobs) {

			console.log(minkOptions);

			if (minkOptions.allowUserCrop) {

				// single picture that user must crop before saving
				mink.dbStoreCrop(InkBlobs[0], store_options, minkOptions);

			}  else {

				// default: multiple files of any type (doc, picture, etc)
				for (var i=0, f=InkBlobs[i]; i < InkBlobs.length; f=InkBlobs[++i]) {
					if (f.mimetype.match(/^image/)) {
						mink.dbStorePic(f, minkOptions, store_options);
					} else {
						mink.dbStore(f, minkOptions);
					}
				}

			}
		}, function(FPError) {
			// TODO, XXX, decide what to do with errors
			console.log(FPError);
			console.log(FPError.toString());
			console.log(JSON.stringify(FPError));
		});
	},

	humanSize: function(bytes) {
	    if (typeof bytes !== 'number') {
	        bytes = parseInt(bytes);
	    }
	    if (bytes >= 1000000000) {
	        return (bytes / 1000000000).toFixed(2) + ' GB';
	    }
	    if (bytes >= 1000000) {
	        return (bytes / 1000000).toFixed(2) + ' MB';
	    }
	    return (bytes / 1000).toFixed(2) + ' KB';
	},

	randomToken: function() {
		return new Date().getTime() + Math.random();
	}

};

