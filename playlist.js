class PlaylistLike {
	constructor() {
		if (new.target === PlaylistLike) {
			throw new TypeError("Cannot construct PlaylistLike instances directly");
		}
	}
	getTracksFn(api) { throw new TypeError("Unimplemented: getTracksFn"); }
	addTracksFn(api) { throw new TypeError("Unimplemented: addTracksFn"); }
	removeTracksFn(api) { throw new TypeError("Unimplemented: removeTracksFn"); }
}

class Playlist extends PlaylistLike {
	constructor(object) {
		super();
		this._object = object;
		this.id = object.id;
		this.name = this._object.name;
	}
	getTracksFn(api) {
		return api.getPlaylistTracks.bind(api, this.id);
	}
	addTracksFn(api) {
		return api.addTracksToPlaylist.bind(api, this.id);
	}
	removeTracksFn(api) {
		return api.removeTracksFromPlaylist.bind(api, this.id);
	}
}

class SavedLibrary extends PlaylistLike {
	constructor() {
		super();
		this.name = "Saved Tracks";
	}
	getTracksFn(api) {
		return api.getMySavedTracks.bind(api);
	}
	addTracksFn(api) {
		return api.addToMySavedTracks.bind(api);
	}
	removeTracksFn(api) {
		return api.removeFromMySavedTracks.bind(api);
	}
}

