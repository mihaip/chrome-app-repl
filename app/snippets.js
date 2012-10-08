var SNIPPETS = {
  'List serial ports': 'chrome.serial.getPorts(function(ports) {log(\'Serial ports:\\n  \' + ports.join(\',\\n  \'))});',
  'Add onLaunched listener': 'chrome.app.runtime.onLaunched.addListener(function() {log(\'App was launched\')});'
};

window.addEventListener('onload', setUpContextMenuDelayed);
window.addEventListener('focus', setUpContextMenuDelayed);

// Delay the invocation of setUpContextMenu so that a quick succession of load
// and focus events doesn't result in duplicate commands being inserted due to
// races.
var setUpContextMenuTimeout;
function setUpContextMenuDelayed() {
  if (setUpContextMenuTimeout) {
    clearTimeout(setUpContextMenuTimeout);
  }
  setUpContextMenuTimeout = setTimeout(setUpContextMenu, 100);
}

function setUpContextMenu() {
  chrome.contextMenus.removeAll(function() {
    for (var snippetName in SNIPPETS) {
      chrome.contextMenus.create({
        title: snippetName,
        id: snippetName,
        contexts: ['all']
      });
    }

    // Add a separator to distinguish our items from the built-in ones when in
    // unpacked mode. This shouldn't be necessary: http://crbug.com/154642
    chrome.contextMenus.create({
      type: 'separator',
      // ID shouldn't be necessary either: http://crbug.com/154644.
      id: 'separator',
      contexts: ['all']
    });
  });
}

chrome.contextMenus.onClicked.addListener(function(info) {
  // Context menu command wasn't meant for us.
  if (!document.hasFocus()) {
    return;
  }

  var snippet = SNIPPETS[info.menuItemId];
  jqconsole.Write(CONSOLE_PROMPT + snippet + '\n', 'jqconsole-prompt');
  sendSandboxMessage(MessageType.EVAL, snippet);
});
