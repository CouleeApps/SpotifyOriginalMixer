Array.prototype.diff = function(a) {
	return this.filter(function(i) {
		return a.indexOf(i) < 0;
	});
};

//https://gist.github.com/andrei-m/982927
function levenshtein(a, b){
	var tmp;
	if (a.length === 0) { return b.length; }
	if (b.length === 0) { return a.length; }
	if (a.length > b.length) { tmp = a; a = b; b = tmp; }

	var i, j, res, alen = a.length, blen = b.length, row = new Array(alen);
	for (i = 0; i <= alen; i++) { row[i] = i; }

	for (i = 1; i <= blen; i++) {
		res = i;
		for (j = 1; j <= alen; j++) {
			tmp = row[j - 1];
			row[j - 1] = res;
			res = b[i - 1] === a[j - 1] ? tmp : Math.min(tmp + 1, Math.min(res + 1, row[j] + 1));
		}
	}
	return res;
}


(function($) {
	//Init Spotify api
	var api = new SpotifyWebApi();
	api.setAccessToken(getAuthCookie());
	api.setPromiseImplementation(Q);

	function loadPlaylist(cb, max, offset) {
		//Start at the start if we don't care
		if (typeof(offset) === 'undefined') {
			offset = 0;
		}

		var MAX_LIMIT = 50;
		var list = [];

		function _loadPart(accept, reject, offset, limit, max) {
			//Poll the API
			return cb({
				limit: limit,
				offset: offset
			}).then(function(data) {
				//Add all the tracks to the list array
				if (typeof(data.items) !== 'undefined') {
					data.items.forEach(function(info) {
						var track = info.track;
						list.push(track);
					});
				} else if (typeof(data.tracks.items) !== 'undefined') {
					data.tracks.items.forEach(function(track) {
						list.push(track);
					});

					//Because this has all the info
					data = data.tracks;
				}
				//Load all if we haven't specified a max
				if (typeof(max) === 'undefined') {
					max = data.total;
				}

				//Find what the parameters for the next request are
				var offset = data.offset + data.limit;
				var limit = Math.min(data.limit, Math.min(max, data.total) - offset);
				if (limit <= 0) {
					return accept(list);
				}
				//And send it off (async recursion woo)
				return _loadPart(accept, reject, offset, limit, max);
			}, reject);
		}

		return new Promise(function(accept, reject) {
			return _loadPart(accept, reject, offset, MAX_LIMIT, max);
		});
	}


	var ALBUM_SUFFIX_REGEX = /[\[\(]([A-Z]+\s*\d*( - Part \d+)?)[\]\)]/;
	var SPECIAL_SUFFIX_REGEX = /([\[\(](.*?)[\]\)]|\*\*(.*?)\*\*)/;
	var MIX_SUFFIX_REGEX = / - (.*)/;
	var NON_ALPHA_REGEX = /[^a-zA-Z]/g;

	function isRadioTrack(track) {
		//What counts as a "radio song"?
		//Yes:
		// Brainflush [Push The Button] [ABGT172] - Tom Fall Remix
		// Memories [ABGT160]
		// We Need Them [ASOT 484] - Original Mix
		// Like A Miracle (ASOT 803) [Future Favorite] - Denis Kenzo Remix
		//No:
		// Heliopause - Original Mix
		// Edge of Life - Extended Mix
		// Small Box For A Big Man

		//The trend here is something like this:
		// [SHOW 123] / (SHOW123)
		//Roughly. Ymmv.

		if (track.name.match(ALBUM_SUFFIX_REGEX) !== null) {
			return true;
		}

		//Obvious signs it's a radio song
		if (track.name.indexOf('Mix Cut') !== -1) {
			return true;
		}
		if (track.name.indexOf('Radio Edit') !== -1) {
			return true;
		}

		return false;
	}

	function extractName(track) {
		track.radioName = track.name;

		var name = track.name;
		var match;

		if ((match = name.match(ALBUM_SUFFIX_REGEX)) !== null) {
			//Need to clear out the (SHOW 123) from the track's name
			name = name.replace(ALBUM_SUFFIX_REGEX, '');
			track.albumSuffix = match[1];
		}

		if ((match = name.match(SPECIAL_SUFFIX_REGEX)) !== null) {
			//Also sometimes people put special things in [brackets] or in ** double asterisks **
			name = name.replace(SPECIAL_SUFFIX_REGEX, '');
			//Could be either match
			track.specialSuffix = typeof(match[2]) === 'undefined' ? match[3] : match[2];
		}

		if ((match = name.match(MIX_SUFFIX_REGEX)) !== null) {
			//Also clean off any - Mix stuff
			name = name.replace(MIX_SUFFIX_REGEX, '');
			track.mixSuffix = match[1];
		} else {
			track.mixSuffix = '';
		}

		track.name = name.trim();
	}

	function getOpenURL(uri) {
		return 'https://open.spotify.com/track/' + uri.split(':').pop();
	}

	Handlebars.registerHelper('list', function(items, options) {
		var out = '';
		for (var i = 0, l = items.length; i < l; i ++) {
			out = out + options.fn(items[i]);
		}
		return out;
	});
	Handlebars.registerHelper('track-url', function(uri, options) {
		return getOpenURL(uri);
	});

	var savedLibrary;
	function findExtendedMix(track) {
		return new Promise(function(accept, reject) {
			loadPlaylist(api.searchTracks.bind(api, track.name + ' ' + track.artists[0].name), 100).then(function(tracks) {
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

					function cleanedFilterMixSuffix(tracks, mixSuffix) {
						//Try to find one with the same mix
						return tracks.filter(function(testTrack) {
							return testTrack.mixSuffix.replace(NON_ALPHA_REGEX, '').toLowerCase() ===
								mixSuffix.replace(NON_ALPHA_REGEX, '').toLowerCase();
						});
					}

					//We've still got nothing. Try cleaning up the name some
					test = cleanedFilterMixSuffix(tracks, mix); if (test.length > 0) return test;
					//Try swapping 'Mix' with 'Remix'
					if (mix.search(/ Remix/) !== null) {
						test = cleanedFilterMixSuffix(tracks, mix.replace(' Remix', ' Mix')); if (test.length > 0) return test;
					}
					if (mix.search(/ Mix/) !== null) {
						test = cleanedFilterMixSuffix(tracks, mix.replace(' Mix', ' Remix')); if (test.length > 0) return test;
					}

					function levenshteinFilterMixSuffix(tracks, mixSuffix, distance) {
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
					accept();
					return;
				}

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

/*
	return new Promise(function(accept, reject) {
		if (typeof(localStorage.library) !== 'undefined') {
			try {
				library = JSON.parse(localStorage.library);
				accept(library);
			} catch (e) {
				reject();
			}
		} else {
			return _loadPart(offset, MAX_LIMIT, max).then(function() {
				try {
					localStorage.library = JSON.stringify(library);
				} finally {
					accept(library);
				}
			}, reject);
		}
	});
*/

	//Load library
	loadPlaylist(api.getMySavedTracks.bind(api)).then(function(library) {
		savedLibrary = library;

		var radioTracks = library.filter(isRadioTrack);
		//Remove ID tracks, we can't fix that
		radioTracks.filter(function(track) {
			return track.name !== "ID" && track.artists[0].name !== "ID";
		});
		radioTracks.map(function(track) {
			extractName(track);
			extractName(track.album);
			return track;
		});

		var radioTemplate = Handlebars.compile($('#radio-list-template').html());
		var $radioList = $('#radio');
		$radioList.append(
			radioTemplate({tracks: radioTracks})
		);

		//Shallow copy
		var toExtend = radioTracks.slice();

		function _findExtendedList() {
			return new Promise(function(accept, reject) {
				if (toExtend.length === 0) {
					accept();
					return;
				}

				var radioTrack = toExtend.shift();
				return findExtendedMix(radioTrack).then(function(track) {
					var $trackRow = $('#track-' + radioTrack.id);
					if (typeof(track) === 'undefined') {
						$trackRow.children('.extended-link').children('a').text('No Extended Version');
					} else {
						$trackRow.remove();
						// $trackRow.children('.extended-link').children('a').text('Extended Version');
						// $trackRow.children('.extended-link').children('a').attr('href', getOpenURL(track.uri));
					}

					return _findExtendedList(accept, reject);
				}, reject);
			});
		}

		_findExtendedList().then(function() {

		}, function() {

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
})(jQuery);
