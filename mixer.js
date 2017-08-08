(function($) {
	//Init Spotify api
	var api = new SpotifyWebApi();
	api.setAccessToken(getAuthCookie());
	api.setPromiseImplementation(Q);

	var user;
	var playlist;
	//Load library
	api.getMe().then(function(me) {
		user = me;
		return loadList(api.getUserPlaylists.bind(api, me.id));
	}).then(function(playlists) {
		//Load the first playlist
		playlist = new Playlist(playlists[0]);
		return loadList(playlist.getTracksFn(api, user.id), 50);
	}).then(function(library) {
		//These have extra metadata about when they were added. We just want the track
		// object, which is here:
		library = library.map(function(track) {
			return track.track;
		});
		var radioTracks = library.filter(isRadioTrack);
		//Remove ID tracks, we can't fix that
		radioTracks.filter(function(track) {
			return track.name !== 'id' && track.artists[0].name !== 'id';
		});
		//Get track and album data
		radioTracks.map(function(track) {
			extractName(track);
			extractName(track.album);
			return track;
		});

		//List all the songs using a template (how convenient)
		var radioTemplate = Handlebars.compile($('#radio-list-template').html());
		var $foundList = $('#found-radio');
		$foundList.append(
			radioTemplate({tracks: radioTracks})
		);

		$extendButton = $('#extend');
		$extendButton.removeClass('hidden');
		$extendButton.click(function() {
			$extendButton.attr('disabled', 'disabled');
			// $extendButton.off('click');

			Q.map(radioTracks, findExtendedMix, function(radioTrack, track) {
				var $trackRow = $('#track-' + radioTrack.id);

				//Switch from loading to found
				$trackRow.find('.extended-version').removeClass('loading');

				var $previewText = $trackRow.find('.extended-version > .preview-text');
				if (isRadioTrack(track)) { //Still radio? We couldn't do it
					$previewText.removeClass('loading');
					$trackRow.addClass('unfound');
				} else {
					$previewText.addClass('hidden');

					var $extendedLink = $trackRow.find('.extended-version > a');
					$extendedLink.removeClass('hidden');
					$extendedLink.attr('href', getOpenURL(track.uri));
					$trackRow.find('.track-info > .album-image').attr('src', getAlbumImage(track, 64));
				}
			}).then(function(extendedList) {
				$createPlaylistButton = $('#create-playlist');
				$createPlaylistButton.removeClass('hidden');
				$createPlaylistButton.click(function() {
					// $createPlaylistButton.attr('disabled', 'disabled');
					// $createPlaylistButton.off('click');

					var extendedPlaylist;
					api.createPlaylist(user.id, {
						name: 'Extended Songs - ' + playlist._object.name,
						public: false,
						description: ''
					}).then(function(response) {
						extendedPlaylist = new Playlist(response);

						//List of URIs of all the tracks to add
						var addUris = extendedList.map(function(track) { //Get Uri
							return track.uri;
						}).chunk(100); //Chunks of 100 at a time

						return Q.forEach(addUris, extendedPlaylist.addTracksFn(api, user.id));
					}).then(function() {
						$openPlaylistButton = $('#open-playlist');
						$openPlaylistButton.removeClass('hidden');
						$openPlaylistButton.attr('href', extendedPlaylist._object.uri);
					});
				})

			}, function(err) {

			});
		});

		/*
		var nonRadioTracks = library.diff(radioTracks);
		var nonRadioTemplate = Handlebars.compile($('#non-radio-list-template').html());
		var $nonRadioList = $('#non-radio');
		$nonRadioList.append(
			nonRadioTemplate({tracks: nonRadioTracks})
		);
		*/

	});


	function findExtendedMix(track) {
		return new Promise(function(accept, reject) {
			loadList(api.searchTracks.bind(api, 'track:' + track.name + ' artist:' + track.artists[0].name), 100).then(function(tracks) {
				//This would be super useless if the extended mix gave you a radio track
				tracks = tracks.filter(function(track) {
					return !isRadioTrack(track);
				});
				//Extract name info
				tracks.map(function(track) {
					extractName(track);
					return track;
				});
				//In case something has the name of an album
				tracks.filter(function(testTrack) {
					return testTrack.name.toLowerCase() === track.name.toLowerCase();
				});

				//Try to match the mix so we get the right version
				tracks = function() {
					function filterMixSuffix(tracks, mixSuffix) {
						//Try to find one with the same mix
						return tracks.filter(function(testTrack) {
							return testTrack.mixSuffix.toLowerCase() === mixSuffix.toLowerCase();
						});
					}

					var mix = track.mixSuffix;
					var test = filterMixSuffix(tracks, mix); if (test.length > 0) return test;
					//Hm nothing with that mix is found. What else can we look for?
					switch (mix) {
						case 'Original Mix':
						case 'Extended Mix':
						case 'Extended Remix':
						case 'Club Mix':
						case 'Club Remix':
						case 'Radio Edit':
						case '':
							//See if any of those work
							test = filterMixSuffix(tracks, 'Original Mix'); if (test.length > 0) return test;
							test = filterMixSuffix(tracks, 'Extended Mix'); if (test.length > 0) return test;
							test = filterMixSuffix(tracks, 'Extended Remix'); if (test.length > 0) return test;
							test = filterMixSuffix(tracks, 'Club Mix'); if (test.length > 0) return test;
							test = filterMixSuffix(tracks, 'Club Remix'); if (test.length > 0) return test;
							test = filterMixSuffix(tracks, ''); if (test.length > 0) return test;
							break;
						default:
							break;
					}

					function replaceMulti(str, replacements) {
						var replaced = str;
						replacements.forEach(function(replacement) {
							replaced = replaced.replace(replacement, '');
						});
						return replaced;
					}

					//Try erasing 'Mix'/'Remix'
					mix = replaceMulti(mix, [' Remix', ' Mix', ' Bootleg']);
					tracks = tracks.map(function(track) {
						track.mixSuffix = replaceMulti(track.mixSuffix, [' Remix', ' Mix', ' Bootleg']);
						return track;
					});

					test = filterMixSuffix(tracks, mix); if (test.length > 0) return test;

					//We've still got nothing. Try cleaning up the name some
					mix = mix.replace(NON_ALPHA_REGEX, '').toLowerCase();
					tracks = tracks.map(function(track) {
						track.mixSuffix = track.mixSuffix.replace(NON_ALPHA_REGEX, '').toLowerCase();
						return track;
					});
					test = filterMixSuffix(tracks, mix); if (test.length > 0) return test;

					function levenshteinFilterMixSuffix(tracks, mixSuffix, distance, ignores) {
						//Try to find one with the same mix
						return tracks.filter(function(testTrack) {
							return levenshtein(
								testTrack.mixSuffix.replace(NON_ALPHA_REGEX, '').toLowerCase(),
								mixSuffix.replace(NON_ALPHA_REGEX, '').toLowerCase()
							) < distance;
						});
					}

					//Catches that one time Armin misspelled Balearic
					test = levenshteinFilterMixSuffix(tracks, mix, 1); if (test.length > 0) return test;
					test = levenshteinFilterMixSuffix(tracks, mix, 3); if (test.length > 0) return test;

					//Nope
					return [];
				}();

				if (tracks.length === 0) {
					accept(track);
					return;
				}

				//Revert the changes that selection caused
				tracks.map(function(track) {
					track.name = track.radioName;
					extractName(track);
					return track;
				});

				//Sort by length since we want the longest track
				tracks.sort(function(a, b) {
					if (b.duration_ms !== a.duration_ms) {
						return b.duration_ms - a.duration_ms;
					}
					if (b.popularity !== a.popularity) {
						return b.popularity - a.popularity;
					}
					return 0;
				});

				//Pick the best one
				accept(tracks[0]);
			}, reject);
		});
	}
})(jQuery);
