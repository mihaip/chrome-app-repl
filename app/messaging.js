var MessageType = {
  // Sent from the host to the sandbox to populate the API stubs.
  INIT_APIS: 'init-apis',

  // Sent from the host to the sandbox to evaluate a string.
  EVAL: 'eval',
  // Sent from the sandbox to the host with the result of an EVAL message.
  EVAL_RESULT: 'eval-result',

  // Sent from the sandbox to the host with a request to run an API function.
  RUN_API_FUNCTION: 'run-api-function',
  // Sent from the host to the sandbox when RUN_API_FUNCTION message results in
  // a callback parameter being invoked.
  RUN_API_FUNCTION_CALLBACK: 'run-api-function-callback',

  // Sent from the sandbox to the host to log a message to the console.
  LOG: 'log',

  // Sent from the sandbox to the host with a request to add a listener for an
  // event.
  ADD_EVENT_LISTENER: 'add-event-listener',
  // Sent from the sandbox to the host with a request to remove a listener for
  // an event.
  REMOVE_EVENT_LISTENER: 'remove-event-listener',
  // Sent from the host to the sandbox with the invocation of a previously
  // registered event handler.
  RUN_EVENT_LISTENER: 'run-event-listener'
};

var messageHandlers = {};
function addMessageHandler(messageType, handler) {
  messageHandlers[messageType] = handler;
}

onmessage = function(event) {
  var message = event.data;
  if (!(message.type in messageHandlers)) {
    error('Unexpected message: ' + message.type);
    return;
  }

  messageHandlers[message.type](message.params);
}

// Magic value that can be returned from expressions that are eval-ed that
// prevents the response from being logged on the host side.
var SUPPRESS_EVAL_RESPONSE = 'suppress-eval-response';
