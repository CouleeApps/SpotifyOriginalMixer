var ALBUM_SUFFIX_REGEX = /[\[\(]([A-Z]+\s*\d+( - Part \d+)?)[\]\)]/i;
var SPECIAL_SUFFIX_REGEX = /([\[\(](.*?)[\]\)]|\*\*(.*?)\*\*)/;
var MIX_SUFFIX_DASH_REGEX = / - (.*(mix|dub|version|edit|instrumental|bootleg|extended))$/i;
var MIX_SUFFIX_PARENS_REGEX = /\(([^)]*(mix|dub|version|edit|instrumental|bootleg|extended))\)$/i;

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
	// Black Hole (Reprise)

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

	//Need to extract the various parts of the song metadata from the name.
	// This turns out to be much weirder than expected even though song names are fairly regular.
	//
	//Example: Jewel [ASOT 596] **Tune of the Week** - Pure Mix
	// Name: Jewel
	// Album: ASOT 596
	// Mix: Pure Mix
	// Special: Tune of the Week

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

	if ((match = name.match(MIX_SUFFIX_DASH_REGEX)) !== null) {
		//Also clean off any - Mix stuff
		name = name.replace(MIX_SUFFIX_DASH_REGEX, '');
		track.mixSuffix = match[1];
	} else if ((match = name.match(MIX_SUFFIX_PARENS_REGEX)) !== null) {
		//Some people do it like this though
		name = name.replace(MIX_SUFFIX_PARENS_REGEX, '');
		track.mixSuffix = match[1];
	} else {
		track.mixSuffix = '';
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
		//How many special suffixes do you need? I think the most I've seen is 2 but never hurts
		while ((match = name.match(SPECIAL_SUFFIX_REGEX)) !== null) {
			//Also sometimes people put special things in [brackets] or in ** double asterisks **
			name = name.replace(SPECIAL_SUFFIX_REGEX, '');
			//Could be either match
			track.specialSuffixes.push(typeof(match[2]) === 'undefined' ? match[3] : match[2]);
		}
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
