## Read-eval-print loop (REPL) for Chrome App APIs.

[Chrome packaged app](http://developer.chrome.com/apps) that lets you play around with any of the [app APIs](http://developer.chrome.com/apps/api_index.html).

Since packaged apps don't allow the direct use of `eval()`, implementing a REPL is a bit tricky. The app `eval()`s all code in a [sandboxed frame](http://developer.chrome.com/apps/app_external.html#sandboxing). To enable API usage in a sandboxed frame (where APIs are normally disallowed), proxy/stub functions are created for all APIs such that they're executed in the main frame and the results forwarded back.

### Sample usage

Here's a sample session that plays around with the [socket API](https://developer.chrome.com/apps/socket.html) to do an HTTP request to google.com via a TCP socket on port 80.

First, to save some typing, an alias for the socket API is created:

    > var socket = chrome.socket;
    undefined

Then a socket is created. The `_` parameter is a special built-in magic value into the REPL that will generate a callback function that logs when it is called and dumps all of its parameters.

    > socket.create('tcp', _);
    undefined
    chrome.socket.create callback invoked with:
      {"socketId":22}

Now that we know the ID of the socket that was created, we can use it to connect to `www.google.com` on port 80 (the invocation of the callback with 0 indicates success).

    > socket.connect(22, 'www.google.com', 80, _);
    undefined
    chrome.socket.connect callback invoked with:
      0

We then issue our HTTP request (`str2ab` is a built-in function that converts a string to an `ArrayBuffer`).

    > socket.write(22, str2ab('GET / HTTP/1.0\r\n\r\n'), _);
    undefined
    chrome.socket.write callback invoked with:
      {"bytesWritten":18}

And then read the first 512 bytes of the response (`ab2str` is another built-in function that converts an `ArrayBuffer` to a string):

    > socket.read(22, 512, function(readInfo) {log(ab2str(readInfo.data))});
    undefined
    HTTP/1.0 200 OK
    Date: Sun, 21 Oct 2012 23:49:32 GMT
    Expires: -1
    Cache-Control: private, max-age=0
    Content-Type: text/html; charset=ISO-8859-1
    Set-Cookie: PREF=ID=e187568b6e5ec70f:FF=0:TM=1350863372:LM=1350863372:S=1sEm5a5yBRBQhJZU; expires=Tue, 21-Oct-2014 23:49:32 GMT; path=/; domain=.goog