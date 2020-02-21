{"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <li>"
    + container.escapeExpression(container.lambda((depth0 != null ? lookupProperty(depth0,"title") : depth0), depth0))
    + "\n      <ul>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"points") : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":7,"column":8},"end":{"line":9,"column":17}}})) != null ? stack1 : "")
    + "      </ul>\n    </li>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "        <li>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</li>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<h3 class=\"dense\">"
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"title") : depth0), depth0))
    + " | "
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"company") : depth0), depth0))
    + " | <span class=\"subtle-main\">"
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"date") : depth0), depth0))
    + "</span></h3>\n<div class=\"list-styled dense\">\n  <ul>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"desc") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":4},"end":{"line":12,"column":13}}})) != null ? stack1 : "")
    + "  </ul>\n</div>";
},"useData":true}