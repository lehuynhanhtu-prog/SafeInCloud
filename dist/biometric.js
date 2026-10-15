import {b64,bytes} from './crypto.js';
const enc=new TextEncoder(),dec=new TextDecoder();
const random=()=>crypto.getRandomValues(new Uint8Array(32));
export function validateBinding(record,salt){
 if(!record||record.version!==1||record.vaultSalt!==salt||typeof record.id!=='string'||bytes(record.id).length<1||bytes(record.prfSalt).length!==32||bytes(record.iv).length!==12||bytes(record.data).length>2048)throw Error('Thiết lập sinh trắc học không khớp kho. Hãy đăng nhập bằng mật khẩu và bật lại.');
 return record;
}
export async function available(){return !!(globalThis.PublicKeyCredential&&navigator.credentials&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());}
async function wrappingKey(output,salt){
 if(!output||output.byteLength!==32)throw Error('Thiết bị chưa hỗ trợ mã hóa bằng passkey (PRF). Hãy dùng mật khẩu chính.');
 const raw=await crypto.subtle.importKey('raw',output,'HKDF',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:bytes(salt),info:enc.encode('SafeInCloud biometric password wrapping v1')},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function wrapPassword(password,output,vaultSalt){
 const iv=crypto.getRandomValues(new Uint8Array(12)),key=await wrappingKey(output,vaultSalt);
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(vaultSalt)},key,enc.encode(password));
 return {iv:b64(iv),data:b64(new Uint8Array(data))};
}
export async function unwrapPassword(record,output,salt){
 validateBinding(record,salt);const key=await wrappingKey(output,salt);
 return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(record.iv),additionalData:enc.encode(salt)},key,bytes(record.data)));
}
function verifyAssertion(credential,challenge){
 const client=JSON.parse(dec.decode(credential.response.clientDataJSON));
 const expected=b64(challenge).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 if(client.type!=='webauthn.get'||client.origin!==location.origin||client.challenge!==expected||client.crossOrigin||!(new Uint8Array(credential.response.authenticatorData)[32]&4))throw Error('Không xác minh được passkey.');
}
async function evaluate(id,prfSalt){
 const challenge=random();const credential=await navigator.credentials.get({publicKey:{challenge,allowCredentials:[{type:'public-key',id:bytes(id)}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:bytes(prfSalt)}}}}});
 if(!credential||b64(new Uint8Array(credential.rawId))!==id)throw Error('Passkey không khớp.');
 verifyAssertion(credential,challenge);
 return credential.getClientExtensionResults().prf?.results?.first;
}
export async function enroll(password,vaultSalt){
 if(!await available())throw Error('Thiết bị hoặc trình duyệt chưa hỗ trợ sinh trắc học/passkey.');
 const prfSalt=b64(random());
 const credential=await navigator.credentials.create({publicKey:{challenge:random(),rp:{name:'SafeInCloud'},user:{id:random(),name:'Kho '+vaultSalt.slice(0,8),displayName:'SafeInCloud trên thiết bị'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'required',userVerification:'required'},timeout:60000,attestation:'none',extensions:{prf:{}}}});
 if(!credential?.getClientExtensionResults().prf?.enabled)throw Error('Passkey này chưa hỗ trợ PRF. Chưa bật mở khóa sinh trắc học; tiếp tục dùng mật khẩu.');
 const id=b64(new Uint8Array(credential.rawId));const output=await evaluate(id,prfSalt);
 return {version:1,vaultSalt,id,prfSalt,...await wrapPassword(password,output,vaultSalt)};
}
export async function unlock(record,salt){validateBinding(record,salt);return unwrapPassword(record,await evaluate(record.id,record.prfSalt),salt);}
