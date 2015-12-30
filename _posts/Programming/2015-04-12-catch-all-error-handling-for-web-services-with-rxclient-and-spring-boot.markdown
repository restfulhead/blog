---
layout: post
title: "Catch-all error handling for web services with RxClient and Spring Boot"
permalink: catch-all-error-handling-for-web-services-with-rxclient-and-spring-boot
date: 2015-04-12 12:58:10 -0500
tags: [error handler, exception mapper, jersey, reactive, rest, rxclient, rxjava, spring boot]
excerpt_separator: <!--more-->
---
One of Spring Boot's many [sample projects][spring-boot-samples] demonstrates how to configure Spring with [Jersey][jersey]. We're using the JAX-RS API a lot in projects for developing of RESTful web services. It was designed for this specific task from the beginning, rather than retrofitted like Spring MVC was. Jersey also offers a [reactive client API][rxclient] which supports a reactive programming model.

In this post I'm going to show how to use the the reactive Jersey client based on RxJava together with Spring Boot. This post will also address how to handle and communicate server side errors back to the client. Specifically there are some issues I've discovered which are related to using the reactive Jersey client together with the embedded Tomcat container.
<!--more-->
## Setup
To begin with, check out the [spring-boot-sample-jersey project][spring-boot-sample-jersey]. It comes with a setup that deploys Jersey web resources to an embedded Tomcat container. It also demonstrates how to write integration tests using Spring's RESTTemplate. We would like to change the last part and use the reactive Jersey client instead of the template.

To do so, we need to add a dependency to jersey-rx-client-rxjava. This will provide us with an RxJava based implementation of the client. Spring Boot comes with an opinionated dependency management including many well known 3rd party libraries. While the Jersey RxClient extension is not managed by Spring, we can still leverage the Spring managed property "${jersey.version}" to specify the version. Here's what needs to be added to Maven's pom.xml.

{% highlight xml linenos %}
<dependency>
  <groupId>org.glassfish.jersey.ext.rx</groupId>
  <artifactId>jersey-rx-client-rxjava</artifactId>
  <version>${jersey.version}</version>
</dependency>
{% endhighlight %}

Next we need to configure our reactive Jersey client. Add the following code to SampleJerseyApplication.java

{% highlight java linenos %}
@Bean
public RxClient<RxObservableInvoker> createHttpClient()
{
  return RxObservable.from(ClientBuilder.newClient());
}
{% endhighlight %}

Now that we have our client configured, let's write a simple hello world test case.

{% highlight java linenos %}
@RunWith(SpringJUnit4ClassRunner.class)
@SpringApplicationConfiguration(classes = SampleJerseyApplication.class)
@IntegrationTest("server.port=0")
@WebAppConfiguration
public class JerseyClientTests
{
  @Value("${local.server.port}")
  private int port;

  @Resource
  private RxClient<RxObservableInvoker> client;

  @Test
  public void shouldGetHelloWorld()
  {
    final Observable<String> responseMessage = 
        client.target("http://localhost:" + this.port)
          .path("/hello").request().rx().get(String.class);
    assertThat(responseMessage.toBlocking().single(), equalTo("Hello World"));
  }
}
{% endhighlight %}

To highlight in the above code is that `.rx()` gives us access to the reactive interface of the client. That means a GET will return an Observable rather than the actual response. There are many good presentations out there about why and how to use Observables. This is beyond the scope of this article, though. That's why for test purposes, we simply block to retrieve the result.

## Problem
In addition to the success test case, we also would like to test server error scenarios. To do so, let's add some code to the Endpoint.class that causes a server error and implement a new test.

{% highlight java linenos %}
@GET
@Path("/serverError")
public String simulateServerError()
{
  throw new ServerErrorException(500);
}
{% endhighlight %}

The following test method uses the non-reactive interface. It's expecting the client to throw an `InternalServerErrorException`.

{% highlight java linenos %}
@Test(expected=InternalServerErrorException.class)
public void shouldHandleServerError()
{
  client.target("http://localhost:" + this.port)
    .path("hello/serverError").request().get(String.class);
}
{% endhighlight %}

The above test passes. However, things change when using the reactive interface.

{% highlight java linenos %}
@Test(expected = InternalServerErrorException.class)
public void shouldHandleServerErrorRx()
{
  client.target("http://localhost:" + this.port)
    .path("hello/serverError").request().rx().get(String.class)
    .toBlocking().single();
}
{% endhighlight %}

The above test fails with a message `Expected exception: javax.ws.rs.InternalServerErrorException`. In other words, no exception was thrown. When further inspecting the result of this call, I was surprised to see the server sends a response body as shown here:

{% highlight text linenos %}
< 500
< Connection: close
< Content-Language: en
< Content-Length: 1082
< Content-Type: text/html;charset=utf-8
< Server: Apache-Coyote/1.1

<!DOCTYPE html><html><head><title>Apache Tomcat/8.0.20 - Error report</title> ...
{% endhighlight %}

This looks familiar, doesn't it? For some reason when using the RxClient, Tomcat replies with the standard error page. (This also happens by the way if we request and produce application/json; it's not related to the fact that we're requesting plain-text). In a more complex configuration we even saw cases where Tomcat's `StandardHostValve`  was trying to make a request to a non existing error page. Here's an extract from the log.

{% highlight text linenos %}
* Server has received a request on thread http-nio-auto-1-exec-1
> POST http://localhost:51816/testWebResource/serverError
> content-type: application/json

* Insert some exception here.

< Server responded with a response on thread http-nio-auto-1-exec-1
< 500

* Server has received a request on thread http-nio-auto-1-exec-1
> POST http://localhost:51816/error
> content-type: application/json

* Server responded with a response on thread http-nio-auto-1-exec-1
< 404
< Content-Type: application/json
{% endhighlight %}

This caused a painful troubleshooting session, because all we were seeing on the client side was the 404 error code, but not the 500.

## Solution
Spring Boot allows you to configure the embedded Tomcat. The most common configuration options such as the port and session timeout can be [configured via properties][serverproperties]. You can also [define an EmbeddedServletContainerFactory bean][boot-features-customizing-embedded-containers] in your configuration to further customize. Among other things this lets us specify custom error pages.

However, for applications that only feature web services such as a Microservices, there is no need for an error page. Instead, the service should always reply with a proper error code and provide more details in the response body if necessary.

The solution that I choose was simple in the end. We were already using ExceptionMappers to map certain business exceptions to specific web service responses. To avoid using Tomcat's error handling completely, we can just introduce a catch-all exception mapper that catches any exception and translates it to a response.

{% highlight java linenos %}
@Provider
public class CatchAllExcepionMapper implements ExceptionMapper<Throwable>
{
  @Override
  public Response toResponse(final Throwable exception)
  {
    final int status;
    final Map<String, Object> response = new HashMap<>();

    if (exception instanceof WebApplicationException)
    {
      final WebApplicationException webAppException = (WebApplicationException) exception;
      final Response exceptionResponse = webAppException.getResponse();
      status = exceptionResponse.getStatus();
      response.put("status", status);
      response.put("type", (webAppException instanceof ClientErrorException) ? "client" : "server");
      response.put("message", exceptionResponse.getStatusInfo().getReasonPhrase());
    }
    else
    {
      // any other exception
      status = Response.Status.INTERNAL_SERVER_ERROR.getStatusCode();
      response.put("status", status);
      response.put("type", "server");
      response.put("message", Response.Status.INTERNAL_SERVER_ERROR.getReasonPhrase());
    }

    return Response.status(status).entity(response).type("application/json").build();
  }
}
{% endhighlight %}

The mapper will catch all Throwables and translate them to a 500 Server Error response with a JSON body. In case of a WebApplicationException we can make use of its attributes, such as the status and the type (client or server). Here's a sample output:

{% highlight text linenos %}
< 500
< Content-Type: application/json
< {"type":"server","message":"Internal Server Error","status":500}
{% endhighlight %}

There's still room for improvement. For example if the exception mapper implementation itself throws an exception, it again gets routed to the standard error handler which tries to render Tomcat's default error page. Also to point out that the client  does not throw an exception. Therefore it's up to the caller to handle the response appropriately.

However, we successfully consolidated our error handling. We also no longer expose Tomcat's default error message if our resources misbehave. Finally this is also a good place to make sure all unexpected exceptions are logged. (This was omitted for the sake of brevity in the examples above).

## Conclusion
The reactive Jersey client in combination with Spring Boot's Tomcat configuration behaves differently from the normal client. When using RxClient, Tomcat renders a default server error page when the server resource throws an exception. Using Jersey's ExceptionMapper we can implement a catch-all error handler to standardize error responses and avoid exposing Tomcat's default error page.

[spring-boot-samples]: https://github.com/spring-projects/spring-boot/tree/master/spring-boot-samples
[jersey]: https://jersey.java.net
[rxclient]: https://jersey.java.net/documentation/latest/rx-client.html
[spring-boot-sample-jersey]: https://github.com/spring-projects/spring-boot/tree/master/spring-boot-samples/spring-boot-sample-jersey
[serverproperties]: https://github.com/spring-projects/spring-boot/blob/v1.2.3.RELEASE/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/web/ServerProperties.java
[boot-features-customizing-embedded-containers]: http://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-developing-web-applications.html#boot-features-customizing-embedded-containers