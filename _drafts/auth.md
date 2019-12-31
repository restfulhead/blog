---
layout: post
title: "Lessons learned when building Serverless web applications - Part 1"
permalink: lessons-learned-serverless-web-applications-part-1
date: 2000-01-01 00:00:00 -0500
tags: [serverless, jamstack, javascript, typescript, nodejs, api, backend, faas, nosql]
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

### AUthentication of otehr services

managed identities, 


### User generated content
This might trigger the question what to do with user generated content. For example how can a user upload an image in a secure manner, without sending the data through the API Gateway? We could just open up our S3 bucket and allow everybody to upload files. However, this would make it easy for a malicious user to overwrite files or to spam us with big files. [Pre-signed URLs][aws-s3-presigend-urls] are here to the rescue. Authenticated clients can use our API to request a pre-signed URL. They can then use this URL to send data directly to S3.

[aws-fine-grained-access-control]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
[aws-dynamodb-best-practices]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GuidelinesForTables.html
[aws-private-content]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html
[aws-s3-presigned-urls]: https://docs.aws.amazon.com/AmazonS3/latest/dev/PresignedUrlUploadObject.html

[aws-api-gateway-custom-authorizer]: https://docs.aws.amazon.com/apigateway/latest/developerguide/use-custom-authorizer.html

