import * as jsyaml from 'js-yaml'
import * as fs from 'fs'
import * as forge from 'node-forge'

const numIterations = 100000
const encoding = 'utf-8'
const algo = 'AES-CBC'

// function createKey(pwd: string, salt: forge.Bytes) {
//   return forge.pkcs5.pbkdf2(pwd, salt, numIterations, 32);
// }

const fromHexString = (hexString: string)  =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

async function deriveKey(pwd: string, salt: Uint8Array) : Promise<CryptoKey> {
  let enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', 
    enc.encode(pwd), 
    {name: 'PBKDF2', length: 32}, 
    false, 
    ['deriveBits', 'deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      'name': 'PBKDF2',
      salt, 
      'iterations': numIterations,
      'hash': 'SHA-256'
    },
    keyMaterial,
    { 'name': 'AES-GCM', 'length': 256},
    true,
    [ 'encrypt', 'decrypt' ]
  );
}

async function encryptMessage(key: CryptoKey, iv: Uint8Array, message: string) {

  const encoded = new TextEncoder().encode(message);
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: algo,
      iv
    },
    key,
    encoded
  );

  let uint8 = new Uint8Array(ciphertext, 0, 5);
  return toHexString(uint8)
}

async function decryptMessage(key: CryptoKey, iv: Uint8Array, message: Uint8Array) {
  let decrypted = await window.crypto.subtle.decrypt(
    {
      name: algo,
      iv
    },
    key,
    message
  );

  return new TextDecoder().decode(decrypted);
}


async function main(pwd: string) {
  console.log('reading and converting yaml')
  const content = fs.readFileSync(`${__dirname}/data/profile.yaml`, encoding)
  const asJson = jsyaml.load(content, {})
  const asJsonStr = JSON.stringify(asJson)
  
  console.log('encrypting...')
  const newSalt = window.crypto.getRandomValues(new Uint8Array(16));
  const newKey = await deriveKey(pwd, newSalt)
  const newIv = window.crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await encryptMessage(newKey, newIv, asJsonStr)

  // save output
  fs.writeFileSync(`${__dirname}/../../_includes/hb-context/profile.ctx`, encrypted)
  const cfg = { 
    s: toHexString(newSalt),
    iv: toHexString(newIv)
  }
  fs.writeFileSync(`${__dirname}/../../_data/hbcfg/profile.json`, JSON.stringify(cfg))

  // read it back in to verify
  const encryptedHex = fs.readFileSync(`${__dirname}/../../_includes/hb-context/profile.ctx`, encoding)
  const saltAndIvHex = JSON.parse(fs.readFileSync(`${__dirname}/../../_data/hbcfg/profile.json`, encoding))

  const reconstructKey = await deriveKey(pwd, fromHexString(saltAndIvHex.s))
  const reconstructMessage = await decryptMessage(reconstructKey, fromHexString(saltAndIvHex.iv), fromHexString(encryptedHex))
  console.log(reconstructMessage)
}

if (process.argv.length < 3) {
  throw new Error('Need to provide key')
}

main(process.argv[2]).then(() => console.log('done...'))


// const newSalt = forge.random.getBytesSync(128);
// let key = createKey(pwd, newSalt)
// const iv = forge.random.getBytesSync(32); // AES-256

// var cipher = forge.cipher.createCipher('AES-CBC', key);
// cipher.start({iv: iv});
// cipher.update(forge.util.createBuffer(asJsonStr, 'utf8'));
// cipher.finish();

// // save output
// fs.writeFileSync(`${__dirname}/../../_includes/hb-context/profile.ctx`, cipher.output.toHex())
// const cfg = { s: forge.util.bytesToHex(newSalt) }
// fs.writeFileSync(`${__dirname}/../../_data/hbcfg/profile.json`, JSON.stringify(cfg))

// // load to verify
// const encrypted = fs.readFileSync(`${__dirname}/../../_includes/hb-context/profile.ctx`, encoding)
// const salt = JSON.parse(fs.readFileSync(`${__dirname}/../../_data/hbcfg/profile.json`, encoding)).s
// key = createKey(pwd, forge.util.hexToBytes(salt))

// // decrypt some bytes using CBC mode
// // (other modes include: CFB, OFB, CTR, and GCM)
// var decipher = forge.cipher.createDecipher('AES-CBC', key);
// decipher.start({iv: iv});
// decipher.update(forge.util.createBuffer(forge.util.hexToBytes(encrypted)));
// var result = decipher.finish(); // check 'result' for true/false

// if (!result || !decipher.output.toString()) {
//   console.log(decipher.output.toString());
//   throw new Error('Unable to decode, something went wrong')
// }
