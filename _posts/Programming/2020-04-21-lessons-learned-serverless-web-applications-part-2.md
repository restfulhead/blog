---
layout: post
title: "Lessons learned when building Serverless web applications - Part 2"
permalink: lessons-learned-serverless-web-applications-part-2
date: 2019-12-30 00:00:00 -0500
tags: [serverless, faas, api, ci, jenkins, automation, cloud]
excerpt_separator: <!--more-->
---
With Serverless we get rapid provisioning, automation and consumption based billing. This enables new development and release processes that are just not possible with traditional applications and infrastructure. Add to this a DevOps culture and the dream to build, test, and release software faster and more reliably becomes true. This part of the Serverless lessons learned series focusses on Continuous Delivery.

<!--more-->

First, let's take a look at how this new development process differs from the traditional model. Then I'm going to describe our setup and what worked well for us.

Traditional development usually happens in a local environment, that is disconnected and often very different than the actual production environment. Depending on the size and complexity of the application, this could mean a long and tedious onboarding process for new developers. Containers are often used to simplify this, but even their setup and maintenance can become complex and may not resemble services used in production. Also this means infrastructure changes that developers perform in their local setup are not reflected on other environments. This leads to costly errors that are discovered very late in the process.

You also typically have a limited number of dev and staging environments. In a project with many parallel work-streams, I've actually seen people fight over these precious resources.

Modern cloud infrastructure changes the game. We can now provision entire new environments in minutes if not seconds and consumption based billing makes that feasible also from a financial perspective. With this approach, developers each have their own isolated cloud environment. Setting this up usually means running a single command. Developers can then code and test against the actual setup. And more so, with infrastructure as code they can test modifications immediately. These modifications are then checked in into version control along with the regular application code. This means these changes can be code reviewed and released along with the application. Think about full-stack development not just for front-end and back-end code, but also for infrastructure code. Teams can own most of their app and changes for new features, which often impact every tier, can be developed, tested and rolled out together. This removes friction and overhead between dev and ops.

Ok, enough of the benefits, let's see how to make this happen. The rest of this article focusses mostly on automation of cloud resources and how to overcome specific challenges. This is an important part of in the journey towards Continuous Delivery, but there are certainly other parts that are just as important. For example, a modern development and release process requires a modern application. In [part1](part1) I've shared some good practices to build a back-end for the cloud. And as always, besides technology there is culture and mindset, which are often much more challenging to change.

## What's in scope - Cloud infrastructure

A typical cloud native application does not only consist of application code deployed in containers or as functions. You usually have much more cloud infrastructure to configure, such as databases, blob storage, CDNs, etc. For this, it's a good idea to split up these resources into different stacks, instead of adding everything to a single stack. By stack, I mean an infrastructure template that can be rolled out, such as a [CloudFormation](CloudFormation) template or a [Terraform]() template.

There are several reasons for using different stacks:

  - Some resources might be slow to provision (looking at you, CloudFront) or expensive (database instances)
  - Some parts of the infrastructure may require additional change management / reviews
  - You want those parts that change frequently (application code, functions, API changes, ...) deployed as fast as possible and smaller templates help (also there may be some technical limitations regarding huge templates)
  - You will have dependencies between different resources (more on this below)

Based on this, we typically see the following types of stacks.

  1. Shared base infrastructure stacks, that provision expensive resources that are going to be shared
  2. Functions along with their code and API mapping (routes) and other cheap infrastructure deployed per developer, branch and/or pull request
  3. Other infrastructure that depends on 1) and 2)

This was very abstract, let's talk about an example. Note that the decision about what services to share depend on the cloud provider, the service and your requirements. Services that don't offer consumption based billing or are slow to provision are good candidates for shared resources. Otherwise you'll spend a lot of money and/or time when provisioning a new environment (per developer, branch and/or pull request). In general, however, you want to avoid sharing wherever possible, because you don't get the testing/isolation benefits.

For example we might decide to share a database and ElasticSearch cluster in our development environment. This will be our first stack. Rolling out changes to this stack can be a bit tricky, as they could potentially break your development environment. Shared stacks need to be carefully maintained (think about backwards compatibility, downtime, etc) and thus deployment is usually done by a dedicated pipeline (not part of the app release pipeline).

Now let's look at the parts that we want to deploy automatically in an isolated environment. That's of course your function code, your API Gateway routes (and maybe even the entire gateway, if feasible), blobs, database schemas and tables, Elastic Search indexes, static assets of the front-end. All this is part of our app release pipeline that gets automatically triggered for every branch and/or pull request. Not that in this example we have shared the database cluster, but the database schema/tables are not. This may require some code changes to your application to work with schema/table prefixes, etc. I'll point this out again in the next section, where I'm going to describe the main app build pipeline.

## Continuous Integration

These days there are a lot of CI solutions on the market. Our choice has been and still is: [Jenkins][Jenkins]. That being said, the concepts described here should be translatable to other CI systems.

Jenkins is a very flexible, battle proven automation server that has continuously improved over the years. With an endless number of plugins and multiple ways to configure pipelines, it can be a bit confusing to new users. Here's what works very well for us:

### Declarative pipelines and pipeline libraries

We've been using version control, code reviews and automated testing for application code for decades and the benefits are clear. And more recently we also treat infrastructure as code the same way. You definitely want to follow the same pattern for your CI pipelines and related configuration. Often enough I've seen teams configure complex jobs with complex parameters directly by using the Jenkins UI and test them in a trial and error fashion by running the job. Granted, when Jenkins first launched some 15 (!) years ago, that was the only option to configure things. A lot has changed since then.

Pipeline libraries allow you to script your entire pipeline. Your job then simply references a pipeline. The pipelines, stages and helper scripts can all live in a version control repository and your can then follow the same code review processes as you already do for application code. With [jenkins-pipeline-unit](jenkins-pipeline-unit) you can then also run automated tests, catching many (but unfortunately not all) bugs before running the Job in Jenkins.

Building your pipeline mostly [declaratively](declarative-pipelines) with tedious things implemented in helpers and custom stages make things a bit easier to understand, especially to get an overview about the different pipeline stages.

### Configuration Management

Similar to how your pipeline is described as code, you also want this for your configuration of the build job. Avoid having a lot of build parameters and instead load most of your configuration from a code repository or dedicated service. This way changes to configuration are also versioned, code reviewed, etc. 

We have most of our configuration in one or more configuration code repositories. This is another repository that does not contain application code. The JSON configuration files are located in directories following a specific hierarchy. The first step in all of our pipelines is to load the configuration based on very few parameters. Here's what our `Jenkinsfile` of a multi-branch project looks like:

```
@Library('our-pipeline-library')
package jenkins.pipelines;

def myParams = [
  'CLIENT': '...',
  'APP': '...',
  'REGION': '...',
  'ENVIRONMENT': '...'
  'STACK': '...',
]

withEnv(myParams.collect { key, value -> "${key}=${value}" }) {
  pipelineServerless()
}
```

The parameters are not pipeline specific, they only describe how to load the configuration from the configuration repository. By using a hierarchy such as `client -> app -> region -> environment -> stack`, we can have some common configuration files at the top, and others overwriting specific values down to the individual stack.

### Secret Management

Just like we do not hard-code passwords in application code or configuration files, the configuration repository does contain passwords either. Instead, make use of Secret Management services, such as [Vault by HashiCorp](vault), [AWS Secrets Manager](aws-secrets) and [Azure Key Vault](az-keyvault). If a configuration value contains sensitive data, we add a reference to record in the secret management solution instead. Our pipeline configuration helper then resolves the secrets accordingly. 

### Pipeline Steps

For many applications, we deploy everything (infrastructure, front-end and back-end) together. As mentioned in the introduction, this is awesome, because features often require changes in all layers. This means there is a huge benefit to have a single pull request that contains all those changes. The following shows (a slightly simplified version of) the different stages of our Serverless pipeline. It gets triggered automatically when a branch or pull request is created. Some stages may be skipped, depending what branch is being built.

{% picture small serverless-build-pipeline.png alt="Serverless pipeline" %}

```
graph TD

Setup-->BB[Backend Build/Test]
BB-->BA[Backend Audit/Dep check]
BA-->BD[Backend Deploy]
BD-->BP[Backend Post depl]
BP-->BE[Backend API E2E tests]
BE-->FB[Frontend Build/Test]
FB-->FA[Frontend Audit/Dep check]
FA-->FD[Frontend Deployment]
FD-->FT[Frontend UI E2E Tests]
FT-->AT[Auto Tag]
AT-->QC[QC Analysis]
```




[part1]: 2020-04-21-lessons-learned-serverless-web-applications-part-1
CloudFormation
Terraform
Jenkins
jenkins-pipeline-unit

[declarative-pipelines]: https://jenkins.io/doc/book/pipeline/syntax/#declarative-pipeline
[vault](https://www.vaultproject.io/)
[aws-secrets](https://aws.amazon.com/secrets-manager/)
[az-keyvault] https://azure.microsoft.com/en-us/services/key-vault/