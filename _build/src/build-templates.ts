import * as Handlebars from "handlebars"
import * as fs from 'fs'

const content = fs.readFileSync(`${__dirname}/templates/profile.handlebars`, 'utf-8')
let compiled = Handlebars.precompile(content);
fs.writeFileSync(`${__dirname}/../../_includes/hb-templates/profile.hb.js`, compiled)
