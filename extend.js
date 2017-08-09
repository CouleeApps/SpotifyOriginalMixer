var NON_ALPHA_REGEX = /[^a-zA-Z]/g;

function findExtendedMix(api, radioTrack) {
	return new Promise(function(accept, reject) {
		var query = 'track:' + radioTrack.name + ' artist:' + radioTrack.artists[0].name;
		loadList(api.searchTracks.bind(api, query), 100).then(function(searchTracks) {
			//This would be super useless if the extended mix gave you a radio track
			searchTracks = searchTracks.filter(function(track) {
				return !isRadioTrack(track);
			});
			//Extract name info
			searchTracks.map(function(track) {
				extractName(track);
				track.testMixSuffix = track.mixSuffix.toLowerCase();
				return track;
			});
			//In case something has the name of an album
			searchTracks.filter(function(testTrack) {
				return testTrack.name.toLowerCase() === radioTrack.name.toLowerCase();
			});

			//Try to match the mix so we get the right version
			searchTracks = function() {
				function filterMixSuffix(tracks, mixSuffix) {
					mixSuffix = mixSuffix.toLowerCase();
					//Try to find one with the same mix
					return tracks.filter(function(testTrack) {
						return testTrack.testMixSuffix === mixSuffix;
					});
				}

				var mix = radioTrack.mixSuffix;
				var test;
				switch (mix) {
					case 'Original Mix':
					case 'Extended Mix':
					case 'Extended Remix':
					case 'Extended Version': //Armin stop
					case 'Extended': //Ferry Corsten why have you done this
					case 'Radio Edit':
					case '':
						//See if any of those work
						test = filterMixSuffix(searchTracks, 'Original Mix'); if (test.length > 0) return test;
						test = filterMixSuffix(searchTracks, 'Extended Mix'); if (test.length > 0) return test;
						test = filterMixSuffix(searchTracks, 'Extended Remix'); if (test.length > 0) return test;
						test = filterMixSuffix(searchTracks, 'Extended Version'); if (test.length > 0) return test;
						test = filterMixSuffix(searchTracks, 'Extended'); if (test.length > 0) return test;
						test = filterMixSuffix(searchTracks, ''); if (test.length > 0) return test;
						break;
					case 'Club Mix':
					case 'Club Remix':
						//Not the same as Original Mix
						test = filterMixSuffix(searchTracks, 'Club Mix'); if (test.length > 0) return test;
						test = filterMixSuffix(searchTracks, 'Club Remix'); if (test.length > 0) return test;
						break;
					default:
						test = filterMixSuffix(searchTracks, mix); if (test.length > 0) return test;
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
				mix = replaceMulti(mix, [' Remix', ' Mix', ' Bootleg', ' Version', ' Edit', ' Revamp', ' Rework', ' Fix', ' Play']);
				searchTracks = searchTracks.map(function(track) {
					track.testMixSuffix = replaceMulti(track.testMixSuffix, [' Remix', ' Mix', ' Bootleg', ' Version', ' Edit', ' Revamp', ' Rework', ' Fix', ' Play']);
					return track;
				});

				test = filterMixSuffix(searchTracks, mix); if (test.length > 0) return test;

				//We've still got nothing. Try cleaning up the name some
				mix = mix.replace(NON_ALPHA_REGEX, '').toLowerCase();
				searchTracks = searchTracks.map(function(track) {
					track.testMixSuffix = track.testMixSuffix.replace(NON_ALPHA_REGEX, '').toLowerCase();
					return track;
				});
				test = filterMixSuffix(searchTracks, mix); if (test.length > 0) return test;

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
				test = levenshteinFilterMixSuffix(searchTracks, mix, 1); if (test.length > 0) return test;
				test = levenshteinFilterMixSuffix(searchTracks, mix, 3); if (test.length > 0) return test;

				//Nope
				return [];
			}();

			if (searchTracks.length === 0) {
				accept(radioTrack);
				return;
			}

			//Revert the changes that selection caused
			searchTracks.map(function(track) {
				track.name = track.radioName;

				//Force re-extract
				track.extracted = false;
				extractName(track);

				return track;
			});

			//Sort by length since we want the longest track
			searchTracks.sort(function(a, b) {
				if (b.duration_ms !== a.duration_ms) {
					return b.duration_ms - a.duration_ms;
				}
				if (b.popularity !== a.popularity) {
					return b.popularity - a.popularity;
				}
				return 0;
			});

			if (searchTracks[0].uri === radioTrack.uri) {
				//Hey we're the best we can get!
				accept(radioTrack);
			}

			//Pick the best one
			accept(searchTracks[0]);
		}, reject);
	});
}