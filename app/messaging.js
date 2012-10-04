var MessageType = {
  // Sent from the host to the sandbox to populate the API stubs.
  INIT_APIS: 'init-apis',
  // Sent from the host to the sandbox to evaluate a string.
  EVAL: 'eval',
  // Sent from the sandbox to the host with the result of an EVAL message.
  EVAL_RESULT: 'eval-result',
  // Sent from the sandbox to the host with a request to run an API function.
  RUN_API_FUNCTION: 'run-api-function',
  // Sent from the host to the sandbox with the result of an RUN_API_FUNCTION
  // message.
  RUN_API_FUNCTION_RESULT: 'run-api-function-result',
  // Sent from the sandbox to the host to log a message to the console.
  LGO: 'log'
};

var messageHandlers = {};
function addMessageHandler(messageType, handler) {
  messageHandlers[messageType] = handler;
}

onmessage = function(event) {
  var message = event.data;
  if (!(message.type in messageHandlers)) {
    log('Unexpected message: ' + message.type, 'red');
    return;
  }

  messageHandlers[message.type](message.params);
}