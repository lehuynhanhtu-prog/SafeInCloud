import {classifyImportedItem} from './category.js';

// SafeInCloud legacy DB v1 import only. The destination remains our AES-GCM .vault.
// Format reference: mxschmitt/golang-safe-in-cloud (MIT), decrypt.go.
const MAX_FILE=10*1024*1024, MAX_XML=20*1024*1024;
const MAX_ATTACHMENT=4*1024*1024, MAX_ATTACHMENTS=6*1024*1024;
const BAD_PASSWORD='Không giải mã được. Mật khẩu không đúng hoặc file bị hỏng.';
const bytes=value=>value instanceof Uint8Array?value:new Uint8Array(value);
function reader(data,start=0){
 let offset=start;
 return {array(){if(offset>=data.length)throw Error('File .db bị thiếu dữ liệu.');const n=data[offset++];if(offset+n>data.length)throw Error('File .db bị thiếu dữ liệu.');const out=data.slice(offset,offset+n);offset+=n;return out;},rest(){return data.slice(offset);}};
}
export function inspectDatabase(value){
 const data=bytes(value);
 if(data.length>MAX_FILE)throw Error('File vượt quá 10 MB.');
 if(data.length<4||data[0]!==5||data[1]!==5||data[2]!==1)throw Error('Chỉ hỗ trợ file SafeInCloud .db định dạng cũ, phiên bản 1.');
 const r=reader(data,3),salt=r.array(),iv=r.array();r.array();const header=r.array(),body=r.rest();
 if(!salt.length||iv.length!==16||!header.length||header.length%16||!body.length||body.length%16)throw Error('Cấu trúc file .db không hợp lệ.');
 return {salt,iv,header,body};
}
async function rawCBC(keyBytes,iv,data){
 // WebCrypto removes PKCS#7; append a valid final padding block to also read
 // legacy files whose existing padding is zero/random rather than PKCS#7.
 const key=await crypto.subtle.importKey('raw',keyBytes,'AES-CBC',false,['encrypt','decrypt']);
 const tail=new Uint8Array(await crypto.subtle.encrypt({name:'AES-CBC',iv:data.slice(-16)},key,new Uint8Array()));
 const joined=new Uint8Array(data.length+16);joined.set(data);joined.set(tail,data.length);
 try{return new Uint8Array(await crypto.subtle.decrypt({name:'AES-CBC',iv},key,joined));}finally{joined.fill(0);}
}
export async function decryptDatabase(value,password){
 const {salt,iv,header,body}=inspectDatabase(value);
 if(!password.length)throw Error('Hãy nhập mật khẩu của file .db.');
 let key,inner,innerKey,compressed;
 try{
  const encoded=new TextEncoder().encode(password);
  let base;try{base=await crypto.subtle.importKey('raw',encoded,'PBKDF2',false,['deriveBits']);}finally{encoded.fill(0);}
  key=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:10000,hash:'SHA-1'},base,256));
  inner=await rawCBC(key,iv,header);
  const r=reader(inner),innerIV=r.array();innerKey=r.array();r.array();
  if(innerIV.length!==16||innerKey.length!==32)throw Error(BAD_PASSWORD);
  compressed=await rawCBC(innerKey,innerIV,body);
  // Feed only the zlib stream. Legacy padding can be arbitrary, so a streaming
  // inflater stops at its checksum rather than treating padding as another stream.
  const {inflateLegacy}=await import('./safe-inflate.js');
  const plain=inflateLegacy(compressed,MAX_XML);
  try{return new TextDecoder('utf-8',{fatal:true}).decode(plain);}finally{plain.fill(0);}
 }catch(e){if(e.message==='Dữ liệu giải nén vượt quá 20 MB.')throw e;throw Error(BAD_PASSWORD);}
 finally{key?.fill(0);inner?.fill(0);innerKey?.fill(0);compressed?.fill(0);}
}
const truth=s=>/^(true|1)$/i.test(s||'');
const direct=(node,name)=>Array.from(node.childNodes||[]).filter(n=>n.nodeType===1&&n.nodeName===name);
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const isHistory=s=>{const value=normalize(s);return value.includes('lich su')||value.includes('history');};
const isEmail=s=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s||'').trim());
const isBank=tags=>tags.some(tag=>/\b(bank|banking|ngan hang)\b/.test(normalize(tag)));
function standardField(type,name,bank){
 const t=normalize(type),n=normalize(name);
 if(bank&&/^(account|account number|bank account|so tai khoan|tai khoan|tai khoan ngan hang)$/.test(n))return 'Account';
 if(t==='login')return 'Login';
 if(t==='password')return 'Password';
 if(t==='website'||t==='url')return 'URL';
 if(t==='pin')return 'PIN';
 if(t==='notes'||t==='note')return 'Note';
 if(/^(name|title|ten|ten muc)$/.test(n))return 'Name';
 if(/^(login|username|user name|ten dang nhap|email|e-mail)$/.test(n))return 'Login';
 if(/^(password|pass|mat khau)$/.test(n))return 'Password';
 if(/^pin(?: code| number)?$/.test(n))return 'PIN';
 if(/^(url|website|web site|trang web|dia chi web)$/.test(n))return 'URL';
 if(/^(note|notes|ghi chu)$/.test(n))return 'Note';
 if(/^(label|labels|nhan)$/.test(n))return 'Label';
 return null;
}
function uniqueLabels(values){const seen=new Set();return values.flatMap(value=>String(value||'').split(/[,;]+/)).map(x=>x.trim()).filter(x=>{const key=normalize(x);if(!key||seen.has(key))return false;seen.add(key);return true;});}
function put(fields,name,value){let n=name||'Trường',i=2;while(Object.hasOwn(fields,n))n=`${name} (${i++})`;Object.defineProperty(fields,n,{value,enumerable:true});}
const MIME={txt:'text/plain',csv:'text/csv',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',zip:'application/zip'};
function attachment(node,remaining){
 const name=(node.getAttribute('name')||'Tệp đính kèm').replace(/[\u0000-\u001f]/g,'').slice(0,255)||'Tệp đính kèm';
 let data=(node.textContent||'').replace(/\s/g,'');
 if(data.length%4===1||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw Error('base64');
 data+= '='.repeat((4-data.length%4)%4);
 let size;try{size=atob(data).length}catch{throw Error('base64')}
 if(size>MAX_ATTACHMENT||size>remaining)throw Error('size');
 const ext=name.includes('.')?name.split('.').pop().toLowerCase():'';
 const declared=node.getAttribute('type')||node.getAttribute('mime')||'';
 const type=/^[\w.+-]+\/[\w.+-]+$/.test(declared)?declared:(MIME[ext]||'application/octet-stream');
 return {name,type,size,data};
}
export function parseDatabase(xml,Parser=globalThis.DOMParser){
 if(new TextEncoder().encode(xml).length>MAX_XML)throw Error('Dữ liệu giải nén vượt quá 20 MB.');
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('File chứa khai báo XML không được hỗ trợ.');
 const doc=new Parser().parseFromString(xml,'application/xml');
 if(doc.getElementsByTagName('parsererror').length||doc.documentElement?.nodeName!=='database')throw Error('Nội dung .db không phải kho SafeInCloud hợp lệ.');
 const root=doc.documentElement,labels=new Map(direct(root,'label').map(l=>[l.getAttribute('id'),l.getAttribute('name')||'']));
 const items=[];let templates=0,deleted=0,attachments=0,skippedAttachments=0,attachmentBytes=0,skippedHistory=0;
 for(const card of direct(root,'card')){
  if(truth(card.getAttribute('template'))){templates++;continue;}
  if(truth(card.getAttribute('deleted'))){deleted++;continue;}
  if(items.length>=20000)throw Error('Kho vượt quá 20.000 mục.');
  const fieldNodes=direct(card,'field');
  let tags=direct(card,'label_id').map(n=>labels.get(n.textContent.trim())||n.textContent.trim());
  tags.push(...fieldNodes.filter(f=>standardField(f.getAttribute('type')||'',f.getAttribute('name')||'',false)==='Label').map(f=>f.textContent||''));
  const bank=isBank(tags),fields={},originalFields=[],noteParts=[];
  let title=(card.getAttribute('title')||'').trim();
  for(const f of fieldNodes){
   const type=f.getAttribute('type')||'',original=f.getAttribute('name')||'Trường',value=f.textContent||'';
   if(isHistory(original)){skippedHistory++;continue;}
   const canonical=standardField(type,original,bank);
   if(canonical==='Name'){if(!title)title=value.trim();else if(value.trim()&&value.trim()!==title)noteParts.push(`${original}: ${value}`);}
   else if(canonical==='Note')noteParts.push(value);
   else if(canonical==='Label')tags.push(value);
   else if(canonical&&!Object.hasOwn(fields,canonical))put(fields,canonical,value);
   else if(value)noteParts.push(`${original}: ${value}`);
   const attrs=Object.fromEntries(Array.from(f.attributes).map(a=>[a.name,a.value]));
   if(Object.hasOwn(attrs,'history')){if(attrs.history)skippedHistory++;delete attrs.history;}
   originalFields.push(attrs);
  }
  const notes=direct(card,'notes').map(n=>n.textContent||'').filter(Boolean);noteParts.push(...notes);
  tags=uniqueLabels(tags);if(isEmail(fields.Login)&&!tags.some(tag=>normalize(tag)==='email'))tags.push('Email');
  if(tags.length)put(fields,'Label',tags.join(', '));
  if(bank&&!Object.hasOwn(fields,'Account'))put(fields,'Account','');
  const note=noteParts.filter(Boolean).join('\n');if(note)put(fields,'Note',note);
  const files=[];
  for(const f of direct(card,'file'))try{const parsed=attachment(f,MAX_ATTACHMENTS-attachmentBytes);files.push(parsed);attachmentBytes+=parsed.size;attachments++;}catch{skippedAttachments++;}
  const category=classifyImportedItem({tags,url:fields.URL,login:fields.Login});
  const item={id:crypto.randomUUID(),title:title||'Chưa đặt tên',category,fields,fieldTypes:Object.fromEntries(Object.keys(fields).map(name=>[name,/^(Password|PIN)$/i.test(name)?'password':'text'])),updatedAt:new Date().toISOString(),source:{format:'SafeInCloud-db-v1',attributes:Object.fromEntries(Array.from(card.attributes).map(a=>[a.name,a.value])),fields:originalFields}};
  if(files.length)item.attachments=files;
  items.push(item);
 }
 return {items,templates,deleted,labels:labels.size,attachments,skippedAttachments,attachmentBytes,skippedHistory};
}
export async function importDatabase(value,password,Parser){return parseDatabase(await decryptDatabase(value,password),Parser);}
