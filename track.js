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

	//Already figured this one out
	if (track.extracted) {
		return track.radio;
	}

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
	if (track.extracted) {
		return;
	}

	track.radio = isRadioTrack(track);
	track.radioName = track.name;
	track.extracted = true;

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
	//More?
	if ((match = name.match(SPECIAL_SUFFIX_REGEX)) !== null) {
		track.specialSuffixes = [track.specialSuffix];
		while ((match = name.match(SPECIAL_SUFFIX_REGEX)) !== null) {
			//Also sometimes people put special things in [brackets] or in ** double asterisks **
			name = name.replace(SPECIAL_SUFFIX_REGEX, '');
			//Could be either match
			track.specialSuffixes.push(typeof(match[2]) === 'undefined' ? match[3] : match[2]);
		}
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
	if (typeof(uri) === 'undefined') {
		return '';
	}
	return uri;
}
function getAlbumImage(track, size) {
	if (track.album.images.size === 0) {
		return '';
	}

	//Smallest image larger than size
	var images = track.album.images.slice(0);
	images.sort(function(a, b) {
		return a.width - b.width;
	});

	for (var i = 0; i < images.length; i ++) {
		if (images[i].width >= size) {
			return images[i].url;
		}
	}
}
Handlebars.registerHelper('track-url', function(uri) {
	return getOpenURL(uri);
});
Handlebars.registerHelper('album-image', function(size) {
	return getAlbumImage(this, size);
});
