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
 const items=[];let templates=0,deleted=0,attachments=0,skippedAttachments=0,attachmentBytes=0;
 for(const card of direct(root,'card')){
  if(truth(card.getAttribute('template'))){templates++;continue;}
  if(truth(card.getAttribute('deleted'))){deleted++;continue;}
  if(items.length>=20000)throw Error('Kho vượt quá 20.000 mục.');
  const fields={},originalFields=[];
  for(const f of direct(card,'field')){
   const type=f.getAttribute('type')||'',original=f.getAttribute('name')||'Trường';
   const names={login:'Login',password:'Password',website:'URL',otp:'OTP',totp:'OTP',notes:'Notes'};const canonical=Object.hasOwn(names,type)?names[type]:null;
   put(fields,canonical&&!Object.hasOwn(fields,canonical)?canonical:original,f.textContent||'');
   const attrs=Object.fromEntries(Array.from(f.attributes).map(a=>[a.name,a.value]));originalFields.push(attrs);
   if(f.getAttribute('history'))put(fields,`Lịch sử · ${original}`,f.getAttribute('history'));
  }
  const notes=direct(card,'notes').map(n=>n.textContent||'').join('\n');if(notes)put(fields,'Notes',notes);
  const tags=direct(card,'label_id').map(n=>labels.get(n.textContent.trim())||n.textContent.trim());if(tags.length)put(fields,'Nhãn',tags.join(', '));
  const files=[];
  for(const f of direct(card,'file'))try{const parsed=attachment(f,MAX_ATTACHMENTS-attachmentBytes);files.push(parsed);attachmentBytes+=parsed.size;attachments++;}catch{skippedAttachments++;}
  const hint=tags.join(' ').toLowerCase();let category='WEB';
  if(/credit|thẻ tín dụng/.test(hint))category='Thẻ tín dụng';else if(/email|e-mail/.test(hint))category='Email';else if(/khóa cửa/.test(hint))category='Khóa cửa';else if(/ứng dụng|application/.test(hint))category='APP';
  const item={id:crypto.randomUUID(),title:card.getAttribute('title')||'Chưa đặt tên',category,fields,updatedAt:new Date().toISOString(),source:{format:'SafeInCloud-db-v1',attributes:Object.fromEntries(Array.from(card.attributes).map(a=>[a.name,a.value])),fields:originalFields}};
  if(files.length)item.attachments=files;
  items.push(item);
 }
 return {items,templates,deleted,labels:labels.size,attachments,skippedAttachments,attachmentBytes};
}
export async function importDatabase(value,password,Parser){return parseDatabase(await decryptDatabase(value,password),Parser);}
