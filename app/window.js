// We don't actually use jQuery, but jq-console does.
jQuery.noConflict();

var $ = document.querySelector.bind(document);

function log(text, opt_level) {
  if (text[text.length - 1] != '\n') {
    text += '\n';
  }
  var className = opt_level || LogLevel.OUTPUT;
  jqconsole.Write(text, className);
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
          error(propertyPath.join('.') + ': max depth exceeded, not recursing');
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
        error(propertyPath.join('.') + ': unexpected type: ' + propertyType);
    }
  }
}

var jqconsole;

var GREETING_MESSAGE = '\033[33mWelcome to chrome-app-repl.\033[0m\n\n' +
    'Type in the JavaScript statements or Chrome API calls that you wish to ' +
    'run. Type in \033[32mhelp\033[0m for a list of built-in commands.\n';
var CONSOLE_PROMPT = '> ';

onload = function() {
  jqconsole = jQuery('#console').jqconsole(GREETING_MESSAGE, CONSOLE_PROMPT);

  jqconsole.RegisterShortcut('D', function() {
    window.close();
  });

  function loop() {
    // Start the prompt with history enabled.
    jqconsole.Prompt(true, function(input) {
      sendSandboxMessage(MessageType.EVAL, input);
      loop();
    });
  };
  loop();

  var apiDescriptors = {
    chrome: {
      type: 'object',
      children: {}
    }
  };
  gatherDescriptors(chrome, apiDescriptors.chrome.children, ['chrome']);
  sendSandboxMessage(MessageType.INIT_APIS, apiDescriptors);
};

addMessageHandler(MessageType.LOG, function(params) {
  log(params.text, params.opt_level);
});

addMessageHandler(MessageType.EVAL_RESULT, function(result) {
  if (result.exception) {
    error(result.exception.type + ': ' + result.exception.message);
    return;
  }

  if (result.result == SUPPRESS_EVAL_RESPONSE) {
    return;
  }

  log(JSON.stringify(result.result));
});

addMessageHandler(MessageType.RUN_API_FUNCTION, function(invocation) {
  var apiFunction = window;
  for (var i = 0, pathComponent; pathComponent = invocation.path[i]; i++) {
    if (pathComponent in apiFunction) {
      apiFunction = apiFunction[pathComponent];
    } else {
      error('Could not find ' + pathComponent + ' in ' + invocation.path.join('.'));
      return;
    }
  }

  var args = [];
  for (var i = 0; i < invocation.params.length; i++) {
    var param = invocation.params[i];
    if (typeof param == 'object' && 'callbackId' in param) {
      param = generateCallbackStub(param.callbackId);
    }
    args.push(param);
  }

  apiFunction.apply(this, args);
});

function generateCallbackStub(callbackId) {
  return function() {
    sendSandboxMessage(MessageType.RUN_API_FUNCTION_CALLBACK, {
      callbackId: callbackId,
      params: Array.prototype.slice.call(arguments)
    });
  };
}
