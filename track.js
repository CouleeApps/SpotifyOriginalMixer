
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