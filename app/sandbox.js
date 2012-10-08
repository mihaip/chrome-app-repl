function sendHostMessage(type, params) {
  // TODO(mihaip): handle structured clone errors.
  top.postMessage({type: type, params: params}, '*');
}

function log(text, opt_level) {
  sendHostMessage(MessageType.LOG, {text: text, opt_level: opt_level});
}

addMessageHandler(MessageType.INIT_APIS, function(apiDescriptors) {
  generateApiStubs(apiDescriptors, window, []);
});

window.__defineGetter__('help', function() {
  var helpText = '';
  function addCommandHelp(commandName, description) {
    helpText += '\033[32m' + commandName + ':\033[0m ' + description + '\n';
  }

  addCommandHelp('    log(m)', 'Log a message.');
  addCommandHelp('   info(m)', 'Log a message at the INFO level.');
  addCommandHelp('warning(m)', 'Log a message at the WARNING level.');
  addCommandHelp('  error(m)', 'Log a message at the ERROR level.');
  addCommandHelp('      help', 'This message.');

  info(helpText);

  return SUPPRESS_EVAL_RESPONSE;
});

function generateApiStubs(descriptors, object, path) {
  for (var propertyName in descriptors) {
    var propertyPath = path.concat(propertyName);
    var descriptor = descriptors[propertyName];

    // If some Chrome APIs happen to already be available in the sandboxed
    // frame, we leave them alone, since they should already work.
    if (!(propertyName in object)) {
      switch (descriptor.type) {
        case 'object':
          object[propertyName] = {};
          break;
        case 'number':
        case 'string':
        case 'boolean':
          object[propertyName] = descriptor.value;
          break;
        case 'function':
          object[propertyName] = generateFunctionStub(propertyPath);
          break;
        case 'event':
          object[propertyName] = generateEventStub(propertyPath);
          break;
        default:
          error('Unexpected type ' + descriptor.type + ' for property ' + propertyPath.join('.'));
          break;
      }
    }

    if (descriptor.type == 'object') {
      generateApiStubs(descriptor.children, object[propertyName], propertyPath);
    }
  }
}

var pendingCallbacks = {};
var callbackIdCounter = 0;

function generateFunctionStub(path) {
  return function() {
    var params = [];
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      var argType = typeof arg;
      switch (typeof arg) {
        case 'function':
          pendingCallbacks[callbackIdCounter] = arg;
          arg = {callbackId: callbackIdCounter++};
        case 'number':
        case 'string':
        case 'boolean':
          break;
        default:
          error('Unexpected argument type ' + argType + ' for argument ' +
              arg + ' to function ' + path.join('.'));
          continue;
      }
      params.push(arg);
    }
    sendHostMessage(MessageType.RUN_API_FUNCTION, {
      path: path,
      params: params
    });
  };
}

addMessageHandler(MessageType.RUN_API_FUNCTION_CALLBACK, function(result) {
  if (!(result.callbackId in pendingCallbacks)) {
    error('Unknown callback ' + result.callbackId);
    return;
  }
  var callback = pendingCallbacks[result.callbackId];
  delete pendingCallbacks[result.callbackId];
  callback.apply(this, result.params);
});


function generateEventStub(path) {
  return {
    addListener: function() {
      debug('Adding a listener for ' + path.join('.'));
    },
    removeListener: function() {
      debug('Removing a listener for ' + path.join('.'));
    }
  };
}

addMessageHandler(MessageType.EVAL, function(code) {
  var result;
  try {
    result = eval.call(window, code);
  } catch (e) {
    sendHostMessage(MessageType.EVAL_RESULT, {
      exception: {
        type: e.constructor.name,
        message: e.message
      }
    });
    return;
  }

  sendHostMessage(MessageType.EVAL_RESULT, {
    result: result
  });
});
