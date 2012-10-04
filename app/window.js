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
    var propertyPath = path.concat(propertyName);
    var propertyValue = object[propertyName];
    var propertyType = typeof propertyValue;
    if (propertyValue instanceof chrome.Event) {
      propertyType = 'event';
    }

    var descriptor = descriptors[propertyName] = {};
    descriptor.type = propertyType;

    switch (propertyType) {
      case 'object':
        if (propertyPath.length == 20) {
          log(propertyPath.join('.') + ': max depth exceeded, not recursing', 'red');
        } else {
          descriptor.children = {};
          gatherDescriptors(propertyValue, descriptor.children, propertyPath);
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
  var apiDescriptors = {
    chrome: {
      type: 'object',
      children: {}
    }
  };
  gatherDescriptors(chrome, apiDescriptors.chrome.children, ['chrome']);
  console.dir(apiDescriptors);
  sendSandboxMessage(MessageType.INIT_APIS, apiDescriptors)
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

addMessageHandler(MessageType.RUN_API_FUNCTION, function(params) {
  var apiFunction = window;
  for (var i = 0, pathComponent; pathComponent = params.path[i]; i++) {
    if (pathComponent in apiFunction) {
      apiFunction = apiFunction[pathComponent];
    } else {
      log('Could not find ' + pathComponent + ' in ' + params.path.join('.'));
      return;
    }
  }

  log('Running ' + params.path.join('.'));

  apiFunction(function(result) {
    sendSandboxMessage(MessageType.RUN_API_FUNCTION_RESULT, result);
  });
});