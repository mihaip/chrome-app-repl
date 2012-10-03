var $ = document.querySelector.bind(document);

function log(text, opt_color) {
  var logLineNode = document.createElement('div');
  logLineNode.innerText = text;
  if (opt_color) {
    logLineNode.style.color = opt_color;
  }
  $('#log').appendChild(logLineNode);
}

function sendSandboxMessage(type, params) {
  $('#sandbox-frame').contentWindow.postMessage(
      {type: type, params: params}, '*');
}

function gatherDescriptors(object, descriptors, path) {
  for (var propertyName in object) {
    var propertyValue = object[propertyName];
    var propertyType = typeof propertyValue;
    if (propertyValue instanceof chrome.Event) {
      propertyType = 'event';
    }

    var descriptor = descriptors[propertyName] = {};
    descriptor.type = propertyType;
    var propertyPath = path.concat(propertyName);

    switch (propertyType) {
      case 'object':
        if (propertyPath.length == 10) {
          log(propertyPath.join('.') + ': max depth exceeded, not recursing', 'red');
        } else {
          gatherDescriptors(propertyValue, descriptor, propertyPath);
        }
        break;
      case 'number':
      case 'string':
      case 'boolean':
        descriptor.value = propertyValue;
        break;
      case 'event':
      case 'function':
        break;
      default:
        log(propertyPath.join('.') + ': unexpected type: ' + propertyType, 'red');
    }
  }
}

onload = function() {
  var apis = {chrome: {}};
  gatherDescriptors(chrome, apis.chrome, ['chrome']);
  sendSandboxMessage(MessageType.INIT_APIS, apis)
};

$('#repl-form').onsubmit = function(event) {
  event.preventDefault();

  var code = $('#code').value;
  sendSandboxMessage(MessageType.EVAL, code);
};

addMessageHandler(MessageType.LOG, function(params) {
  log(params.text, params.opt_color);
});

addMessageHandler(MessageType.EVAL_RESULT, function(result) {
  log(JSON.stringify(result));
});

