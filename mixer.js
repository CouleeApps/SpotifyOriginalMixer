let $ = jQuery.noConflict();

class Mixer {
	constructor(accessToken) {
		this.accessToken = accessToken;
		Promise.resolve(this.init());
	}
	async init() {
		//Init Spotify api
		this.api = new SpotifyWebApi();
		this.api.setAccessToken(this.accessToken);
		this.api.setPromiseImplementation(Q);

		this.playlistList = [
			new SavedLibrary()
		];

		this.templates = await loadTemplates([
			{id: "loading-bar", href: "template/loading-bar.twig"},
			{id: "playlist-list", href: "template/playlist-list.twig"},
			{id: "radio-list-item", href: "template/radio-list-item.twig"}
		]);

		//Load library
		this.user = await this.api.getMe();

		this.playlists = await loadList((options) => this.api.getUserPlaylists(this.user.id, options));
		//Add the new playlists to the playlist list
		this.playlistList = this.playlistList.concat(this.playlists.map(function (playlist) {
			return new Playlist(playlist);
		}));

		let $playlistList = $('.playlist-list');

		this.playlistList.forEach((playlist) => {
			let $listItem = $(this.templates['playlist-list'].render(playlist));
			$playlistList.append($listItem);

			$listItem.click(() => {
				$playlistList.find('.playlist.selected').removeClass('selected');
				$listItem.addClass('selected');
				Q.resolve(this.loadPlaylist(playlist));
			});
		})
	}

	async loadPlaylist(playlist) {
		//Cancel anything we were doing
		if (window.stop !== undefined) {
			window.stop();
		} else if (document.execCommand !== undefined) {
			document.execCommand("Stop", false);
		}

		//Clear the list of songs to prepare for the new one
		let $foundList = $('#track-list');
		$foundList.empty();

		//And create a loading bar for us
		let $loadingBar = $(this.templates['loading-bar'].render({}));
		$foundList.append($loadingBar);

		//Get everything (and update progress while we do)
		this.library = await loadList(playlist.getTracksFn(this.api), undefined, undefined, (progress) => {
			$loadingBar.find('.progress-bar').width((progress * 100) + '%');
		});
		$loadingBar.remove();

		//These have extra metadata about when they were added. We just want the track
		// object, which is here:
		this.library = this.library.map((track) => {
			return track.track;
		});
		let radioTracks = this.library.slice();
		//Remove ID tracks, we can't fix that
		radioTracks.filter((track) => {
			return track.name !== 'id' && track.artists[0].name !== 'id';
		});
		//Get track and album data
		radioTracks.map((track) => {
			extractName(track);

			track.hasRadio = track.radio;
			track.hasExtended = !track.radio;

			if (track.radio) {
				track.radioUri = track.uri;
				track.trackRadioURL = getOpenURL(track.radioUri);
			}

			track.trackURL = getOpenURL(track.uri);
			track.albumImage64 = getAlbumImage(track, 64);

			return track;
		});

		//List all the songs using a template (how convenient)
		radioTracks.forEach((track) => {
			track.row = $(this.templates['radio-list-item'].render(track));
			$foundList.append(track.row);
		});

		let $extendButton = $('#extend');
		$extendButton.removeClass('hidden');
		$extendButton.click(() => {
			$extendButton.attr('disabled', 'disabled');
			$extendButton.off('click');
			Q.resolve(this.extendPlaylist(playlist, radioTracks));
		});
	}

	async extendPlaylist(playlist, radioTracks) {
		let extendedList = await Q.map(radioTracks, (track) => findExtendedMix(this.api, track), (radioTrack, trackInfo) => {
			// results
			// radio
			// extended

			let track = trackInfo.extended;
			if (track === undefined) {
				track = trackInfo.radio;
			}

			track.hasExtended = !track.radio;
			track.hasRadio = radioTrack.radio;
			track.failed = track.hasRadio && !track.hasExtended;

			if (radioTrack.radio) {
				track.radioUri = radioTrack.uri;
				track.trackRadioURL = getOpenURL(radioTrack.uri);
			}

			track.trackURL = getOpenURL(track.uri);
			track.albumImage64 = getAlbumImage(track, 64);

			let $trackRow = $('#track-' + radioTrack.id);
			$trackRow.replaceWith(this.templates['radio-list-item'].render(track));
		});
		let $createPlaylistButton = $('#create-playlist');
		$createPlaylistButton.removeClass('hidden');
		$createPlaylistButton.click(() => {
			$createPlaylistButton.attr('disabled', 'disabled');
			$createPlaylistButton.off('click');

			Q.resolve(this.createExtendedPlaylist(playlist, extendedList));
		});
		let $overwritePlaylistButton = $('#overwrite-playlist');
		$overwritePlaylistButton.removeClass('hidden');
		$overwritePlaylistButton.click(() => {
			$overwritePlaylistButton.attr('disabled', 'disabled');
			$overwritePlaylistButton.off('click');

			Q.resolve(this.overwritePlaylist(playlist, extendedList));
		});
	}

	async createExtendedPlaylist(playlist, extendedList) {
		let extendedPlaylist;
		let response = await this.api.createPlaylist(this.user.id, {
			name: 'Extended Songs - ' + playlist._object.name,
			public: false,
			description: ''
		});
		extendedPlaylist = new Playlist(response);

		//List of URIs of all the tracks to add
		let addUris = extendedList.filter(function (track) {
			return !isRadioTrack(track);
		}).map(function (track) { //Get Uri
			return track.uri;
		}).chunk(100); //Chunks of 100 at a time

		await Q.forEach(addUris, extendedPlaylist.addTracksFn(this.api));

		let $openPlaylistButton = $('#open-playlist');
		$openPlaylistButton.removeClass('hidden');
		$openPlaylistButton.attr('href', extendedPlaylist._object.uri);
	}

	async overwritePlaylist(playlist, extendedList) {
		//URIs to delete from the playlist
		let oldUris = this.library.map(function (track) {
			return track.uri;
		}).chunk(100);

		//List of URIs of all the tracks to add
		let addUris = extendedList.map(function (track) {
			return track.uri;
		}).chunk(100);

		await Q.forEach(oldUris, playlist.removeTracksFn(this.api)).then(function () {
			return Q.forEach(addUris, playlist.addTracksFn(this.api));
		});

		let $openPlaylistButton = $('#open-playlist');
		$openPlaylistButton.removeClass('hidden');
		$openPlaylistButton.attr('href', playlist._object.uri);
	}
}

mixer = new Mixer(getAuthCookie());
