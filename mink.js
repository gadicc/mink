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
                thumbHeight: 120
            }
        }, 'docs': {
            store_options: { path: '/docs/' }
        }
	},

	extIcons: {
		'xls' : 'Microsoft_Excel_icon.gif',
		'doc' : 'msword_icon.gif',
		'pdf' : 'pdf-icon.png',
		'zip' : 'winzip_icon_xp.gif',
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

		// Copy one level of default profile options for picker_options, store_options
		// i.e. user has specified new defaults for default profile
		if (options.profiles && options.profiles.default) {
			var t = this.profiles.default, o = options.profiles.default;
			o.picker_options = _.extend(t.picker_options, o.picker_options);
			o.store_options = _.extend(t.store_options, o.store_options);
			o.minkOptions = _.extend(t.minkOptions, o.minkOptions);
		}
		_.extend(this, options);
	},

	/*
	 * Given a profile name, fills picker_options, store_options, etc, with values
	 * from default profile, overridden by values in specified profile
	 */
	setOpts: function(profile, picker_options, store_options, minkOptions) {
		_.extend(picker_options, this.profiles['default'].picker_options,
			this.profiles[profile] ? this.profiles[profile].picker_options : {});
		_.extend(store_options, this.profiles['default'].store_options,
			this.profiles[profile] ? this.profiles[profile].store_options: {});
		_.extend(minkOptions, this.profiles['default'].minkOptions,
			this.profiles[profile] ? this.profiles[profile].minkOptions: {});
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

	dbStorePic: function(f, minkOptions) {
		// initial store... thumbnail placeholder will be shown
		mink.dbStore(f, minkOptions);

		// get original image dimensions
		filepicker.stat(f, { width: true, height: true }, function(stats) {
			
			_.extend(f, stats); // add width+height to object, don't save yet

			if (f.height > minkOptions.thumbHeight) {

				var height = minkOptions.thumbHeight;
				var width = Math.floor(f.width * (minkOptions.thumbHeight / f.height));

				// request conversion
				filepicker.convert(f, { width: width, height: height },
					function(thumbBlob) {
						thumbBlob.width = width;
						thumbBlob.height = height;
						f.thumb = thumbBlob;

						// save original image dimensions + thumbnail data
						mink.files.update(f._id, {$set: {
							width: f.width, height: f.height, thumb: f.thumb
						}});
					});

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
		if (f.mimetype.match(/^image/))
			min.thumb = {
				width: f.thumb.width,
				height: f.thumb.height,
				url: mink.url(f)
			}
		else
			min.size = f.size;
		return min;
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
		  files = mink.files.find({token: token}, { fields: {_id: true }}).fetch();
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
		var profile = 'default';

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
			for (var i=0, f=InkBlobs[i]; i < InkBlobs.length; f=InkBlobs[++i]) {
				if (f.mimetype.match(/^image/)) {
					mink.dbStorePic(f, minkOptions);
				} else {
					mink.dbStore(f, minkOptions);
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
