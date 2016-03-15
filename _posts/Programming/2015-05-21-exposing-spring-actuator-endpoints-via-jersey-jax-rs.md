---
layout: post
title: "Exposing Spring Actuator endpoints via Jersey"
permalink: exposing-spring-actuator-endpoints-via-jersey-jax-rs
date: 2015-05-21 19:17:44 -0500
tags: [actuator, health, jax-rs, jersey, metrics, monitoring, rest, spring, spring boot, thread dump, web service]
excerpt_separator: <!--more-->
---
> Transparency makes the difference between a system that improves over time in production and one that stagnates on decays.<sup>[1]</sup>

Spring Boot comes with a number of [production ready endpoints][production-ready-endpoints] that expose information about your application's configuration and health. This insight is vital for monitoring. By default Spring Actuator functionality is accessible via Spring MVC. This is not ideal when you use Jersey (JAX-RS) as your primary web service framework. In fact, if you use Spring Boot's Jersey Starter sample project, the endpoints don't even work out of the box (see [Issue #2025][issue2025]). In this post, I'm going to demonstrate how to expose the Actuator endpoints via Jersey.
<!--more-->
There are workarounds that are only based on configuration and do not require any code changes. For example as described in the issue's comments, it's possible to map Spring MVC's `DispatcherServlet` under a different context, for example under /spring. This would allow you to access the Actuator services via this context. As an alternative it's also possible to map Jersey's `jerseyServlet` under a different name.<sup>[2]</sup> This, however, would mean that you need to access your resources under a different context. Both options aren't really great, because they require you to use Spring MVC in addition to Jersey.

Fortunately, Spring's architects decoupled the Actuator endpoints from the MVC controllers. This makes it possible to easily use and expose them via a Jersey endpoint. Here's an example how to access the *health* and *metrics* Actuator endpoints under the root context. The data is exposed as JSON. As a bonus we print out the thread dump as text.

{% highlight java linenos %}
@Path("/")
@Produces({ MediaType.APPLICATION_JSON })
@Component
public class ActuatorEndpoints
{
  @Autowired
  private HealthEndpoint health;

  @Autowired
  private MetricsEndpoint metrics;
  
  @Autowired
  private DumpEndpoint dump;

  
  @GET
  @Path("/health")
  public Object getHealth()
  {
    return health.invoke();
  }
  
  @GET
  @Path("/metrics")
  public Object getMetrics()
  {
    return this.metrics.invoke();
  }

  @GET
  @Path("/metrics/{name:.*}")
  public Object getMetric(@PathParam("name") final String name)
  {
    final Object value = this.metrics.invoke().get(name);
    if (value == null)
    {
      throw new NotFoundException("No such metric: " + name);
    }
    return value;
  }
  
  @GET
  @Path("/dump")
  @Produces(MediaType.TEXT_PLAIN)
  public Object getThreadDump()
  {
    return new StreamingOutput()
    {
      @Override
      public void write(final OutputStream os) throws IOException, WebApplicationException
      {
        final Writer writer = new BufferedWriter(new OutputStreamWriter(os));
        for (final ThreadInfo thread : dump.invoke())
        {
          writer.write(thread.toString());
        }

        writer.flush();
      }
    };
  }
}{% endhighlight %}

You can even disable the Spring MVC endpoints by setting a property. If you use the Actuator endpoints as shown above, they will still work.

{% highlight text linenos %}
# disable spring mvc endpoints
endpoints.enabled=false
{% endhighlight %}

Here's an example output of the health Actuator mapped under *http://localhost:8080/health*.

{% highlight json linenos %}
{
  "status": "UP",
  "diskSpace": {
    "status": "UP",
    "free": 58559954944,
    "threshold": 10485760
  }
}
{% endhighlight %}

To conclude it's easy to make use of the Spring Actuator endpoints without having to access them via Spring MVC.

----------------
`[1]` Michael T. Nygard, Release It!: Design and Deploy Production-Ready Software (Pragmatic Bookshelf; 1 edition, 2007), 271.

`[2]` Rob's Blog, 2015: [Using Spring Boot Actuator Endpoints and Jersey Web Services][using-spring-boot-actuator-endpoints-and-jersey-web-services]


[production-ready-endpoints]: http://docs.spring.io/spring-boot/docs/current/reference/html/production-ready-endpoints.html
[issue2025]: https://github.com/spring-projects/spring-boot/issues/2025
[using-spring-boot-actuator-endpoints-and-jersey-web-services]: https://rterp.wordpress.com/2015/02/09/using-spring-boot-actuator-endpoints-and-jersey-web-services/