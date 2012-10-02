chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('window.html', {
    id: 'window',
    defaultWidth: 600,
    defaultHeight: 700,
    defaultTop: 20,
    defaultLeft: 20
  });
});