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

function loadList(cb, max, offset) {
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
			if (typeof(data.tracks) !== 'undefined') {
				//Because this has all the info
				data = data.tracks;
			}

			//Add all the items to the list array
			if (typeof(data.items) !== 'undefined') {
				//Append all from data.items into list
				Array.prototype.push.apply(list, data.items);
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

/**
 * Asynchronously (but not in parallel) apply a function to every item in an array and collect
 *  the results into an array, which is passed as the only parameter in the accept function.
 * @param array    Input array of items
 * @param fn       Function to convert item. Should return a promise that accepts with the
 *                 mapped value as the only argument.
 * @param progress Optional progress function that is called after each iteration of fn.
 *                 Parameters are (original value, mapped value)
 * @returns {promise|*}
 */
Q.map = function(array, fn, progress) {
	var result = [];
	//Copy the array so we don't mutate the one they give us
	var copy = array.slice();

	function _map(accept, reject) {
		//End of the list so accept and we're done
		if (copy.length === 0) {
			return accept(result);
		}
		//Fire up the promise for the next item on the list
		var next = copy.shift();
		return fn(next).then(function(mapped) {
			//Got the result of this, add to the list
			result.push(mapped);

			//Fire progress callback if we have it
			if (typeof(progress) !== "undefined")
				progress(next, mapped);

			return _map(accept, reject);
		}, reject);
	}

	return new Promise(function(accept, reject) {
		return _map(accept, reject);
	});
};

/**
 * Asynchronously (but not in parallel) apply a function to every item in an array.
 * @param array Input array of items
 * @param fn    Function to process item
 * @returns {promise|*}
 */
Q.forEach = function(array, fn) {
	//Copy the array so we don't mutate the one they give us
	var copy = array.slice();

	function _foreach(accept, reject) {
		//End of the list so accept and we're done
		if (copy.length === 0) {
			return accept();
		}
		//Fire up the promise for the next item on the list
		var next = copy.shift();
		return fn(next).then(function() {
			return _foreach(accept, reject);
		}, reject);
	}

	return new Promise(function(accept, reject) {
		return _foreach(accept, reject);
	});
};

Array.prototype.chunk = function(count) {
	var chunked = [];
	for (var i = 0; i < this.length; i += count) {
		chunked.push(this.slice(i, i + count));
	}
	return chunked;
};
