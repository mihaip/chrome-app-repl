var _ = function () {'<callback_placeholder>'};

function generateLoggingCallback(path) {
  return function() {
    log(path.join('.') + ' callback' +
        (arguments.length ? ' invoked with: ' : ''));
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      log('  ' + JSON.stringify(arg));
    }
  };
}

window.__defineGetter__('help', function() {
  var helpText = '';
  function addCommandHelp(commandName, description) {
    helpText += '\033[32m' + commandName + ':\033[0m ' + description + '\n';
  }

  addCommandHelp('    log(m)', 'Log a message.');
  addCommandHelp('   info(m)', 'Log a message at the INFO level.');
  addCommandHelp('warning(m)', 'Log a message at the WARNING level.');
  addCommandHelp('  error(m)', 'Log a message at the ERROR level.');
  addCommandHelp('    events', 'List all events that can be listener for.');
  addCommandHelp('   methods', 'List all API methods that can be invoked.');
  addCommandHelp('         _', 'Placeholder value that can be passed in ' +
                                   'wherever a callback is a parameter. Will ' +
                                   'log the invocation and its parameters.');
  addCommandHelp('ab2str(ab)', 'Converts an ArrayBuffer into a string ' +
                                   '(assumes ASCII characters only).');
  addCommandHelp('str2ab(st)', 'Converts a string into an ArrayBuffer ' +
                                   '(assumes ASCII characters only).');
  addCommandHelp('      help', 'This message.');

  info(helpText);

  return SUPPRESS_EVAL_RESPONSE;
});

window.__defineGetter__('events', function() {
  // TODO(mihaip): add a more general visitor function pattern for API
  // descriptors that can be used both here and in generateApiStubs.
  function dumpEventHelper(descriptors, path) {
    for (var propertyName in descriptors) {
      var propertyPath = path.concat(propertyName);
      var descriptor = descriptors[propertyName];

      if (descriptor.type == 'event') {
        log(propertyPath.join('.'));
      }

      if (descriptor.type == 'object') {
        dumpEventHelper(descriptor.children, propertyPath);
      }

    }
  }

  dumpEventHelper(apiDescriptors, []);
  return SUPPRESS_EVAL_RESPONSE;
});

window.__defineGetter__('methods', function() {
  // TODO(mihaip): add a more general visitor function pattern for API
  // descriptors that can be used both here and in generateApiStubs.
  function dumpMethodsHelper(descriptors, path) {
    for (var propertyName in descriptors) {
      var propertyPath = path.concat(propertyName);
      var descriptor = descriptors[propertyName];

      if (descriptor.type == 'function') {
        log(propertyPath.join('.'));
      }

      if (descriptor.type == 'object') {
        dumpMethodsHelper(descriptor.children, propertyPath);
      }

    }
  }

  dumpMethodsHelper(apiDescriptors, []);
  return SUPPRESS_EVAL_RESPONSE;
});

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}