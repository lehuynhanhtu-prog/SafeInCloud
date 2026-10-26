import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
import {decryptDatabase,inspectDatabase,parseDatabase,importDatabase} from '../dist/safe-db.js';
import {inflateLegacy} from '../dist/safe-inflate.js';
import {deflateSync} from 'node:zlib';
import {encryptLegacy,xml,password} from './safe-db-fixture.mjs';
import {derive,seal,open} from '../dist/crypto.js';

test('shared native/web legacy fixture: canonical fields, grouped notes, labels, templates and deleted records',async()=>{
 const fixture=JSON.parse(await readFile(new URL('../android/app/src/test/resources/legacy-db.json',import.meta.url)));
 const result=await importDatabase(Buffer.from(fixture.base64,'base64'),fixture.password,DOMParser);
 assert.equal(result.items.length,1);assert.equal(result.templates,1);assert.equal(result.deleted,1);assert.equal(result.labels,2);
 const item=result.items[0];assert.equal(item.title,'Ví dụ & Unicode');assert.equal(item.category,'WEB');
 assert.equal(item.fields.Login,'demo@example.invalid');assert.equal(item.fields.Password,'synthetic-only');assert.equal(item.fields.URL,'https://example.invalid');
 assert.equal(item.fields.PIN,'1234');assert.equal(item.fields.Label,'Email, Cá nhân');
 assert.equal(item.fields.Note,'PIN: second value\n__proto__: retained\nOTP: SYNTHETICOTP\nline 1\nline 2 & ghi chú');
 assert.deepEqual(Object.keys(item.fields),['Login','Password','URL','PIN','Label','Note']);
 assert.deepEqual(item.fieldTypes,{Login:'text',Password:'password',URL:'text',PIN:'password',Label:'text',Note:'text'});
 assert.equal(item.fields['Lịch sử · Mật khẩu'],undefined);assert.equal(result.skippedHistory,1);assert.equal(item.source.fields[0].name,'Tài khoản');
 assert.equal(item.source.fields[0].history,undefined);
 const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive('destination-password',salt);
 const vault=await seal(result.items,key,salt);assert(!JSON.stringify(vault).includes('synthetic-only'));
 assert.deepEqual((await open(vault,'destination-password')).items,result.items);
});

test('correct password supports PKCS7 and legacy zero padding; wrong password rejected',async()=>{
 for(const zero of [false,true]){
  const data=encryptLegacy(xml,password,zero);assert.equal(await decryptDatabase(data,password),xml);
  await assert.rejects(decryptDatabase(data,'incorrect'),/Không giải mã được/);
 }
});

test('truncated, unsupported, damaged or oversized databases are rejected',async()=>{
 const data=encryptLegacy(xml);assert.throws(()=>inspectDatabase(data.subarray(0,30)));
 const unsupported=Buffer.from(data);unsupported[2]=99;assert.throws(()=>inspectDatabase(unsupported),/phiên bản 1/);
 const corrupt=Buffer.from(data);corrupt[corrupt.length-32]^=128;await assert.rejects(decryptDatabase(corrupt,password));
 assert.throws(()=>inspectDatabase(new Uint8Array(10*1024*1024+1)),/10 MB/);
 await assert.rejects(decryptDatabase(data,''),/nhập mật khẩu/);
});

test('reject XML entities, invalid roots and expansion bombs',()=>{
 assert.throws(()=>parseDatabase('<!DOCTYPE database [<!ENTITY test SYSTEM "file:///etc/passwd">]><database>&test;</database>',DOMParser));
 assert.throws(()=>parseDatabase('<wrong/>',DOMParser));
 assert.throws(()=>inflateLegacy(deflateSync('x'.repeat(100000)),500),/20 MB/);
 const z=deflateSync('checksum');z[z.length-1]^=1;assert.throws(()=>inflateLegacy(z,100));
});

test('imports readable attachments, preserves them in the encrypted vault and skips broken files',async()=>{
 const source='<database><card id="1" title="Có tệp"><file name="ghi-chu.txt">SGVsbG8gU2FmZQ==</file><file name="hong.bin">%%%broken%%%</file></card></database>';
 const result=parseDatabase(source,DOMParser);
 assert.equal(result.attachments,1);assert.equal(result.skippedAttachments,1);assert.equal(result.attachmentBytes,10);
 assert.deepEqual(result.items[0].attachments,[{name:'ghi-chu.txt',type:'text/plain',size:10,data:'SGVsbG8gU2FmZQ=='}]);
 const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive('destination-password',salt),vault=await seal(result.items,key,salt);
 assert(!JSON.stringify(vault).includes('SGVsbG8gU2FmZQ=='));
 assert.deepEqual((await open(vault,'destination-password')).items[0].attachments,result.items[0].attachments);
});

test('maps labels, email and Bank while standardizing fields and skipping history',()=>{
 const source='<database><label id="web" name="Web Logins"/><label id="mail" name="EMAIL"/><label id="app" name="Program"/><label id="card" name="Credit Cards"/><label id="bank" name="Bank"/>'+
  '<card title="By label"><field name="Mật khẩu" type="password" history="old">one</field><field name="Lịch sử: đăng nhập" type="text">should-skip</field><label_id>web</label_id></card>'+
  '<card title="By URL"><field name="Trang" type="website">https://example.invalid</field><label_id>app</label_id></card>'+
  '<card title="By email"><field name="Tài khoản" type="login">mail@example.invalid</field><label_id>mail</label_id></card>'+
  '<card title="By app"><field name="Tài khoản" type="login">desktop-user</field><label_id>app</label_id></card>'+
  '<card title="By card"><label_id>card</label_id></card>'+
  '<card title="By bank"><field name="Số tài khoản" type="login">001122</field><field name="Chi nhánh" type="text">Hà Nội</field><label_id>bank</label_id></card>'+
  '<card title="Email inferred"><field name="User" type="login">auto@example.invalid</field><label_id>app</label_id></card>'+
  '<card><field name="Name" type="text">Fallback Name</field><field name="Unmapped" type="text">value</field></card></database>';
 const result=parseDatabase(source,DOMParser);
 assert.deepEqual(result.items.map(x=>x.category),['WEB','WEB','Email','APP','Thẻ tín dụng','Bank','Email','APP']);
 assert.equal(result.items[0].fields.Label,'Web Logins');assert.equal(result.items[0].fields['Lịch sử · Mật khẩu'],undefined);
 assert.equal(result.items[0].fields['Lịch sử: đăng nhập'],undefined);assert.equal(result.items[0].source.fields[0].history,undefined);
 assert.equal(result.items[5].fields.Account,'001122');assert.equal(result.items[5].fields.Label,'Bank');assert.equal(result.items[5].fields.Note,'Chi nhánh: Hà Nội');
 assert.equal(result.items[6].fields.Label,'Program, Email');
 assert.equal(result.items[7].title,'Fallback Name');assert.equal(result.items[7].fields.Note,'Unmapped: value');
 assert.equal(result.skippedHistory,2);
});

test('large synthetic legacy database imports every active card',async()=>{
 const big='<database>'+Array.from({length:2000},(_,i)=>`<card id="${i}" title="Synthetic ${i}"><field type="text" name="Custom">${i}</field></card>`).join('')+'</database>';
 const result=await importDatabase(encryptLegacy(big),password,DOMParser);assert.equal(result.items.length,2000);assert.equal(result.items[1999].fields.Note,'Custom: 1999');
});
