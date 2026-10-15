import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {derive,seal,open} from '../dist/crypto.js';

test('six failures prompt reset; cancel and Drive errors preserve vault; successful reset archives old ciphertext',async()=>{
 class Element{
  constructor(){this.value='';this.hidden=false;this.required=false;this.disabled=false;this.children=[];this.open=false;this.dataset={};this.type='password'}
  replaceChildren(...items){this.children=items} append(...items){this.children.push(...items)}
  setAttribute(){} addEventListener(){} showModal(){this.open=true} close(){this.open=false;this.onclose?.()}
 }
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new Element()]));
 elements.workspace.hidden=true;
 const storage=new Map();let uploads=0,uploadOK=false,selectCount=0;
 globalThis.document={getElementById:id=>{assert(elements[id],id);return elements[id]},querySelectorAll:selector=>selector==='dialog[open]'?Object.values(elements).filter(e=>e.open):[],addEventListener(){},createElement:()=>new Element()};
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 globalThis.window={addEventListener(){},google:{accounts:{oauth2:{initTokenClient:options=>({requestAccessToken:params=>{assert.equal(params.prompt,'select_account');selectCount++;options.callback({access_token:'synthetic-access-token',expires_in:3600})}})}}}};
 globalThis.google=window.google;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,fn)=>fn()}}});
 const nativeInterval=globalThis.setInterval,nativeTimeout=globalThis.setTimeout;
 globalThis.setInterval=()=>0;globalThis.setTimeout=()=>0;
 globalThis.fetch=async(url,options)=>{assert(url.includes('upload/drive/v3/files'));assert.equal(options.headers.Authorization,'Bearer synthetic-access-token');assert(!options.body.includes('new-synthetic-password'));uploads++;return {ok:uploadOK}};
 const store='safeincloud.vault.v1',salt=crypto.getRandomValues(new Uint8Array(16));
 const original=JSON.stringify(await seal([{id:'one',title:'old',fields:{Password:'synthetic'}}],await derive('old-synthetic-password',salt),salt));
 storage.set(store,original);
 const wait=async predicate=>{for(let i=0;i<1000;i++){if(predicate())return;await new Promise(r=>nativeTimeout(r,5))}throw Error('Timed out waiting for flow')};
 try{
  await import('../dist/app.js');
  assert.equal(elements['first-setup'].hidden,true);
  elements['workspace-settings'].onclick();assert.equal(elements.settings.open,false);
  for(let i=1;i<=6;i++){
   elements.master.value='wrong';elements['unlock-form'].onsubmit({preventDefault(){}});
   await wait(()=>JSON.parse(storage.get('safeincloud.failures.v1')||'{}').count===i);
   assert.equal(elements.confirm.open,i===6);
   if(i===6)elements['confirm-no'].onclick();
   await wait(()=>!elements.unlock.disabled);
   assert.equal(storage.get(store),original);
  }
  elements['new-vault-open'].onclick();assert(elements['new-vault'].open);
  assert(elements['new-vault-create'].disabled);assert.equal(uploads,0);
  elements['new-vault-google'].onclick();await wait(()=>!elements['new-vault-create'].disabled);assert.equal(selectCount,1);
  elements['new-password'].value='new-synthetic-password';elements['new-repeat'].value='new-synthetic-password';
  elements['new-vault-form'].onsubmit({preventDefault(){}});await wait(()=>uploads===1&&!elements['new-vault-create'].disabled);
  assert.equal(storage.get(store),original);assert.equal(elements.workspace.hidden,true);
  uploadOK=true;elements['new-vault-form'].onsubmit({preventDefault(){}});
  await wait(()=>storage.get(store)!==original);
  assert.equal(uploads,2);assert([...storage.keys()].some(k=>k.startsWith(store+'.previous.')&&storage.get(k)===original));
  assert.deepEqual((await open(JSON.parse(storage.get(store)),'new-synthetic-password')).items,[]);
  assert.equal(storage.has('safeincloud.failures.v1'),false);assert.equal(elements['new-password'].value,'');
  elements['workspace-settings'].onclick();assert.equal(elements.settings.open,true);
  elements.lock.onclick();assert.equal(elements.settings.open,false);
  elements['workspace-settings'].onclick();assert.equal(elements.settings.open,false);
 }finally{globalThis.setInterval=nativeInterval;globalThis.setTimeout=nativeTimeout;}
});
