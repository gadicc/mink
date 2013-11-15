mink.files.allow({
	insert: function() {
		// for their own userid only
		return true;
	},
	update: function() {
		// allow remove of unsaved, change of token only
		return true;
	}
});

Meteor.publish('minkFiles', function() {
	return mink.files.find({userId: this.userId, unsaved: true});
});

Meteor.methods({
	'reMinData': function(collection, key) {
		collection = docs;
		return mink.reMinData(collection, key);
	}
});