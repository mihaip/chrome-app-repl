function sendHostMessage(type, params) {
  top.postMessage({type: type, params: params}, '*');
}

function log(text, opt_level) {
  sendHostMessage(MessageType.LOG, {text: text, opt_level: opt_level});
}

addMessageHandler(MessageType.INIT_APIS, function(apiDescriptors) {
  generateApiStubs(apiDescriptors, window, []);
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
  var exception;
  try {
    result = eval.call(window, code);
  } catch (e) {
    exception = e;
  }

  // TODO(mihai): I assume we can do better, but this way we know nothing will
  // be rejected by the structured clone done by postMessage.
  var serializedResult = JSON.stringify(result);
  var serializedException = JSON.stringify(exception);

  sendHostMessage(MessageType.EVAL_RESULT, {
    result: serializedResult,
    exception: serializedException
  });
});
