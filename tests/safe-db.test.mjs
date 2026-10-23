import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
import {decryptDatabase,inspectDatabase,parseDatabase,importDatabase} from '../dist/safe-db.js';
import {inflateLegacy} from '../dist/safe-inflate.js';
import {deflateSync} from 'node:zlib';
import {encryptLegacy,xml,password} from './safe-db-fixture.mjs';
import {derive,seal,open} from '../dist/crypto.js';

test('shared native/web legacy fixture: Unicode password, custom fields, labels, notes, templates and deleted records',async()=>{
 const fixture=JSON.parse(await readFile(new URL('../android/app/src/test/resources/legacy-db.json',import.meta.url)));
 const result=await importDatabase(Buffer.from(fixture.base64,'base64'),fixture.password,DOMParser);
 assert.equal(result.items.length,1);assert.equal(result.templates,1);assert.equal(result.deleted,1);assert.equal(result.labels,2);
 const item=result.items[0];assert.equal(item.title,'Ví dụ & Unicode');assert.equal(item.category,'Email');
 assert.equal(item.fields.Login,'demo@example.invalid');assert.equal(item.fields.Password,'synthetic-only');assert.equal(item.fields.URL,'https://example.invalid');
 assert.equal(item.fields.PIN,'1234');assert.equal(item.fields['PIN (2)'],'second value');assert.equal(item.fields.__proto__,'retained');
 assert.equal(item.fields.OTP,'SYNTHETICOTP');assert.equal(item.fields.Notes,'line 1\nline 2 & ghi chú');assert.equal(item.fields['Nhãn'],'Email, Cá nhân');
 assert.equal(item.fields['Lịch sử · Mật khẩu'],'old-synthetic');assert.equal(item.source.fields[0].name,'Tài khoản');
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

test('reject XML entities, invalid roots, attachments and expansion bombs instead of partial import',()=>{
 assert.throws(()=>parseDatabase('<!DOCTYPE database [<!ENTITY test SYSTEM "file:///etc/passwd">]><database>&test;</database>',DOMParser));
 assert.throws(()=>parseDatabase('<wrong/>',DOMParser));
 assert.throws(()=>parseDatabase('<database><card><file name="example">FAKE</file></card></database>',DOMParser),/đính kèm/);
 assert.throws(()=>inflateLegacy(deflateSync('x'.repeat(100000)),500),/20 MB/);
 const z=deflateSync('checksum');z[z.length-1]^=1;assert.throws(()=>inflateLegacy(z,100));
});

test('large synthetic legacy database imports every active card',async()=>{
 const big='<database>'+Array.from({length:2000},(_,i)=>`<card id="${i}" title="Synthetic ${i}"><field type="text" name="Custom">${i}</field></card>`).join('')+'</database>';
 const result=await importDatabase(encryptLegacy(big),password,DOMParser);assert.equal(result.items.length,2000);assert.equal(result.items[1999].fields.Custom,'1999');
});
