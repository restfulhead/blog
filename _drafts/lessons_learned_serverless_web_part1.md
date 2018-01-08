---
layout: post
title: "Lessons learned when building serverless web applications - Part 1"
permalink: lessons_learned_serverless_web_part1
date: 2000-01-01 00:00:00 -0500
tags: [serverless, aws, web, api, gateway, apigateway, lambda, faas, dynamodb, elasticsearch, spa, multitenant, s3, presigned, upload, cloudfront]
excerpt_separator: <!--more-->
---
This is part 1 of an introduction and lessons learned from how we use serverless architecture at [Arvato Systems][arvato-systems]. It complements the [serverless-webinar] that I'm going to present on the XXX. The webinar highlights the benefits of scalability and shows how businesses can save time and effort by using serverless architecture. This blog post on the other hand discusses the more technical aspects about the topic. It's a summary of my experience with serverless architecture and development on AWS. While some of it is AWS specific, the general concepts can also be applied to other cloud service providers.
<!--more-->

First, let me describe the use case on which this discussion is based on. The goal is to develop a single page application that can be used on mobile and desktop. Furthermore other systems should be able to communicate with our application via an API. The SPA front-end should of course use the same API. The business application is used infrequently. There are certain peak times, and certain times where there is no traffic at all. This fits well with the elastic, pay-per-use model of serverless.

Please note that I won't provide a step-by-step tutorial on how to build this application. The aim of this post is to talk about some architectural design decisions and leassons learned. I hope this might help other architects and developers, who encounter similar concerns and challenges. I'm also very interested to hear other thoughts and opinions about this topic - [Tweets and Emails welcome][link-to-contact].

## Building the API
Ok, first let's start with the back-end API. The core services that we rely on are:
  -	[API Gateway][aws-api-gateway]
  -	Function as a service (FaaS): [Lambda][aws-lambda]
  -	NoSQL database as a service: [DynamoDB][aws-dynamodb]
  -	Search index as a service: [ElasticSearch][aws-elasticsearch]

The following figure shows the high level architecture of a typical serverless API. 

{% picture big serverless-api-architecture.png alt="High level serverless API architecture" %}

The API Gateway helps us to expose a RESTful API. It translates the requests from the client into events and dispatches these events to our functions (Lambda). The functions contain business logic and will usually rely on a database service (DynamoDB) and search index (ElasticSearch). DynamoDB is a NoSQL database. It's a great match for Lambda. It's highly available, durable and scalable out of the box. It's easy to integrate and you also pay per use. Since it's essentially a key/value store, the query capabilities are very limited though. Thus we add another service, ElasticSearch, to provide us with capabilities such as full-text search. While this is also a managed service (no server maintenance necessary), unfortunately AWS to date does not provide model similar to serverless. Instead, you have specify how many instances to use and their sizes and you pay for instance runtime, not per request.

### Function as a service (FaaS): Lambda
FaaS make it really easy to develop and execute business logic. All you have to do is write your code and deploy it to your cloud provider. The cloud provider is then responsible to execute the functions in a secure, fault tolerant and scalable environment. This is pretty awesome, because you no longer need to maintain servers, scaling happens automatically and you pay only for what you use (per request).

Lambda functions are triggered based on events. In our example architecture we are using two types of events. For API calls we will listen to events from the API Gateway. Then we also have a function that is responsible for updating the search index whenever a database record is inserted, updated or removed. This function will listen to events from Dynamo DB. Events could also come from IoT, streams and other sources. The fact that Lambda is highly available and scalable out of the box makes it really easy to build fault tolerant systems without a lot of effort. 

#### About programming languages, caching and cold starts
At the time of writing AWS Lambda supports the following programming languages: NodeJS, Java, Python, C#. We're a big Java shop and have developed many great web applications with Spring or Java EE. Naturally, our first attempt was to use similar technologies for our serverless work. However, we noticed pretty soon that this wasn't a good match. This is due to the fact that the JVM, libraries and frameworks often tend to optimize a lot of things during startup of an application. For example your traditional Java Spring application will take several seconds to initalize all beans and warm up the caches. This results in very fast execution times, but only once the application is up and running. Long startup times don't play well in a FaaS environment. In order to allow for automatic and horizontal scaling, cloud providers typically run your code inside containers under the hood. This means, it's possible that a new container is started just before your function is called (cold start). Furthermore this container will only have a limited lifetime. It will be destroyed, maybe as soon as your function finishes or maybe some short amount of time later. So, there is no guarantee that the same container is used during the next function invocation. 

You need to consider this when architecting your application. Your functions should be stateless and ideally be able to boot quickly. Otherwise, your users will experience an unpleasant latency or you have to do workarounds such as regular warmup calls. That being said, in practice especially when the workload is fairly static, AWS will usually re-use containers at least for a couple of minutes. So if you do have some initialization to do, you can use global/static variables and singletons to improve speed. In this case you would put this code outside of your handler function (see [Lambda best practices][aws-lambda-best-practices]).

### The API Gateway
The API Gateway allows us to define our RESTful API (for example using [Swagger][swagger]). It also translates all http(s) requests into events, that are forwarded to our Lambda functions. The gateway supports different integration methods. We're using the Lambda Proxy integration method, which is straight forward to use. 

You can decide how to map REST resources and methods to your lambda functions. In a coarse-grained setup you would forward all requests from the gateway to only one (or a few lambda) function(s). We're using a fine-grained approach, where we map each http method of each REST resource to a different lambda function. Here's an example for an imaginary API for kittens: 

{% highlight text %}
 /kittens
 |__ GET            => KittensGetFn 
 |__ POST           => KittensPostFn
 |__ OPTIONS 
 |__ /{kittenId} 
      |__ GET       => KittenGetFn 
      |__ PUT       => KittenPutFn
      |__ DELETE    => KittenDeleteFn

{% endhighlight %}

This gives us the most flexibility, as we can define execution rights, environment variables and configuration such as timeouts per function. However, it will of course result in a lot of functions, so  maintainability becomes a concern. That's why we make certain trade-offs. For example, we usually don't deploy each function individually (more on our continuous delivery pipeline will come in part 2). Instead, for example we have a `kittens.js` file (plus additional dependencies) that contains all functions for maintaining kittens. Similar we only have a few execution roles that are shared by most functions. However, some functions may require additional privileges. With our fine-grained setup, we can give those a dedicated role with more access rights.

### Authentication and authorization with OAuth2 and JWT
The API Gateway offers different methods for authorization. You can use AWS IAM or AWS Cognito (which itself has different options). Unless you have a specific use case, I would not recommend to use the AWS IAM authentication. This would require clients to sign all their requests with an AWS specific signature. Instead, I recommend to use OAuth in combination with JSON Web Tokens (JWT). It has become the de facto standard for securing APIs. You can use AWS Cognito or other authorization services for this. In our case we're already using another identity provider, which supports OAuth 2 with JWT. That's why we decided to use a [custom authorizer function][aws-api-gateway-custom-authorizer]. The following figure shows the high level process.

{% picture big api-authorization.png alt="API authorization" %}

A human user authenticates with the identity provider with a user name and password (plus perhaps an MFA token). We use the OAuth 2 Implicit Grant flow for this. Likewise machines that want to access our API also request an access token first. They use a client id and secret (OAuth 2 Client Credentials grant flow). If the authentication was successful, the provider returns an access token.

All calls to our API then have to include this access token as part of the Authorization header. The nice thing about JWT is that the token itself has already user information, expiration dates and a signature encoded. The authorizer can use the identity provider's public key to verify the signature. If the verification is successful, the authorizer can trust the content of the token and use it for further checks. All this can be done locally without a web service call to the authorization server.

So what are the further checks that we do? Besides of course checking the expiration date etc., we also have some application specific business logic. For example we have different billing accounts. Each billing account has a number of users. A user must not be able to access data of another billing account. We achieve this by using scopes, that we assign to users or user groups. This is configured in our identity management service. We also use scopes to grant access to certain operations (for example read vs. write). Our custom authorizer checks the scopes and matches them against the request parameters. For example if the authorizer sees the scopes `account:12345` and `kittens:read`, then it first checks whether the endpoint belongs to the correct account `12345`. This could be done for example by checking the URL (say `https://12345.arvato.com/kittens` or `https://api.arvato.com/12345/kittens` would match). In our case our accounts are pretty isolated from each other. In fact, we create a complete new stack when a new account is created (completely automated, more on this in part 2). We can therefore use an environment variable or an API Gateway stage variable to define and check the account. If the account id is invalid or does not match, we stop and deny access right there. Otherwise we check the other scopes against the path and method of the request. In the earlier example we would allow `GET /kittens` but deny `POST /kittens`, because the scope only allows for read options. We would also for example deny `GET /admin/tasks`, because we specified that scope `kittens:read` is only allowed to read kittens and nothing else. Of course the scopes you define and how granular depends on your business requirements.

Having an isolated stack per account gives us another advantage: isolation. We can for example roll out an account in their own dedicated AWS account, providing maximum isolation. This comes at price, though, because we would need dedicated resources such as DynamoDB tables and ElasticSearch clusters. So often it is desired to share some resources, but still provide sound security. How do we achieve this? By using [IAM policy conditions for fine-grained access control][aws-fine-grained-access-control].

{% highlight yaml %}
  PolicyName: "fine-grained-dynamodb-access"
  PolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Action:
        - dynamodb:GetItem
        - dynamodb:Query
        - dynamodb:PutItem
        - dynamodb:DeleteItem
        Effect: Allow
        Resource:
        - !Join [ ":", [ "arn:aws:dynamodb", !Ref "AWS::Region", !Ref "AWS::AccountId", "table/my-kittens" ]]
        - !Join [ ":", [ "arn:aws:dynamodb", !Ref "AWS::Region", !Ref "AWS::AccountId", "table/my-other-table" ]]
        Condition:
          'ForAllValues:StringEquals':
            'dynamodb:LeadingKeys':
            - !Ref AccountId
      - Action:
        - dynamodb:GetItem
        - dynamodb:Query
        Effect: Allow
        Resource: !Join [ ":", [ "arn:aws:dynamodb", !Ref "AWS::Region", !Ref "AWS::AccountId", "table/my-read-only-table" ]]
        Condition:
          'ForAllValues:StringEquals':
            'dynamodb:LeadingKeys':
            - !Ref AccountId
{% endhighlight %}

In the example above we give read/write access to two tables and read only access to another table. For both we specifiy a condition, that only allows access to database rows that belong to the current account. For this example to work, the hash key of your table needs to equal the account id. If you have a lot of data under one account, you probably want to consider an alternative condition to avoid "hot" keys (see [Best Practices for Tables][aws-dynamodb-best-practices]).

Here's another example for ElasticSearch:
{% highlight yaml %}
  PolicyName: "fine-grained-elasticsearch-access"
  PolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Action:
        - es:ESHttpGet
        - es:ESHttpHead
        - es:ESHttpPost
        - es:ESHttpPut
        Effect: Allow
        Resource: !Join [ "", [!Ref ElasticSearchARN, "/", !Ref AccountId, "/*"]]
{% endhighlight %}
As you can see we only allow access to indexes created under the current account.

Note that these are AWS IAM policies. So they will be enforced by AWS. Even if there would be a bug in one of our lambda functions or somebody deliberatly trying to read data from another account, the read operation would fail and AWS would deny access.

## Building the SPA web front-end
Ok, now that we have our API ready, let's take a look at our single page application web front-end. Of course we want to use serverless technologies here as well. AWS makes that very easy. The following figure shows an overview.

{% picture big serverless-ui-architecture.png alt="Serverless web front-end architecture" %}

We manage DNS entries with Route 53, so that we can configure nice looking sub-domains in an automated fashion (e.g. `super-awesome-customer.arvato.com`). This points to a CloudFront web distribution. CloudFront is a content delivery network (CDN) which caches our static assets and speeds up their delivery to the end-user. CloudFront pulls these assets from an S3 bucket (origin). So all we have to do when relasing a front-end change is to push our changes to the bucket. This is all pretty standard and easy to set up. Maybe worth mentioning is that you can create an [origin access identity][aws-private-content] to prevent someone from directly accessing the S3 bucket.

To summarize, the client loads all static content (html, css, images) from CloudFront. It then requests dynamic content via Ajax from our API. In general it's a good idea to offload assets to S3/CloudFront. You should avoid sending bigger files such as images through the API Gateway. The S3/Cloudfront alternative is much faster and more cost effective.

### User generated content
This might trigger the question what to do with user generated content. For example how can a user upload an image in a secure manner, without sending the data through the API Gateway? We could just open up our S3 bucket and allow everybody to upload files. However, this would make it easy for a malicious user to overwrite files or to spam us with big files. [Pre-signed URLs][aws-s3-presigend-urls] are here to the rescue. Authenticated clients can use our API to request a pre-signed URL. They can then use this URL to send data directly to S3.

## Summary
In this post I shared some of the concerns of serveless architecture and examples of how to address them. In the next post I'm planing to write about how we package and deploy our serverless application (over 400 functions and counting) and what I've learned along the way. (Spoiler alert: We use the [Serverless Application Model][aws-sam].) I'll also discuss our Continous Delivery pipeline and how it addresses some of the challenges that come with serveless development (such as testing).

[arvato-systems]: https://www.arvato.com/us-en/solutions/it-solutions/cloud-services.html
[serverless-webinar]: TODO
[link-to-contact]: /contact
[aws-api-gateway]: https://aws.amazon.com/api-gateway/
[aws-lambda]: https://aws.amazon.com/lambda/
[aws-dynamodb]: https://aws.amazon.com/dynamodb/
[aws-elasticsearch]: https://aws.amazon.com/elasticsearch-service/
[aws-lambda-best-practices]: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
[aws-api-gateway-custom-authorizer]: https://docs.aws.amazon.com/apigateway/latest/developerguide/use-custom-authorizer.html
[swagger]: https://swagger.io/
[aws-fine-grained-access-control]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
[aws-dynamodb-best-practices]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GuidelinesForTables.html
[aws-private-content]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html
[aws-s3-presigned-urls]: https://docs.aws.amazon.com/AmazonS3/latest/dev/PresignedUrlUploadObject.html
[aws-sam]: https://github.com/awslabs/serverless-application-model