(function() {
	//Parse the hash with auth data into components

	//#access_token=very_long_string&token_type=Bearer&expires_in=3600
	var hash = window.location.hash;

	//access_token=very_long_string&token_type=Bearer&expires_in=3600
	hash = hash.substr(1);

	// access_token=very_long_string
	// token_type=Bearer
	// expires_in=3600
	var cookie = [];

	var components = hash.split('&');
	components.forEach(function(component) {
		// access_token
		// very_long_string
		var parts = component.split('=');

		cookie[parts[0]] = parts[1];
		console.log('Token parts: key: ' + parts[0] + ' value: ' + parts[1]);
	});

	function addCookie(name) {
		var cookieStr = name + '=' + encodeURIComponent(cookie[name]);
		cookieStr += ';path=/';
		if (typeof(cookie['expires_in']) !== "undefined") {
			cookieStr += ';max-age=' + parseInt(cookie['expires_in']);
		}

		document.cookie = cookieStr;
	}

	//Now set the auth cookie
	addCookie('access_token');
	addCookie('token_type');

	window.close();
})();