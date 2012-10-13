// We don't actually use jQuery, but jq-console does.
jQuery.noConflict();

var $ = document.querySelector.bind(document);

function log(text, opt_level) {
  if (!text || text[text.length - 1] != '\n') {
    text += '\n';
  }
  var className = opt_level || LogLevel.OUTPUT;
  jqconsole.Write(text, className);
}

function sendSandboxMessage(type, params) {
  try {
    $('#sandbox-frame').contentWindow.postMessage(
        {type: type, params: params}, '*');
  } catch (e) {
    if (e.code == DOMException.DATA_CLONE_ERR) {
      error('Could not serialize object during postMessage() ' +
          'from host to sandbox.');
    }
  }
}

var API_BLACKLIST = {
  // Not actually apps APIs.
  'chrome.loadTimes': 1,
  'chrome.csi': 1,
  'chrome.searchBox': 1,

  // Extension APIs that extension-only, but still have bindings injected (they
  // won't actually work, since the permission is not present).
  'chrome.bookmarks': 1,
  'chrome.browserAction': 1,
  'chrome.devtools': 1,
  'chrome.management': 1,
  'chrome.omnibox': 1,
  'chrome.pageAction': 1,
  'chrome.scriptBadge': 1,
  'chrome.tabs': 1,
  'chrome.test': 1,
  'chrome.windows': 1,

  // Experimental APIs that are extension-only (experimental APIs currently
  // can't be restrictd by item type).
  'chrome.experimental.accessibility': 1,
  'chrome.experimental.app': 1,
  'chrome.experimental.discovery': 1,
  'chrome.experimental.history': 1,
  'chrome.experimental.idltest': 1,
  'chrome.experimental.infobars': 1,
  'chrome.experimental.input.virtualKeyboard': 1,
  'chrome.experimental.offscreenTabs': 1,
  'chrome.experimental.processes': 1,
  'chrome.experimental.record': 1,
  'chrome.experimental.rlz': 1
};

function gatherDescriptors(object, descriptors, path) {
  for (var propertyName in object) {
    var propertyPath = path.concat(propertyName);
    if (propertyPath.join('.') in API_BLACKLIST) {
      continue;
    }
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

window.addEventListener('load', function() {
  jqconsole = jQuery('#console').jqconsole(GREETING_MESSAGE, CONSOLE_PROMPT);

  jqconsole.RegisterShortcut('D', function() {
    window.close();
  });

  // The API bindings will log messages to the dev tools console (e.g. when
  // an API error occurs); we want those to be visible in our console instead.
  console.error = error;
  console.debug = log;
  console.info = info;
  console.warn = warning;

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
});

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

function lookUpApiFunction(path) {
  var apiFunction = window;
  for (var i = 0, pathComponent; pathComponent = path[i]; i++) {
    if (pathComponent in apiFunction) {
      apiFunction = apiFunction[pathComponent];
    } else {
      error('Could not find ' + pathComponent + ' in ' + path.join('.'));
      return undefined;
    }
  }

  return apiFunction;
}

addMessageHandler(MessageType.RUN_API_FUNCTION, function(invocation) {
  var apiFunction = lookUpApiFunction(invocation.path);
  if (!apiFunction) {
    return;
  }

  var args = [];
  for (var i = 0; i < invocation.params.length; i++) {
    var param = invocation.params[i];
    if (typeof param == 'object' && param !== null && 'callbackId' in param) {
      param = generateCallbackStub(param.callbackId);
    }
    args.push(param);
  }

  try {
    apiFunction.apply(this, args);
  } catch (e) {
    // It would be nice to send this exception back to the sandbox frame and
    // rethrow it, but since it happened synchronously, there's no way to throw
    // it at the right spot.
    error(e.constructor.name + ': ' + e.message);
  }
});

function generateCallbackStub(callbackId) {
  return function() {
    sendSandboxMessage(MessageType.RUN_API_FUNCTION_CALLBACK, {
      callbackId: callbackId,
      params: Array.prototype.slice.call(arguments)
    });
  };
}

var listenerStubs = {};
function generateListenerStub(listenerId) {
  return function() {
    sendSandboxMessage(MessageType.RUN_EVENT_LISTENER, {
      listenerId: listenerId,
      params: Array.prototype.slice.call(arguments)
    });
  };
};

addMessageHandler(MessageType.ADD_EVENT_LISTENER, function(listener) {
  var event = lookUpApiFunction(listener.path);
  if (!event) {
    return;
  }

  var listenerStub = generateListenerStub(listener.listenerId);
  listenerStubs[listener.listenerId] = listenerStub;
  event.addListener(listenerStub);
});

addMessageHandler(MessageType.REMOVE_EVENT_LISTENER, function(listener) {
  var event = lookUpApiFunction(listener.path);
  if (!event) {
    return;
  }

  var listenerStub = listenerStubs[listener.listenerId];
  if (!listenerStub) {
    error('Could not find event listener ' + listener.listenerId);
    return;
  }
  delete listenerStubs[listener.listenerId];
  event.removeListener(listenerStub);
});


