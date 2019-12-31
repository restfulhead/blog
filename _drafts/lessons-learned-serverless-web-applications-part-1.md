---
layout: post
title: "Lessons learned when building Serverless web applications - Part 1"
permalink: lessons-learned-serverless-web-applications-part-1
date: 2000-01-01 00:00:00 -0500
tags: [serverless, faas, api, back-end, jamstack, javascript, typescript, nodejs, nosql]
excerpt_separator: <!--more-->
---
During the last couple of years my team has built different Serverless Web applications both on AWS and on Azure. In this series of posts I would like to share a few lessons learned and patterns that have worked very well for us.
<!--more-->

## The ingredients

Our Serverless application usually consists of the following components:

- The back-end: Web Services API (REST)
- The front-end: Single page application / Native mobile client
- Pipeline for Continuous Integration / Deployment
- Authentication with OAuth 2 and JSON Web Tokens
- Content Management Service: To maintain and serve content

You are reading part 1 of this series, where I'm going to focus on the back-end.

### Choosing one language
Many articles about Microservices and Serverless promote the fact that you can use different programming languages to implement APIs. This is a double edged sword. On the one hand it gives you flexibility to use the right tool for the job. It's also great, if you already have many diverse teams. On the other hand, keep in mind that the more languages you introduce, the more effort you will have to address common concerns, differences in runtime behavior and configuration format, etc.

What worked well for us is to settle on a main language and only make exceptions for special cases. Such cases could be code for machine learning running on Python or functions that require high performance using Rust. However, the vast majority of our code uses TypeScript (JavaScript). This has the added benefit that we can use the same language in the back-end and front-end, which makes full-stack development much more streamlined.

## The API specification - OpenAPI

We chose to follow a design first approach. This means our API endpoints and models are described by using the [OpenAPI specification][openapi]. We then [generate code][openapi-generator] based on the specification. Because we use the same language for our back-end and front-end (TypeScript), we generate the model interfaces only once to a directory that is shared between both layers. Our NPM target that triggers the code generation looks similar to the following example:

{% highlight json linenos %}
{
  "scripts": {
    "generate": "rm -rf ../shared/generated && openapi-generator generate -i openapi.yaml -g typescript-angular --type-mappings object=any -o ../shared/generated -Dmodels && npm run lint:shared",
    "lint:shared": "tslint -c ../shared/tslint.json --project tsconfig.json --fix '../shared/**/*.ts'",
  }
}
{% endhighlight %}

## The API implementation - Function as a service (FaaS) 

FaaS make it really easy to develop and execute business logic. All you have to do is write your code and deploy it to your cloud provider. The cloud provider is then responsible to execute the functions in a secure, fault tolerant and scalable environment. This is pretty awesome, because you no longer need to maintain servers, scaling happens automatically and you pay only for what you use (per request). Functions are triggered based on events. This could be an http event for API calls, a database event for record updates, an IOT event, etc. 

Cloud providers typically run your code inside containers under the hood. In order to allow for automatic and horizontal scaling, the provider will start and terminate containers on demand. So, there is no guarantee that the same container is used during the next function invocation. You need to consider this when architecting your application. 

### Cold starts
When a new container is created, your function is started from scratch (cold start). This means that all global state is empty. You may want to consider this when selecting languages and frameworks. For example a traditional Java / Spring Framework based application will take a long time to initialize. Long startup times don't play well in a FaaS environment. If your function initialization takes a long time, your users will experience an unpleasant latency or you have to do workarounds such as regular warmup calls. 

### State (or the lack of)
Your functions should be stateless as much as possible, because you cannot rely on global state or the file system. Where traditional applications often use global variables, memory or the file system, with FaaS the goal is to isolated state, i.e. move it elsewhere. Here are a few practical examples.

| Use case                  | Traditional                                          | Serverless                                         |
|---------------------------|------------------------------------------------------|----------------------------------------------------|
| User Session Management   | In memory                                            | NoSQL database                                     |
| Object Locks              | In memory (for example using "synchronized" in Java) | NoSQL database/cache                               |
| Media files               | Local file system                                    | Blob storage                                       |
| User authentication state | In memory                                            | JWT as part of request payload                     |
| Database authentication   | In memory                                            | Lambda execution role or Azure Managed Identities  |
| Database connection       | In memory                                            | Aurora http connector                              |

However, in practice there's often still the need for global state. For example a third party service may require an access token which you need to request first. This could be part of the initialization code that you run and you could store the result in a global/static variable. If a container is re-used (warm), then the token will already be available.

It's important to note that the container lifecycle and startup times are significantly different between [AWS Lambda][aws-lambda] and [Azure Functions][azure-functions]. For example Azure offers a premium plan, where at least one instance of your function application is always running. Think about the previous example, where your function requires an access token: Now you also have to check the token's expiration date, because your function might run for several hours or days and therefore just requesting a new token during initialization will no longer work. Also in AWS functions are much more isolated and run independently where in Azure all functions of the same app are running together.

This part of the Serverless world is unfortunately still very painful and time consuming. My recommendation is to write a common initialization-with-retry function that is thoroughly tested and generic enough so that it can be used for various initialization scenarios (e.g. retrieving access tokens, connecting to databases, ...)

## Data stores

The need to isolate state is something to consider when choosing a database as well. On the one hand access patterns may change and on the other hand certain databases might be better suited for a Serverless environment. For example SQL databases usually require connection management, which as we saw in the previous section, is not ideal. AWS addresses this with the [Data API for Aurora Serverless][aws-aurora-http]. Instead of a persisted connection, you can simply send http requests to run SQL statements. DynamoDB[aws-dynamodb], the AWS proprietary NoSQL database, also allows data manipulation via http requests without connection management. 

Sidenote: If you are concerned about vendor lock-in when choosing a NoSQL database, MongoDB might be a good choice. Both [AWS][aws-mongodb] and [Azure][azure-mongodb] offer managed databases with MongoDB compatibility.

We typically use a NoSQL database such as AWS DynamoDB[aws-dynamodb] or Azure CosmosDB[azure-mongodb] as the primary datastore that is accessed by our API. Optionally we add a full-text search service such as [Elasticsearch][elasticsearch], a cache services such as [Redis][redis] and/or a SQL database for reporting. Using a database with a platform as a service (PaaS) really pays off, because those usually integrate well with your back-end functions. For example it is very easy to configure a Lambda function that listens to DynamoDB changes and then indexes the data into Elasticsearch, Redis or a SQL reporting table. This helps especially when implementing the [CQRS pattern][cqrs] often found in event based systems.

## The API Gateway

The [API Gateway][aws-api-gateway] / [API Management][azure-apim] helps us to expose our RESTful API to our clients. It translates the requests from the client into events and dispatches these events to our functions. 

You can decide how to map REST resources and methods to your functions. In a coarse-grained setup you would forward all requests from the gateway to only one (or a few) function(s). We're using a fine-grained approach, where we map each http method of each REST resource to a different function. Here's an example for an imaginary API for kittens: 

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

On AWS, this gives us the most flexibility, as we can define execution rights, environment variables and configuration such as timeouts per function. This approach will of course result in a lot of functions, so maintainability becomes a concern. That's why we make certain trade-offs. For example, we usually don't deploy each function individually. Instead, for example we have a `kittens.js` file that contains all functions for maintaining kittens. This file along with its dependencies will be automatically deployed. (More information about our CI/CD pipeline setup will follow in a future post.) Similar we only have a few execution roles that are shared by most functions. However, some functions may require additional privileges. With our fine-grained setup, we can give those a dedicated role with more access rights.

Sidenote: Unfortunately in Azure most configuration is done at the function application level (which concerns all functions) and not on individual functions.

## Conclusion
In this first part of the Serverless series I've provided patterns and notes when designing a Serverless back-end API. I hope to post the next part soon. If you have feedback, questions or are missing some information, I would love to hear from you (via [Twitter @restfulhead][http://twitter.com/restfulhead] or see [contact][/contact]). 


[openapi]: https://swagger.io/docs/specification/about/ 
[openapi-generator]: https://github.com/OpenAPITools/openapi-generator
[aws-lambda]: https://aws.amazon.com/lambda/
[azure-functions]: https://azure.microsoft.com/en-us/services/functions/
[aws-aurora-http]: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html
[aws-dynamodb]: https://aws.amazon.com/dynamodb/
[aws-mongodb]: https://aws.amazon.com/blogs/aws/new-amazon-documentdb-with-mongodb-compatibility-fast-scalable-and-highly-available/
[azure-mongodb]: https://docs.microsoft.com/en-us/azure/cosmos-db/mongodb-introduction
[elasticsearch]: https://www.elastic.co/
[redis]: https://redis.io/
[cqrs]: https://martinfowler.com/bliki/CQRS.html
[aws-api-gateway]: https://aws.amazon.com/api-gateway/
[azure-apim]: https://azure.microsoft.com/en-us/services/api-management/
