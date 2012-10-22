function sendHostMessage(type, params) {
  try {
    top.postMessage({type: type, params: params}, '*');
  } catch (e) {
    if (e.code == DOMException.DATA_CLONE_ERR) {
      error('Could not serialize object during postMessage() ' +
          'from sandbox to host.');
    }
  }
}

function log(text, opt_level) {
  sendHostMessage(MessageType.LOG, {text: text, opt_level: opt_level});
  return SUPPRESS_EVAL_RESPONSE;
}

var apiDescriptors;

addMessageHandler(MessageType.INIT_APIS, function(descriptors) {
  apiDescriptors = descriptors;
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
          if (arg == _) {
            arg = generateLoggingCallback(path);
          }
          pendingCallbacks[callbackIdCounter] = arg;
          arg = {callbackId: callbackIdCounter++};
        case 'number':
        case 'string':
        case 'boolean':
        case 'object':
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
    return SUPPRESS_EVAL_RESPONSE;
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

var eventListeners = {};
var eventListenerIdCounter = 0;

function generateEventStub(path) {
  return {
    addListener: function(listener) {
      var listenerId = eventListenerIdCounter++;
      var listenerRef = {
        listener: listener,
        path: path
      };
      eventListeners[listenerId] = listenerRef;

      sendHostMessage(MessageType.ADD_EVENT_LISTENER, {
        path: path,
        listenerId: listenerId
      });
      return SUPPRESS_EVAL_RESPONSE;
    },
    removeListener: function(listener) {
      var registeredListenerId = -1;
      for (var listenerId in eventListeners) {
        var listenerRef = eventListeners[listenerId];
        if (listenerRef.listener == listener &&
            listenerRef.path.join('.') == path.join('.')) {
          registeredListenerId = listenerId;
          break;
        }
      }

      if (registeredListenerId == -1) {
        error('Unknown event listener');
        return;
      }

      delete eventListeners[registeredListenerId];
      sendHostMessage(MessageType.REMOVE_EVENT_LISTENER, {
        path: path,
        listenerId: registeredListenerId
      });
      return SUPPRESS_EVAL_RESPONSE;
    },
    hasListeners: function(callback) {
      for (var listenerId in eventListeners) {
        var listenerPath = eventListeners[listenerId].path;
        if (path.join('.') == listenerPath.join('.')) {
          callback(true);
          return;
        }
      }

      callback(false);
      return SUPPRESS_EVAL_RESPONSE;
    }
  };
}

addMessageHandler(MessageType.RUN_EVENT_LISTENER, function(params) {
  if (!(params.listenerId in eventListeners)) {
    error('Unknown event listener ' + params.listenerId);
    return;
  }
  var listener = eventListeners[params.listenerId].listener;
  listener.apply(this, params.params);
});

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
