---
layout: post
title: "AWS API gateway as HTTP proxy with Lambda workaround"
date: 2016-03-14 21:14:32 -0500
permalink: aws-api-gateway-http-proxy-lambda-workaround
tags: [aws, api, gateway, apigateway, proxy, http, lambda, mapping, template, cognito, context]
excerpt_separator: <!--more-->
---

In addition to invoking [Lambda functions](http://docs.aws.amazon.com/apigateway/latest/developerguide/integrating-api-with-aws-services-lambda.html) and other [AWS services such as S3](http://docs.aws.amazon.com/apigateway/latest/developerguide/integrating-api-with-aws-services-s3.html), the [API Gateway](https://aws.amazon.com/api-gateway/) can also act as a [proxy](http://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started-mappings.html) between the user and your http based service. For example if you already have a service based architecture you could integrate it with the gateway to maintain, monitor and secure a public API for your services. However, Amazon’s priorities seem to be on the former two integration methods, because when it comes to the details the HTTP proxy integration is quite painful at the moment. In this post I will highlight some of the pitfalls and provide workarounds.
<!--more-->

Defining an API is very easy: You can use the AWS console to click your resources  and methods together, import a [Swagger API](http://swagger.io/) definition or use an automation framework such as [Serverless](https://github.com/serverless/serverless). It gets a bit more difficult when it comes to the actual integration with your service or Lambda function. If you go beyond the basic “hello world” examples, then most likely your service or function will be interested in the request context, such as headers, path parameters and information about the user. For this you need to become familiar with the API Gateway’s [request mapping templates](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html).

In our case we are using AWS Cognito to identify users and rely on the gateway for authentication. Ideally this would save us some time and resources
otherwise spent on implementing this ourselves. Our backend services therefore need the `cognitoIdentityId` attribute from the API Gateway's `$context`. My initial assumption was that I could easily forward this attribute as a header parameter, similar to the `Authorization` header which is commonly used for basic or token based authentication. However, here comes the first issue.

You can only access `$context` in the mapping template for the body of your method. It is currently not possible to access context variables in the mapping for header, query or path parameters. I think this is an indication that the API Gateway was build primarily for Lambda. (Lambda functions have a generic event object, which is used to hold all data.) But what about the Http proxy integration? Sure, we could include the context attributes to the body of every resource. But this requires changing the contract (or data model, if you will) and our internal API would be different from the public API. We could no longer use the same Swagger file to define our API. Even more problematic are `GET` calls, which typically do not have a body. So this would mean we would need to violate standards and introduce `POST` calls just to satisfy the API gateway.

Hopefully Amazon will address this very soon. The obvious solution would be to support mapping templates also for headers. In the meantime, to continue our development without having to change our API, I have created a generic workaround based on Lambda. The idea is fairly simple: The lambda function takes in the request along with all the relevant context attributes (such as the cognito identity) from the API Gateway. It then invokes our backend service and passes the context attributes as header values. Long story short: We now have an additional proxy. The API Gateway redirects to Lambda which redirects to our backend service. This is of course unfortunate, because it adds latency and complexity and therefore more possibilities for failure. However, it at least solves our immediate problem without requiring our backend services to change. In theory it also gives us an opportunity to add features such as client side load balancing (although we are hoping that this is a feature that the API gateway will provide in future).

## AWS Lambda proxy
The following code snippet shows a basic implementation of a Lambda proxy function. (At the time of writing the Node.js version used for Lambda is a bit outdated and unfortunately does not allow us to use block scoping or other ES6 features without more [workarounds](http://www.rricard.me/es6/aws/lambda/nodejs/2015/11/29/es6-on-aws-lambda.html). :-/). 
{% highlight javascript linenos %}
'use strict';

var http = require('http');

var APP_PROTOCOL = "http:";
var APP_HOST = "localhost";
var APP_PORT = 8080;

// Lambda Handler
module.exports.handler = function(event, context) {

    console.log("Forwarding request", event.httpMethod, event.resourcePath, event.requestId, event.headerParams, event.pathParams, event.queryParams);

    // store additional gateway data in custom headers
    event.headerParams["X-AWS-request-id"] = event.requestId;
    event.headerParams["X-AWS-cognito-pool"] = event.cognitoIdentityPoolId;
    event.headerParams["X-AWS-cognito-id"] = event.cognitoIdentityId;
    event.headerParams["Content-Type"] = "application/json; charset=utf-8";
    event.headerParams["Accept"] = "application/json";
    
    // replace any path parameters
    if (event.resourcePath.indexOf("{") >= 0) {
        Object.keys(event.pathParams).map(function(key) {
            event.resourcePath = event.resourcePath.replace("{" + key + "}", event.pathParams[key]); 
        });
    }
        
    // create query parameters string
    var queryParams = Object.keys(event.queryParams).map(function(key) {
        var obj = key + "=" + event.queryParams[key];
        return obj;
    });
    var queryParamsStr = "?" + queryParams.join("&");

    var options = {
        method: event.httpMethod,
        protocol: APP_PROTOCOL,
        hostname: APP_HOST,
        port: APP_PORT,
        headers: event.headerParams,
        path: event.resourcePath + queryParamsStr
    };

    console.log("Sending request with options", options);

    var req = http.request(options, function (res) {
        console.log("Received response", res.statusCode);
        res.setEncoding('utf8');
        
        var body = '';
        res.on('data', function(d) {
            body += d;
        });
        res.on('end', function() {
            context.succeed(body);
        });
    });

    req.on('error', function(e) {
        console.error(e);
        context.fail(e);
    });

    req.end();
}

{% endhighlight %}


Most of it is pretty straight forward. The destination server is hard-coded here, but you could easily make it more dynamic. We simply read the request details from the event object and construct an HTTP call to our destination server. As mentioned in the introduction, this requires defining a mapping template in the API Gateway. This was a bit painful, too, because certain parts of the mapping aren’t quite what one would expect. You might have guessed: It’s again about headers, path and query parameters.

## Fun with mapping templates
You can access parameters via `$input.params()`. For example you can access header attributes directly: `$input.params().header.get('Content-Type’)`. However, in our case we just want all headers and forward them to our backend. So a simple `$input.params().header` should do, right? Not quite: This gives you back a map, as the documentation says. In Lambda you would end up with a string that looks like a map (`{test=val1, again=val2}`), which would be very tedious to use. Because there is no escaping and there are no quotes, a simple JSON.parse() won’t work. The solution? Make use of Lambda’s template language ([Velocity](http://velocity.apache.org/engine/devel/vtl-reference-guide.html)) to construct the desired object:

{% highlight json %}
#set($params = $input.params())
{
  "requestId": "$context.requestId",
  "resourcePath": "$context.resourcePath",
  "httpMethod": "$context.httpMethod",
  "cognitoIdentityId": "$context.identity.cognitoIdentityId",
  "cognitoIdentityPoolId": "$context.identity.cognitoIdentityPoolId",
  "body": $input.json('$'),
  "queryParams" : {
      #foreach($paramName in $params.get("querystring").keySet())
        "$paramName" : "$util.escapeJavaScript($params.get("querystring").get($paramName))"
        #if($foreach.hasNext),
        #end
      #end
    },
  "headerParams" : {
     #foreach($paramName in $params.get("header").keySet())
       "$paramName" : "$util.escapeJavaScript($params.get("header").get($paramName))"
       #if($foreach.hasNext),
       #end
     #end
   },
  "pathParams" : {
     #foreach($paramName in $params.get("path").keySet())
       "$paramName" : "$util.escapeJavaScript($params.get("path").get($paramName))"
       #if($foreach.hasNext),
       #end
     #end
   }
}
{% endhighlight %}


## Conclusion
While the API Gateway can be used as an Http proxy, there are still some serious shortcomings that need to be addressed with workarounds. It’s understandable that Amazon is pushing for Lambda. However, there is also a big opportunity by integrating existing services, where it’s not feasible to migrate them to Lambda. We hope Amazon will improve the HTTP proxy integration soon, at the very least by allowing to forward context variables as headers.