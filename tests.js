function testSections(input, expectedName, expectedSections) {
	var output = getNameSections(input);
	var success = true;
	if (output.name !== expectedName) {
		console.error('Got wrong expected name, expected ' + expectedName + ' but got ' + output.name);
		success = false;
	}
	if (!expectedSections.every(function(section) {
			return output.sections.indexOf(section) !== -1;
		})) {
		//Something wasn't in there
		var missing = expectedSections.filter(function(section) {
			return output.sections.indexOf(section) === -1;
		});
		var added = output.sections.filter(function(section) {
			return expectedSections.indexOf(section) === -1;
		});
		console.error('Missing sections: ' + missing.join(' ') + ' added sections: ' + added.join(' '));
		success = false;
	}
	return success;
}

testSections('Miro',
	'Miro', []
);
testSections('Running (ASOT 824)',
	'Running', ['ASOT 824']
);
testSections('Lonkero [ABGT182]',
	'Lonkero', ['ABGT182']
);
testSections('The Chronicles (FSOE 500 Anthem) [ASOT 824]',
	'The Chronicles', ['FSOE 500 Anthem', 'ASOT 824']
);
testSections('Perfect Love [ASOT 565] **Future Favorite** - Original Mix',
	'Perfect Love', ['ASOT 565', 'Future Favorite', 'Original Mix']
);
testSections('Beautiful [(Glimpse of Heaven) ASOT 217] - Original Mix',
	'Beautiful', ['Glimpse of Heaven', 'ASOT 217', 'Original Mix']
);
testSections('Status Excessu D - ASOT 500 Theme',
	'Status Excessu D - ASOT 500 Theme', []
);
testSections('Magma [ASOT 251] - Orjan & R-Lend Sequential Mix',
	'Magma', ['ASOT 251', 'Orjan & R-Lend Sequential Mix']
);
testSections('Anahera (Extended Mix)',
	'Anahera', ['Extended Mix']
);
testSections('Brainflush [Push the Button] [ABGT172] - Tom Fall Remix',
	'Brainflush', ['Push the Button', 'ABGT172', 'Tom Fall Remix']
);
testSections('Social Suicide [ASOT 268] - Alex M.O.R.P.H. Mix 1',
	'Social Suicide', ['ASOT 268', 'Alex M.O.R.P.H. Mix 1']
);
testSections('Symbols [ASOT 271] - Kimito Lopez Private Revamp',
	'Symbols', ['ASOT 271', 'Kimito Lopez Private Revamp']
);
testSections('Flowtation [ASOT 285] **ASOT Radio Classic - Original Mix',
	'Flowtation', ['ASOT 285', 'ASOT Radio Classic', 'Original Mix']
);
testSections('Bittersweet Nightshade [ASOT 382] - (Markus Schulz Return To Coldharbour Remix',
	'Bittersweet Nightshade', ['ASOT 382', 'Markus Schulz Return To Coldharbour Remix']
);
testSections('Time To Rest [ASOT 372] **Future Favorite** - ASOT 2008 Mix Live Guitar by Eller van Buuren',
	'Time To Rest', ['ASOT 372', 'Future Favorite', 'ASOT 2008 Mix Live Guitar by Eller van Buuren']
);

