import * as Handlebars from "handlebars"
import * as fs from 'fs'

function precompileTpl(name: string) {
  const content = fs.readFileSync(`${__dirname}/templates/${name}.handlebars`, 'utf-8')
  const compiled = Handlebars.precompile(content);
  fs.writeFileSync(`${__dirname}/../../_includes/hb-templates/${name}.hb.js`, compiled)
}

precompileTpl('profile')
precompileTpl('profile-experience')