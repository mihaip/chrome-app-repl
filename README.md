## Read-eval-print loop (REPL) for Chrome App APIs.

[Chrome packaged app](http://developer.chrome.com/apps) that lets you play around with any of the [app APIs](http://developer.chrome.com/apps/api_index.html).

Since packaged apps don't allow the direct use of `eval()`, implementing a REPL is a bit tricky. The app `eval()`s all code in a [sandboxed frame](http://developer.chrome.com/apps/app_external.html#sandboxing). To enable API usage in a sandboxed frame (where APIs are normally disallowed), proxy/stub functions are created for all APIs such that they're executed in the main frame and the results forwarded back.

### Installation

The REPL application is [available in the Chrome Web Store](https://chrome.google.com/webstore/detail/omdkgkgnnakfiojpcjdobjgdlpimkcbp). Use the "Add to Chrome" button from the store web page, and then launch it from the New Tab Page.

### Built-in functions

To make life a bit easier, the REPL environment adds a few built-in functions that you can use.

* `log()`, `info()`, `warning()`, and `error()` let you log values to the console at various logging levels (results of expressions are automatically logged)
* `serialize()` is a helper method that logs a stringified serialization of the passed in values. This may be useful when inspecting complex objects returned by API methods.
* `_` is a magic placeholder value that can be passed in to all API methods and event listeners that expect a callback function. The `_` will be replaced with a callback that logs its parameters via `serialize()`
* `ab2str` and `str2ab` are helper methods for converting between `ArrayBuffer`s and (ASCII-encoded) strings, which make interactions with the [serial](http://developer.chrome.com/apps/serial.html), [socket](http://developer.chrome.com/apps/socket.html), [Bluetooth](http://developer.chrome.com/apps/bluetooth.html), and [USB](http://developer.chrome.com/apps/usb.html) APIs easier.

You can get a complete list of built-in functions by running the `help` command. You can also the `events` and `methods` commands to list all API events that can be listener for and methods that can be invoked.

### Limitations

The implementation of the REPL relies on [`postMessage`](https://developer.mozilla.org/en-US/docs/DOM/window.postMessage) to communicate between the main and sandboxed frames. This is an asynchronous mechanism, and thus only asynchronous Chrome APIs can be proxied. Thankfully most APIs are asynchronous, but this does mean that some simple ones like [`chrome.runtime.getURL`](http://developer.chrome.com/apps/runtime.html#method-getURL) are not supported.

The proxying relies on parameters being copied from one context to another. This is done via the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/DOM/The_structured_clone_algorithm), which means that certain complex JavaScript types may not be supported. Functions parameters (used as callbacks) get special treatment and should work, but currently `FileEntry` values (as used by the [`chrome.fileSystem`](http://developer.chrome.com/apps/fileSystem.html) API) are not supported.

### Sample usage

Here's a sample session that plays around with the [socket API](https://developer.chrome.com/apps/socket.html) to do an HTTP request to google.com via a TCP socket on port 80. This sesssion is also [available as a screencast](http://www.youtube.com/watch?v=IK5RYT2Um9A).

First, to save some typing, an alias for the socket API is created. The `undefined` that appears is the result of that expression (variable declarations don't return a value).

    > var socket = chrome.socket;
    undefined

Then a socket is created. The `_` parameter is a special built-in magic value into the REPL that will generate a callback function that logs when it is called and dumps all of its parameters.

    > socket.create('tcp', _);
    chrome.socket.create callback invoked with:
      <object> {
        socketId:
          <number> 22
      }

Now that we know the ID of the socket that was created (normally we would save it in the callback), we can use it to connect to `www.google.com` on port 80 (the invocation of the callback with 0 indicates success).

    > var socketId = 22;
    undefined
    > socket.connect(socketId, 'www.google.com', 80, _);
    chrome.socket.connect callback invoked with:
      <number> 0

We then issue our HTTP request (`str2ab` is a built-in function that converts a string to an `ArrayBuffer`).

    > socket.write(socketId, str2ab('GET / HTTP/1.0\r\n\r\n'), _);
    chrome.socket.write callback invoked with:
      <object> {
        bytesWritten:
          <number> 18
      }

And then read the first 512 bytes of the response.

    > socket.read(socketId, 512, _);
    chrome.socket.read callback invoked with:
      <object> {
        data:
          <ArrayBuffer, 512 bytes> HTTP/1.0 200 OK
    Date: Mon, 22 Oct 2012 05:07:53 GMT
    Expires: -1
    Cache-Control: private, max-age=0
    Content-Type: text/html; charset=ISO-8859-1
    Set-Cookie: PREF=ID=d8539cf2c8d07c94:FF=0:TM=1350882473:LM=1350882473:S=KfFPY0z1EOdqBstx; expires=Wed, 22-Oct-2014 05:07:53 GMT; path=/; domain=.google.com
    Set-Cookie: NID=65=DZuaw2vrI1YOsJl_K6Z9Rg_cYB2MrHyaVVLPC7ZpEnAhMFOGwq0GFCSCpGFenqTnD3tPmUXI7eS-UBpVI8COw_aGPHPxwFxEX_VC96P4DX5yb9t33AYnZnZgm0WJvhzE; expires=Tue, 23-Apr-2013 05:07:53 GMT; path=/; domain=.goog,
        resultCode:
          <number> 512
      }

Finally, we can close the socket.

    > socket.disconnect(socketId);

### Identity API setup

When running locally (as an unpacked app), the app's `manifest.json` should have the following snippet. It forces the app to have a stable ID (`maekkhccpnonljjlbkejieamkbodeida`) by giving it a `key` property (the value is `chrome-app-repl` base 64 encoded).

    "key": "Y2hyb21lLWFwcC1yZXBs",
    "oauth2": {
      "client_id": "581301639896.apps.googleusercontent.com",
      "scopes": [
        "https://www.google.com/reader/api/"
      ]
    }

The store version will have a different ID (`omdkgkgnnakfiojpcjdobjgdlpimkcbp`), so those keys should be replaced with:

    "oauth2": {
      "client_id": "581301639896-4r356t81mtf1nbnfgc53bgjn3t6k7maq.apps.googleusercontent.com",
      "scopes": [
        "https://www.google.com/reader/api/"
      ]
    }

