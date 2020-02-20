import * as jsyaml from 'js-yaml'
import * as fs from 'fs'
import * as forge from 'node-forge'

function createKey(pwd: string, salt: forge.Bytes) {
  const numIterations = 1024
  return forge.pkcs5.pbkdf2(pwd, salt, numIterations, 32);

}

const encoding = 'utf-8'

if (process.argv.length < 3) {
  throw new Error('Need to provide key')
}

console.log('reading and converting yaml')
const content = fs.readFileSync(`${__dirname}/data/profile.yaml`, encoding)
const asJson = jsyaml.load(content, {})
const asJsonStr = JSON.stringify(asJson)

console.log('encrypting...')
const pwd = process.argv[2]

const newSalt = forge.random.getBytesSync(128);
let key = createKey(pwd, newSalt)
const iv = forge.random.getBytesSync(32); // AES-256

var cipher = forge.cipher.createCipher('AES-CBC', key);
cipher.start({iv: iv});
cipher.update(forge.util.createBuffer(asJsonStr, 'utf8'));
cipher.finish();

// save output
fs.writeFileSync(`${__dirname}/../../_includes/hb-context/profile.ctx`, cipher.output.toHex())
const cfg = { s: forge.util.bytesToHex(newSalt) }
fs.writeFileSync(`${__dirname}/../../_data/hbcfg/profile.json`, JSON.stringify(cfg))

// load to verify
const encrypted = fs.readFileSync(`${__dirname}/../../_includes/hb-context/profile.ctx`, encoding)
const salt = JSON.parse(fs.readFileSync(`${__dirname}/../../_data/hbcfg/profile.json`, encoding)).s
key = createKey(pwd, forge.util.hexToBytes(salt))

// decrypt some bytes using CBC mode
// (other modes include: CFB, OFB, CTR, and GCM)
var decipher = forge.cipher.createDecipher('AES-CBC', key);
decipher.start({iv: iv});
decipher.update(forge.util.createBuffer(forge.util.hexToBytes(encrypted)));
var result = decipher.finish(); // check 'result' for true/false

if (!result || !decipher.output.toString()) {
  console.log(decipher.output.toString());
  throw new Error('Unable to decode, something went wrong')
}
