{"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"row\">\n  <div class=\"column-sidebar\">\n\n    <div class=\"sidebar-header\">\n      <h1>\n        <i class=\"fas fa-user\"></i>\n        "
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"name") : stack1), depth0))
    + "\n      </h1>\n      <h2>"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"role") : stack1), depth0))
    + "</h2>\n    </div>\n    <div class=\"sidebar-contact\">\n      <ul class=\"list-unstyled\">\n        <li><i class=\"fas fa-envelope mr-05\"></i>\n        <a href=\"mailto:"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"email") : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"email") : stack1), depth0))
    + "</a>\n        </li>\n        <li><i class=\"fas fa-phone mr-05\"></i>\n        <a href=\"tel:"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"phone") : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"phone") : stack1), depth0))
    + "</a>\n        </li>\n        <li><i class=\"fab fa-linkedin mr-05\"></i>\n        <a href=\"https://linkedin.com/in/"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"linkedin") : stack1), depth0))
    + "\" target=\"_blank\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"linkedin") : stack1), depth0))
    + "</a>\n        </li>\n        <li><i class=\"fab fa-github mr-05\"></i>\n        <a href=\"https://github.com/"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"github") : stack1), depth0))
    + "\" target=\"_blank\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"github") : stack1), depth0))
    + "</a>\n        </li>\n        <li><i class=\"fab fa-blogger-b mr-05\"></i>\n          <a href=\"https://"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"blog") : stack1), depth0))
    + "\" target=\"_blank\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"blog") : stack1), depth0))
    + "</a>\n        </li>  \n        <li><i class=\"fab fa-twitter mr-05\"></i>\n        <a href=\"https://twitter.com/"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"twitter") : stack1), depth0))
    + "\" target=\"_blank\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"profile") : depth0)) != null ? lookupProperty(stack1,"twitter") : stack1), depth0))
    + "</a>\n        </li>\n      </ul>\n\n    </div>\n\n    <div class=\"sidebar-content\">\n      <h2>\n        <i class=\"fas fa-certificate\"></i>\n        Certifications\n      </h2>\n      <ul class=\"list-unstyled\">\n        {% for cert in profile.certifications %}\n        <li>"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"cert") : depth0)) != null ? lookupProperty(stack1,"title") : stack1), depth0))
    + "</li>\n        {% endfor %}\n      </ul>\n\n      <h2>\n        <i class=\"fas fa-graduation-cap\"></i>\n        Education\n      </h2>\n      <ul class=\"list-unstyled\">\n          {% for ed in profile.education %}\n          <li>"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"ed") : depth0)) != null ? lookupProperty(stack1,"title") : stack1), depth0))
    + " <br/><span class=\"subtle-sidebar\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"ed") : depth0)) != null ? lookupProperty(stack1,"desc") : stack1), depth0))
    + "</span></li>\n          {% endfor %}\n      </ul>\n      \n    </div>\n\n  </div>\n  <div class=\"column-main\">\n    <h2>\n      <i class=\"fas fa-flask\"></i>\n      Skills\n    </h2>\n    <ul class=\"list-unstyled dense\">\n      {% for skill in profile.skills %}\n      <li><span class=\"highlight\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"skill") : depth0)) != null ? lookupProperty(stack1,"title") : stack1), depth0))
    + "</span> &mdash; "
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"skill") : depth0)) != null ? lookupProperty(stack1,"desc") : stack1), depth0))
    + "</li>\n      {% endfor %}\n    </ul>\n\n    <h2>\n      <i class=\"fas fa-user-tie\"></i>\n      Professional Experience\n    </h2>\n\n    {% for experience in profile.recentExperiences %}\n      {% include profile-experience.html %}\n    {% endfor %}\n\n    <div id=\"read-more-content\" class=\"hidden\">\n      {% for experience in profile.moreExperiences %}\n        {% include profile-experience.html %}\n      {% endfor %}\n    </div>\n\n    <button id=\"read-more-button\" class=\"light-button\" onclick=\"toggleReadmore()\">Show more...</button>\n\n    <h2>\n      <i class=\"fas fa-rocket\"></i>\n      Freelance and side projects\n    </h2>\n    <ul class=\"list-unstyled dense\">\n      {% for freelance in profile.freelance %}\n      <li><span class=\"highlight\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"freelance") : depth0)) != null ? lookupProperty(stack1,"title") : stack1), depth0))
    + "</span> &mdash; "
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"freelance") : depth0)) != null ? lookupProperty(stack1,"desc") : stack1), depth0))
    + "</li>\n      {% endfor %}\n    </ul>\n\n  </div>\n</div>\n";
},"useData":true}