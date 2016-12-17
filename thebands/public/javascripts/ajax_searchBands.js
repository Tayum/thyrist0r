$(function() {
  $('#search').on('submit', function(event) {
    event.preventDefault();

    var bandName = $('#bandNameId');
    bandName = bandName.val();
    $.ajax({
      url: '/api/bandsAjax?bandName=' + bandName,
      method: 'GET',
      contentType: 'application/json',
      success: function(recvObj) {
        var template = document.getElementById("search-script").innerHTML;
        var renderedHTML = null;
        var bands = recvObj.bandsObj.bands;
        var exceeds = recvObj.exceedsObj.exceeds;
        if (bands.length > 0) {
          renderedHTML = Mustache.render(template, {
            bands: bands,
            exceeds: exceeds,
            search_value: bandName,
            empty: false
          });
        }
        else {
          renderedHTML = Mustache.render(template, {
            empty: true
          });
        }
        document.getElementById("search-result").innerHTML = renderedHTML;

        // Update (refresh) the URI
        var searchString = window.location.search.substring(1);
        var params = searchString.split("&");
        var oldname = null;
        var oldpage = null;
        for (var i = 0; i < params.length; i++) {
          var val = params[i].split("=");
          if (val[0] == 'bandName') {
            oldname = val[1];
          }
          if (val[0] == 'page') {
            oldpage = val[1];
          }
        }
        var updated_uri = window.location.href;
        if(oldname !== null) {
          var old_uri_name = 'bandName=' + oldname;
          updated_uri = updated_uri.replace(old_uri_name, ('bandName=' + bandName));
        }
        if(parseInt(oldpage) != 1) {
          var old_uri_page = 'page=' + oldpage;
          updated_uri = updated_uri.replace(old_uri_page, 'page=1');
        }
        window.history.replaceState({}, document.title, updated_uri);
        // END: Update (refresh) the URI
      }
    });
  });
});
