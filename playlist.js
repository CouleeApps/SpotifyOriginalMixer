Playlist = function(object) {
	this._object = object;
	this.id = object.id;
	this.name = this._object.name;
};

Playlist.prototype.getTracksFn = function(api) {
	return api.getPlaylistTracks.bind(api, this._object.owner.id, this.id);
};

Playlist.prototype.addTracksFn = function(api) {
	return api.addTracksToPlaylist.bind(api, this._object.owner.id, this.id);
};

Playlist.prototype.removeTracksFn = function(api) {
	return api.removeTracksFromPlaylist.bind(api, this._object.owner.id, this.id);
};

SavedLibrary = function() {
	this.name = "Saved Tracks";
};

SavedLibrary.prototype.getTracksFn = function(api) {
	return api.getMySavedTracks.bind(api);
};

SavedLibrary.prototype.addTracksFn = function(api) {
	return api.addToMySavedTracks.bind(api);
};

SavedLibrary.prototype.removeTracksFn = function(api) {
	return api.removeFromMySavedTracks.bind(api);
};
