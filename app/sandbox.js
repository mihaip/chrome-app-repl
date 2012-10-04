function sendHostMessage(type, params) {
  top.postMessage({type: type, params: params}, '*');
}

function log(text, opt_color) {
  sendHostMessage(MessageType.LOG, {text: text, opt_color: opt_color});
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
          log('Unexpected type ' + descriptor.type + ' for property ' + propertyPath.join('.'), 'red');
          break;
      }
    }

    if (descriptor.type == 'object') {
      generateApiStubs(descriptor.children, object[propertyName], propertyPath);
    }
  }
}

function generateFunctionStub(path) {
  return function() {
    sendHostMessage(MessageType.RUN_API_FUNCTION, {
      path: path
    });
  };
}

addMessageHandler(MessageType.RUN_API_FUNCTION_RESULT, function(result) {
  log('Result: ' + JSON.stringify(result));
});


function generateEventStub(path) {
  return {
    addListener: function() {
      log('Adding a listener for ' + path.join('.'));
    },
    removeListener: function() {
      log('Removing a listener for ' + path.join('.'));
    }
  };
}

addMessageHandler(MessageType.EVAL, function(code) {
  var result;
  var exception;
  try {
    result = eval(code);
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