(function() {

	function login(callback) {
		var CLIENT_ID = '6acbd4cc5e97489197f1112526507d4d';
		var REDIRECT_URI = window.location.href.replace("login.html", "auth.html");
		function getLoginURL(scopes) {
			return 'https://accounts.spotify.com/authorize?client_id=' + CLIENT_ID +
				'&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
				'&scope=' + encodeURIComponent(scopes.join(' ')) +
				'&response_type=token';
		}

		var url = getLoginURL([
			'playlist-read-private',
			'playlist-modify-public',
			'playlist-modify-private',
			'user-library-read',
			'user-library-modify'
		]);

		var width = 450,
			height = 730,
			left = (screen.width / 2) - (width / 2),
			top = (screen.height / 2) - (height / 2);

		window.addEventListener("message", function(event) {
			var hash = JSON.parse(event.data);
			if (hash.type == 'access_token') {
				callback(hash.access_token);
			}
		}, false);

		var w = window.open(url,
			'Spotify',
			'menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left
		);
		function checkWindowClosed() {
			if (w.closed) {
				window.location.href = 'index.html';
			}
		}

		setInterval(checkWindowClosed, 100);
	}

	function getUserData(accessToken) {
		return $.ajax({
			url: 'https://api.spotify.com/v1/me',
			headers: {
				'Authorization': 'Bearer ' + accessToken
			}
		});
	}

	var resultsPlaceholder = document.getElementById('result'),
		loginButton = document.getElementById('btn-login');

	loginButton.addEventListener('click', function() {
		login(function(accessToken) {
			getUserData(accessToken)
				.then(function(response) {
					loginButton.style.display = 'none';
					resultsPlaceholder.innerHTML = response;
				});
		});
	});

})();