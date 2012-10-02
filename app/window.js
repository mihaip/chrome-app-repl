var $ = document.querySelector.bind(document);

$('#repl-form').onsubmit = function(event) {
  event.preventDefault();

  var code = $('#code').value;

  var sandboxFrameNode = $('#sandbox-frame');
  sandboxFrameNode.contentWindow.postMessage(code, '*');
};

onmessage = function(event) {
  log('message received: ' + JSON.stringify(event.data));
}

function log(text) {
  var logLineNode = document.createElement('div');
  logLineNode.innerText = text;
  $('#log').appendChild(logLineNode);
}