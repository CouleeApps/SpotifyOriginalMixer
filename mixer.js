(function($) {
	//Init Spotify api
	var api = new SpotifyWebApi();
	api.setAccessToken(getAuthCookie());
	api.setPromiseImplementation(Q);

	var user;
	var playlistList = [
		new SavedLibrary()
	];

	//Load library
	api.getMe().then(function(me) {
		user = me;
		return loadList(api.getUserPlaylists.bind(api, me.id));
	}).then(function(playlists) {
		//Add the new playlists to the playlist list
		playlistList = playlistList.concat(playlists.map(function(playlist) {
			return new Playlist(playlist);
		}));

		var $playlistList = $('.playlist-list');
		var playlistTemplate = Handlebars.compile($('#playlist-list-template').html());

		playlistList.forEach(function(playlist) {
			var $listItem = $(playlistTemplate(playlist));
			$playlistList.append($listItem);

			$listItem.click(function() {
				$playlistList.find('.playlist.selected').removeClass('selected');
				$listItem.addClass('selected');
				loadPlaylist(playlist);
			});
		})
	});

	function loadPlaylist(playlist) {
		//Cancel anything we were doing
		if (window.stop !== undefined) {
			window.stop();
		} else if(document.execCommand !== undefined) {
			document.execCommand("Stop", false);
		}

		//Clear the list of songs to prepare for the new one
		var $foundList = $('#track-list');
		$foundList.empty();

		//And create a loading bar for us
		var loadingTemplate = Handlebars.compile($('#loading-bar-template').html());
		var $loadingBar = $(loadingTemplate({}));
		$foundList.append($loadingBar);

		//Get everything (and update progress while we do)
		loadList(playlist.getTracksFn(api), undefined, undefined, function(progress) {
			$loadingBar.find('.progress-bar').width((progress * 100) + '%');
		}).then(function(library) {
			$loadingBar.remove();

			//These have extra metadata about when they were added. We just want the track
			// object, which is here:
			library = library.map(function(track) {
				return track.track;
			});
			var radioTracks = library.slice();
			//Remove ID tracks, we can't fix that
			radioTracks.filter(function(track) {
				return track.name !== 'id' && track.artists[0].name !== 'id';
			});
			//Get track and album data
			radioTracks.map(function(track) {
				extractName(track);

				track.hasRadio = track.radio;
				track.hasExtended = !track.radio;

				if (track.radio) {
					track.radioUri = track.uri;
				}

				return track;
			});

			//List all the songs using a template (how convenient)
			var radioTemplate = Handlebars.compile($('#radio-list-template').html());

			radioTracks.forEach(function(track) {
				track.row = $(radioTemplate(track));
				$foundList.append(track.row);
			});

			var $extendButton = $('#extend');
			$extendButton.removeClass('hidden');
			$extendButton.click(function() {
				$extendButton.attr('disabled', 'disabled');
				$extendButton.off('click');

				Q.map(radioTracks, findExtendedMix.bind(this, api), function(radioTrack, track) {
					track.hasExtended = !track.radio;
					track.hasRadio = radioTrack.radio;
					track.failed = track.hasRadio && !track.hasExtended;

					if (radioTrack.radio) {
						track.radioUri = radioTrack.uri;
					}

					var $trackRow = $('#track-' + radioTrack.id);
					$trackRow.replaceWith(radioTemplate(track));
				}).then(function(extendedList) {
					var $createPlaylistButton = $('#create-playlist');
					$createPlaylistButton.removeClass('hidden');
					$createPlaylistButton.click(function() {
						$createPlaylistButton.attr('disabled', 'disabled');
						$createPlaylistButton.off('click');

						var extendedPlaylist;
						api.createPlaylist(user.id, {
							name: 'Extended Songs - ' + playlist._object.name,
							public: false,
							description: ''
						}).then(function(response) {
							extendedPlaylist = new Playlist(response);

							//List of URIs of all the tracks to add
							var addUris = extendedList.filter(function(track) {
								return !isRadioTrack(track);
							}).map(function(track) { //Get Uri
								return track.uri;
							}).chunk(100); //Chunks of 100 at a time

							return Q.forEach(addUris, extendedPlaylist.addTracksFn(api));
						}).then(function() {
							var $openPlaylistButton = $('#open-playlist');
							$openPlaylistButton.removeClass('hidden');
							$openPlaylistButton.attr('href', extendedPlaylist._object.uri);
						});
					});
					var $overwritePlaylistButton = $('#overwrite-playlist');
					$overwritePlaylistButton.removeClass('hidden');
					$overwritePlaylistButton.click(function() {
						$overwritePlaylistButton.attr('disabled', 'disabled');
						$overwritePlaylistButton.off('click');

						//URIs to delete from the playlist
						var oldUris = library.map(function(track) {
							return track.uri;
						}).chunk(100);

						//List of URIs of all the tracks to add
						var addUris = extendedList.map(function(track) {
							return track.uri;
						}).chunk(100);

						Q.forEach(oldUris, playlist.removeTracksFn(api)).then(function() {
							return Q.forEach(addUris, playlist.addTracksFn(api));
						}).then(function() {
							var $openPlaylistButton = $('#open-playlist');
							$openPlaylistButton.removeClass('hidden');
							$openPlaylistButton.attr('href', playlist._object.uri);
						});
					});

				}, function(err) {

				});
			});
		}, function(err) {

		});
	}
})(jQuery);
