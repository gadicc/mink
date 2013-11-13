mink.files.allow({
	insert: function() {
		return true;
	},
	update: function() {
		return true;
	}
});

Meteor.publish('minkFiles', function() {
	return mink.files.find();
});