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

async function loadList(cb, max, offset, progress) {
	//Start at the start if we don't care
	if (typeof (offset) === 'undefined') {
		offset = 0;
	}

	var MAX_LIMIT = 50;
	if (typeof (max) === 'undefined') {
		max = Infinity;
	}
	var list = [];

	//Poll the API
	while (offset < max) {
		var limit = Math.min(MAX_LIMIT, max - offset);
		let data = await cb({
			limit: limit,
			offset: offset
		});
		//Don't go beyond the total
		max = Math.min(max, data.total);

		if (typeof (data.tracks) !== 'undefined') {
			//Because this has all the info
			data = data.tracks;
		}

		//Add all the items to the list array
		if (typeof (data.items) !== 'undefined') {
			//Append all from data.items into list
			Array.prototype.push.apply(list, data.items);
		}

		//Find what the parameters for the next request are
		offset = data.offset + data.limit;

		//Progress update event
		if (typeof (progress) !== 'undefined') {
			progress(offset / max);
		}
	}

	return list;
}

/**
 * Asynchronously (but not in parallel) apply a function to every item in an array and collect
 *  the results into an array, which is passed as the only parameter in the accept function.
 * @param array    Input array of items
 * @param fn       Function to convert item. Should return a promise that accepts with the
 *                 mapped value as the only argument.
 * @param progress Optional progress function that is called after each iteration of fn.
 *                 Parameters are (original value, mapped value)
 * @returns {Promise}
 */
Q.map = async function(array, fn, progress) {
	let result = [];
	for (let item of array) {
		let mapped = await fn(item);
		result.push(mapped);

		//Fire progress callback if we have it
		if (typeof(progress) !== "undefined")
			progress(item, mapped);
	}
	return result;
};

/**
 * Asynchronously (but not in parallel) apply a function to every item in an array.
 * @param array Input array of items
 * @param fn    Function to process item
 * @returns {Promise}
 */
Q.forEach = async function(array, fn) {
	for (let item of array) {
		await fn(item);
	}
};

Array.prototype.chunk = function(count) {
	var chunked = [];
	for (var i = 0; i < this.length; i += count) {
		chunked.push(this.slice(i, i + count));
	}
	return chunked;
};

Array.prototype.unique = function() {
	return this.filter(function(item, index, self) {
		return self.indexOf(item) === index;
	});
};

//From MDN
if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(searchStr, Position) {
		// This works much better than >= because
		// it compensates for NaN:
		if (!(Position < this.length))
			Position = this.length;
		else
			Position |= 0; // round position
		return this.substr(Position - searchStr.length,
			searchStr.length) === searchStr;
	};
}

/**
 * Asynchronously load all of the templates
 * Thanks, Kevin
 * @param {array} templates
 * @return {Promise}
 */
function loadTemplates(templates) {
  var promises = [];
  templates.forEach(function (template) {
    promises.push(new Q.Promise(function (resolve, reject) {
      Twig.twig({
        id: template.id,
        href: template.href,
        allowInlineIncludes: true,
        async: true,
        error: function () {
          reject();
        },
        load: function () {
          resolve(Twig.twig({ref: template.id}));
        }
      });
    }));
  });
  return Q.all(promises).then((results) => {
    let object = [];
    for (let result of results) {
      object[result.id] = result;
    }
    return object;
  });
}
