import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
import {derive,seal,open} from '../dist/crypto.js';
import {encryptLegacy,password} from './safe-db-fixture.mjs';

test('DB UI prompts after selection; wrong password, cancellation and locking preserve vault; confirmed import is encrypted',async()=>{
 class Element{
  constructor(){this.value='';this.hidden=false;this.children=[];this.open=false;this.dataset={};this.events={};this.type='password';this.tagName='DIV';this.disabled=false;}
  replaceChildren(...items){this.children=items;}append(...items){this.children.push(...items);}setAttribute(){}focus(){}click(){}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn);}showModal(){this.open=true;}
  close(){if(!this.open)return;this.open=false;this.onclose?.();for(const fn of this.events.close||[])fn();}
 }
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new Element()]));
 elements.workspace.hidden=true;
 const storage=new Map(),store='safeincloud.vault.v1';
 const original=JSON.stringify(await seal([{id:'existing',title:'Existing',category:'WEB',fields:{Login:'existing'}}],await derive('destination-password',new Uint8Array(16)),new Uint8Array(16)));
 storage.set(store,original);
 globalThis.DOMParser=DOMParser;
 globalThis.document={getElementById:id=>elements[id],querySelectorAll:selector=>selector==='dialog[open]'?Object.values(elements).filter(e=>e.open):[],addEventListener(){},createElement:tag=>{const e=new Element();e.tagName=tag.toUpperCase();return e;}};
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 globalThis.window={addEventListener(){},dispatchEvent(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_,fn)=>fn()}}});
 const nativeInterval=setInterval,nativeTimeout=setTimeout;globalThis.setInterval=()=>0;globalThis.setTimeout=()=>0;
 const wait=async predicate=>{for(let i=0;i<500;i++){if(predicate())return;await new Promise(r=>nativeTimeout(r,5));}throw Error('Timed out');};
 const select=async data=>{elements['import-db'].onclick();elements.file.files=[{name:'synthetic.db',size:data.length,arrayBuffer:async()=>data.slice().buffer}];await elements.file.onchange();assert(elements['db-import'].open);};
 const submit=pass=>{elements['db-password'].value=pass;elements['db-import-form'].onsubmit({preventDefault(){}});assert.equal(elements['db-password'].value,'');};
 const unlock=async()=>{elements.master.value='destination-password';elements['unlock-form'].onsubmit({preventDefault(){}});await wait(()=>!elements.workspace.hidden);};
 try{
  await import('../dist/app.js');await unlock();
  const fixture=new Uint8Array(encryptLegacy('<database><card id="1" title="Imported"><field name="Password" type="password">synthetic-only</field></card></database>'));
  await select(fixture);assert.equal(storage.get(store),original);submit('wrong');await wait(()=>!elements['db-decrypt'].disabled);assert.match(elements['db-status'].textContent,/Không giải mã được/);assert.equal(storage.get(store),original);
  submit(password);await wait(()=>elements.confirm.open);elements['confirm-no'].onclick();await wait(()=>!elements.confirm.open);assert.equal(storage.get(store),original);
  await select(fixture);submit(password);elements.lock.onclick();await new Promise(r=>nativeTimeout(r,50));assert.equal(elements.confirm.open,false);assert.equal(storage.get(store),original);assert.equal(elements['db-import'].open,false);
  await unlock();await select(fixture);submit(password);await wait(()=>elements.confirm.open);elements['confirm-yes'].onclick();await wait(()=>storage.get(store)!==original);
  const saved=storage.get(store);assert(!saved.includes('synthetic-only'));const result=await open(JSON.parse(saved),'destination-password');assert.equal(result.items.length,2);assert.equal(result.items[0].id,'existing');assert.equal(result.items[1].fields.Password,'synthetic-only');
 }finally{globalThis.setInterval=nativeInterval;globalThis.setTimeout=nativeTimeout;}
});
