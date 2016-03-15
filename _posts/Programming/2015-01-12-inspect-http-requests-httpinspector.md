---
layout: post
title: "Inspect your http requests with httpinspector"
permalink: inspect-http-requests-httpinspector
date: 2015-01-12 21:14:10 -0500
tags: [analyze, body, debug, hackathon, http, inspect, json, log, node, node.js, payload, request, swift]
excerpt_separator: <!--more-->
---
Last week at our Hackathon I got my hands dirty with [Swift][swift]. In particular I was using [NSURLConnection][nsurlconnection] to post JSON http requests to a 3rd party web service. The web service wasn't documented. All I had were a few request examples that I knew were successful before. So I needed my web service client to produce similar http headers and a similar JSON body.

My first attempts caused the server to return a 500 Internal Server Error. Without any more details to go with, I suspected that maybe some header value or JSON value in my http request was formatted incorrectly. In order to confirm my theory, I needed a way to analyze the http request that my application was producing.

Unfortunately I wasn't able to find a way to make NSURLConnection log out the complete request details including headers and payload. My next attempt was to use [Charles][charles], which is a Proxy that can be used to debug HTTP traffic. I was able to see all header values, but for some reason the JSON payload (raw body) was empty. After double and triple checking that I was correctly setting the [HTTPBody of NSMutableURLRequest][nsmutableurlrequest] in my code and after changing numerous Charles settings, I still wasn't able to see the actual payload of my request. Not wanting to lose any more time on this (we only had 2 days in total for our Hackathon projects), I decided to write a simple web server that would just print out all http request details.
<!--more-->
## Solution

And that's how [httpinspector][httpinspector] was born. It's using [Node.js][nodejs] and is really as straight-forward as it can be. All it does is print out the http request header values and the raw payload. It's less than 20 lines of code and to write the script and get it running it probably took me about 15 minutes. Compare that to my previous 45 minutes time wasted on trying to get Charles to output the same.

Here is an example of the output that httpinspector writes to the console:
{% highlight text linenos %}
* GET ************************************
/service/api/users
{ host: 'localhost:5000',
  accept: 'application/json',
  version: '1.0',
  'accept-language': 'en-us',
  'accept-encoding': 'gzip, deflate',
  'content-type': 'application/json; charset=utf-8',
  'user-agent': 'myapp/1 CFNetwork/720.1.1 Darwin/14.0.0 (x86_64)',
  connection: 'keep-alive' }

* POST ************************************
/service/api/times
{ host: 'localhost:5000',
  accept: 'application/json',
  version: '1.0',
  'accept-encoding': 'gzip, deflate',
  'accept-language': 'en-us',
  'content-type': 'application/json; charset=utf-8',
  'content-length': '152',
  'user-agent': 'myapp/1 CFNetwork/720.1.1 Darwin/14.0.0 (x86_64)',
  connection: 'keep-alive' }
{"activityId":"345","comment":"Just a test","date":"20150112","projectId":"USI00028"}
{% endhighlight %}

## Final thoughts

With this I was able to compare the actual request data to the request examples and identify any differences.

If you'd like to give it a spin, you can find the [code on GitHub][code].

[swift]: https://developer.apple.com/swift/
[nsurlconnection]: https://developer.apple.com/library/mac/documentation/Cocoa/Reference/Foundation/Classes/NSURLConnection_Class/index.html#//apple_ref/occ/clm/NSURLConnection/sendAsynchronousRequest:queue:completionHandler:
[charles]: http://www.charlesproxy.com/
[nsmutableurlrequest]: https://developer.apple.com/library/ios/documentation/Cocoa/Reference/Foundation/Classes/NSMutableURLRequest_Class/index.html#//apple_ref/occ/instp/NSMutableURLRequest/HTTPBody
[httpinspector]: https://github.com/ruhkopf/httpinspector
[nodejs]: http://nodejs.org/
[code]: https://github.com/ruhkopf/httpinspector