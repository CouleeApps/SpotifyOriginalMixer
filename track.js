var ALBUM_SUFFIX_REGEX = /^([A-Z]+\s*\d+( - Part \d+)?)$/;

var MIX_REGEXES = [
	/mix$/i, //Also covers remix
	/dub$/i,
	/version$/i,
	/edit$/i,
	/bootleg$/i,
	/cut$/i,
	/mash( up)?$/i,
	/instrumental$/i, //Gets a little weirder from here on down
	/interpretation$/i,
	/extended$/i, //Someone forgot "mix" on "extended mix"
	/re-?vamp(ed)?$/i, //Re this re that how many of these can they think of
	/re-?work$/i,
	/re-?make$/i,
	/re-?hash$/i,
	/re-?touch$/i,
	/re-?vival$/i,
	/re-?construction$/i,
	/re-?fill$/i,
	/re-?mode$/i,
	/re-?lift$/i,
	/re-?pimp$/i, //Why
	/re-?rerub$/i, //Stop
	/re-?wiz/i, //Please
	/touch$/i,
	/ mix /i, //For when 'mix' isn't the last thing because we need more description
	/ remix /i,
	/fix$/i, //Nice
	/mx$/i, //Good job you misspelled 'mix'
	/play$/i, //Playmo - 1st Play
	/mix(\s*\d+)$/i, //Alex M.O.R.P.H. Mix 1
	/byte$/i //Second Byte - D-formations Third Byte
];

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

	//If it has a radio show album in the name
	var sectioned = getNameSections(track.name);
	if (sectioned.sections.some(function(section) {
			return section.match(ALBUM_SUFFIX_REGEX) !== null;
		})) {
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

	//Sectionize the track's name and see what we can find
	var sectioned = getNameSections(track.name);

	//See if we can find a mix
	var mixes = sectioned.sections.filter(function(section) {
		return isMixType(section);
	});
	//Radio show albums
	var albums = sectioned.sections.filter(function(section) {
		return mixes.indexOf(section) === -1 && section.match(ALBUM_SUFFIX_REGEX) !== null;
	});
	//Everything else?
	var specials = sectioned.sections.filter(function(section) {
		return mixes.indexOf(section) === -1 && albums.indexOf(section) === -1;
	});

	track.mixSuffix = (mixes.length > 0 ? mixes[0] : '');
	track.albumSuffix = (albums.length > 0 ? albums[0] : '');
	track.specials = specials;

	track.name = sectioned.name;
}

function isMixType(name) {
	name = name.toLowerCase();
	return MIX_REGEXES.some(function(mix) {
		if (name.match(mix) !== null) {
			return true;
		}
	});
}

function getNameSections(name) {
	var OPENING_OR_CLOSING = /[()[\]{}]|\*\*/;
	var CLOSING_MATCH = {
		')':  '(',
		']':  '[',
		'}':  '{',
		'**': '**'
	};

	//Split off anything in parens
	var matches = [];
	var sections = [];

	var start = 0;
	var match;
	while ((match = name.substring(start).match(OPENING_OR_CLOSING)) !== null) {
		//Matched an open paren, find the nearest closing
		start += match.index + match[0].length;

		var type = match[0];
		var open = true;
		var lastMatch = matches.length > 0 ? matches[matches.length - 1] : {type: ''};

		if (type === '**') {
			//Thanks, Armin
			open = lastMatch.type !== '**';
		} else if (typeof(CLOSING_MATCH[type]) !== 'undefined') {
			type = CLOSING_MATCH[type];
			open = false;
		}

		if (open) {
			matches.push({
				type: type,
				start: start
			});
		} else {
			//I thought I was going to care about bracket matching.
			// Then Armin wrote "[ASOT 728)"
			if (lastMatch.type !== type) {
				//Invalid format
				console.error('Mismatched brackets! Name: ' + name);
			}

			//Do it anyway, if we can
			if (matches.length > 0) {
				//Pop this off
				var innerStr = name.substring(lastMatch.start, start - type.length);

				//Take it out of the input string so we don't bother with it again
				name = name.substring(0, lastMatch.start - lastMatch.type.length) + name.substring(start);
				start = lastMatch.start - lastMatch.type.length;

				sections.push(innerStr);
				matches.pop();
			}
		}
	}

	//See if they have a mix suffix
	var suffixStart = name.length;
	while ((suffixStart = name.lastIndexOf(' - ', suffixStart - 1)) !== -1) {
		var mixSuffix = name.substring(suffixStart + ' - '.length);

		//Do this here too because isMixType might get confused about extra spaces
		mixSuffix = mixSuffix.replace(/\s\s+/g, ' ').trim();
		if (!isMixType(mixSuffix)) {
			continue;
		}

		//Get that too
		sections.push(mixSuffix);
		name = name.substring(0, suffixStart);
	}

	//Do we still have something open? Armin please stop making spelling errors
	// e.g. "Flowtation [ASOT 285] **ASOT Radio Classic - Original Mix"
	while (matches.length > 0) {
		//Augh, just pretend it goes all the way to the end
		lastMatch = matches[matches.length - 1];
		innerStr = name.substring(lastMatch.start);

		//Take it out of the input string so we don't bother with it again
		name = name.substring(0, lastMatch.start - lastMatch.type.length);

		sections.push(innerStr);
		matches.pop();
	}

	//Clear extra spaces
	name = name.replace(/\s\s+/g, ' ').trim();

	//Some cleanup on the sections
	sections = sections.map(function(section) {
		return section.replace('/\s\s+/g', ' ').trim() //Fix weird spaces
			.replace(/^[([{]/, '').replace(/[)\]}]$/, '') //Fix starting or ending with a paren
			.replace(/^\*\*/, '').replace(/\*\*$/, '') //Because Armin is special
	}).unique().filter(function(section) {
		return section !== '';
	});

	return {name: name, sections: sections};
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
