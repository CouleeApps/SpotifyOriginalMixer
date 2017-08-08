Playlist = function(object) {
	this._object = object;
	this.id = object.id;
};

Playlist.prototype.getTracksFn = function(api, userId) {
	return api.getPlaylistTracks.bind(api, userId, this.id);
};

Playlist.prototype.addTracksFn = function(api, userId) {
	return api.addTracksToPlaylist.bind(api, userId, this.id);
};

SavedLibrary = function() {

};

SavedLibrary.prototype.getTracksFn = function(api) {
	return api.getMySavedTracks.bind(api);
};
