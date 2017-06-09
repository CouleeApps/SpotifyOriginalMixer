(function($) {
	//Init Spotify api
	var api = new SpotifyWebApi();
	api.setAccessToken(getAuthCookie());
	api.setPromiseImplementation(Q);

	function loadSavedLibrary(cb, offset, max) {
		//Start at the start if we don't care
		if (typeof(offset) === 'undefined') {
			offset = 0;
		}

		var MAX_LIMIT = 50;
		var library = [];

		function _loadPart(offset, limit, max) {
			//Poll the API
			return cb({
				limit: limit,
				offset: offset
			}).then(function(data) {
				//Add all the tracks to the library array
				data.items.forEach(function(info) {
					var track = info.track;
					library.push(track);
				});
				//Load all if we haven't specified a max
				if (typeof(max) === 'undefined') {
					max = data.total;
				}

				//Find what the parameters for the next request are
				var offset = data.offset + data.limit;
				var limit = Math.min(data.limit, Math.min(max, data.total) - offset);
				if (limit <= 0) {
					return;
				}
				//And send it off (async recursion woo)
				return _loadPart(offset, limit, max);
			}, function(err) {
				console.error(err);
			});
		}

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
	}

	Array.prototype.diff = function(a) {
		return this.filter(function(i) {
			return a.indexOf(i) < 0;
		});
	};

	var ALBUM_SUFFIX_REGEX = /[\[\(][A-Z]+\s*\d*( - Part \d+)?[\]\)]/;
	var SPECIAL_SUFFIX_REGEX = /([\[\(].*?[\]\)]|\*\*.*?\*\*)/;
	var MIX_SUFFIX_REGEX = / - .*/;

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

		return false;
	}

	function cleanRadioName(track) {
		track.radioName = track.name;

		var name = track.name;
		var radioSuffix = '';
		var match;

		if ((match = name.match(ALBUM_SUFFIX_REGEX)) !== null) {
			//Need to clear out the (SHOW 123) from the track's name
			name = name.replace(ALBUM_SUFFIX_REGEX, '');
			radioSuffix += match[0];
			track.albumSuffix = match[0];
		}

		if ((match = name.match(SPECIAL_SUFFIX_REGEX)) !== null) {
			//Also sometimes people put special things in [brackets] or in ** double asterisks **
			name = name.replace(SPECIAL_SUFFIX_REGEX, '');
			radioSuffix += match[0];
			track.specialSuffix = match[0];
		}

		if ((match = name.match(MIX_SUFFIX_REGEX)) !== null) {
			//Also clean off any - Mix stuff
			name = name.replace(MIX_SUFFIX_REGEX, '');
			radioSuffix += match[0];
			track.mixSuffix = match[0].substr(3); // ' - '.length
		} else {
			track.mixSuffix = '';
		}

		track.radioSuffix = radioSuffix;
		track.name = name.trim();
	}

	var savedLibrary;

	Handlebars.registerHelper('list', function(items, options) {
		var out = "";
		for (var i = 0, l = items.length; i < l; i ++) {
			out = out + options.fn(items[i]);
		}
		return out;
	});


	//Load library
	loadSavedLibrary(api.getMySavedTracks.bind(api)).then(function(library) {
		savedLibrary = library;

		var radioTracks = library.filter(isRadioTrack);
		var nonRadioTracks = library.diff(radioTracks);

		radioTracks.map(function(track) {
			cleanRadioName(track);
			cleanRadioName(track.album);
			return track;
		});

		var radioTemplate = Handlebars.compile($("#radio-list-template").html());
		var nonRadioTemplate = Handlebars.compile($("#non-radio-list-template").html());

		var $radioList = $("#radio");
		var $nonRadioList = $("#non-radio");

		$radioList.append(
			radioTemplate({tracks: radioTracks})
		);

		$nonRadioList.append(
			nonRadioTemplate({tracks: nonRadioTracks})
		);
	});
})(jQuery);