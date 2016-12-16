function download(track_id, name_string) {
  let xhr = new XMLHttpRequest();
  let fullPath = '/api/trackRaw/' + track_id;
  xhr.open('GET', fullPath, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function() {
    if(this.status === 200) {
      var blob = new Blob([xhr.response], {type: "audio/mpeg"});
      let a = document.createElement("a");
      a.style = "display: none";
      document.body.appendChild(a);
      var objectUrl = window.URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = name_string;
      a.click();
      window.URL.revokeObjectUrl(objectUrl);
    }
  };
  xhr.send();
}
