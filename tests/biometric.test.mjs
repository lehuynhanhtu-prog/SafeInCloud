import {test} from 'node:test';
import assert from 'node:assert/strict';
import {b64} from '../dist/crypto.js';
import {wrapPassword,unwrapPassword,unlock} from '../dist/biometric.js';
test('PRF encryption protects password, binds vault, rejects tampering and missing support',async()=>{
 const secret=crypto.getRandomValues(new Uint8Array(32)),salt=b64(crypto.getRandomValues(new Uint8Array(16)));
 const record={version:1,vaultSalt:salt,id:b64(new Uint8Array([1,2])),prfSalt:b64(secret),...await wrapPassword('synthetic-test-password',secret,salt)};
 assert(!JSON.stringify(record).includes('synthetic-test-password'));
 assert.equal(await unwrapPassword(record,secret,salt),'synthetic-test-password');
 await assert.rejects(unwrapPassword(record,crypto.getRandomValues(new Uint8Array(32)),salt));
 await assert.rejects(unwrapPassword(record,secret,b64(new Uint8Array(16))));
 await assert.rejects(unwrapPassword({...record,data:b64(new Uint8Array(32))},secret,salt));
 await assert.rejects(wrapPassword('test',undefined,salt));
 assert.notEqual((await wrapPassword('test',secret,salt)).iv,record.iv);
});
test('unlock requires matching credential, user verification, challenge and PRF',async()=>{
 const salt=b64(crypto.getRandomValues(new Uint8Array(16))),secret=crypto.getRandomValues(new Uint8Array(32));
 const record={version:1,vaultSalt:salt,id:b64(new Uint8Array([1])),prfSalt:b64(secret),...await wrapPassword('synthetic-test-password',secret,salt)};
 const previousNavigator=globalThis.navigator,previousLocation=globalThis.location;
 let verified=true,validChallenge=true,prf=true;
 Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'https://example.test'}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{credentials:{get:async({publicKey})=>{
  assert.equal(publicKey.userVerification,'required');
  const challenge=b64(publicKey.challenge).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return {rawId:new Uint8Array([1]),response:{clientDataJSON:new TextEncoder().encode(JSON.stringify({type:'webauthn.get',origin:location.origin,challenge:validChallenge?challenge:'bad'})),authenticatorData:Uint8Array.from({length:37},(_,i)=>i===32&&verified?5:0)},getClientExtensionResults:()=>prf?{prf:{results:{first:secret}}}:{}};
 }}}});
 try{assert.equal(await unlock(record,salt),'synthetic-test-password');verified=false;await assert.rejects(unlock(record,salt));verified=true;validChallenge=false;await assert.rejects(unlock(record,salt));validChallenge=true;prf=false;await assert.rejects(unlock(record,salt));}
 finally{Object.defineProperty(globalThis,'navigator',{configurable:true,value:previousNavigator});Object.defineProperty(globalThis,'location',{configurable:true,value:previousLocation});}
});
