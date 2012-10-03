var MessageType = {
  // Sent from the host to the sandbox to populate the API stubs.
  INIT_APIS: 'init-apis',
  // Sent from the host to the sandbox to evaluate a string.
  EVAL: 'eval',
  // Sent from the sandbox to the host with the result of an EVAL message.
  EVAL_RESULT: 'eval-result',
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