import * as jsyaml from 'js-yaml'
import * as fs from 'fs'
import * as assert from 'assert'
import * as forge from 'node-forge'

const numIterations = 100000
const encoding = 'utf-8'
const algo = 'AES-CBC'

function deriveKey(pwd: string, salt: forge.Bytes) : string {
  return forge.pkcs5.pbkdf2(pwd, salt, numIterations, 32);
}

async function encryptMessage(key: string, iv: forge.Bytes, message: string) {
  const cipher = forge.cipher.createCipher(algo, key);
  cipher.start({iv: iv});
  cipher.update(forge.util.createBuffer(message, 'utf8'));
  cipher.finish();

  return cipher.output.toHex();
}

async function decryptMessage(key: string, iv: forge.Bytes, message: forge.Bytes) {
  const decipher = forge.cipher.createDecipher('AES-CBC', key);
  decipher.start({iv: iv});
  decipher.update(forge.util.createBuffer(message));
  const result = decipher.finish();
  if (!result) {
    throw new Error('Decryption failed')
  }

  return decipher.output.toString();
}


async function main(pwd: string) {
  console.log('reading and converting yaml')
  const content = fs.readFileSync(`${__dirname}/data/profile.yaml`, encoding)
  const asJson = jsyaml.load(content, {})
  const asJsonStr = JSON.stringify(asJson)
  
  console.log('encrypting...')
  const newSalt = forge.random.getBytesSync(128);
  const newKey = await deriveKey(pwd, newSalt)
  const newIv = forge.random.getBytesSync(32); // AES-256
  const encrypted = await encryptMessage(newKey, newIv, asJsonStr)

  // save output
  fs.writeFileSync(`${__dirname}/../../_includes/hb-context/profile.ctx`, encrypted)
  const cfg = { 
    s: forge.util.bytesToHex(newSalt),
    iv: forge.util.bytesToHex(newIv)
  }
  fs.writeFileSync(`${__dirname}/../../_data/hbcfg/profile.json`, JSON.stringify(cfg))

  // read it back in to verify
  const encryptedHex = fs.readFileSync(`${__dirname}/../../_includes/hb-context/profile.ctx`, encoding)
  const saltAndIvHex = JSON.parse(fs.readFileSync(`${__dirname}/../../_data/hbcfg/profile.json`, encoding))

  const reconstructKey = await deriveKey(pwd, forge.util.hexToBytes(saltAndIvHex.s))
  const reconstructMessage = await decryptMessage(reconstructKey, forge.util.hexToBytes(saltAndIvHex.iv), forge.util.hexToBytes(encryptedHex))
  assert.equal(asJsonStr, reconstructMessage)
}

if (process.argv.length < 3) {
  throw new Error('Need to provide key')
}

main(process.argv[2]).then(() => console.log('done...'))