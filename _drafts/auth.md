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
