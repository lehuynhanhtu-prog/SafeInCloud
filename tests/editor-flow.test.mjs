import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {derive,seal,open} from '../dist/crypto.js';
import {liveItems} from '../dist/sync.js';

test('custom fields retain explicit text/password types and settings can clear every item',async()=>{
 class Element{
  constructor(tag='div'){this.value='';this.hidden=false;this.required=false;this.disabled=false;this.children=[];this.open=false;this.dataset={};this.type='text';this.tagName=tag.toUpperCase();this.events={};this.className='';}
  get lastChild(){return this.children.at(-1)}
  replaceChildren(...items){this.children=items} append(...items){this.children.push(...items)}
  setAttribute(){} focus(){} click(){} remove(){}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn)}
  showModal(){this.open=true} close(){if(!this.open)return;this.open=false;this.onclose?.();for(const fn of this.events.close||[])fn()}
 }
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new Element()]));
 elements.workspace.hidden=true;
 const storage=new Map(),store='safeincloud.vault.v1',password='synthetic-editor-password',salt=crypto.getRandomValues(new Uint8Array(16));
 storage.set(store,JSON.stringify(await seal([{id:'old',title:'Old',category:'APP',fields:{Login:'old'}}],await derive(password,salt),salt)));
 globalThis.document={getElementById:id=>{assert(elements[id],id);return elements[id]},querySelectorAll:selector=>selector==='dialog[open]'?Object.values(elements).filter(e=>e.open):[],addEventListener(){},createElement:tag=>new Element(tag)};
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 globalThis.window={addEventListener(){},dispatchEvent(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,fn)=>fn()}}});
 const nativeInterval=setInterval,nativeTimeout=setTimeout;globalThis.setInterval=()=>0;globalThis.setTimeout=()=>0;
 const wait=async predicate=>{for(let i=0;i<500;i++){if(await predicate())return;await new Promise(resolve=>nativeTimeout(resolve,5))}throw Error('Timed out')};
 try{
  await import('../dist/app.js');
  elements.master.value=password;elements['unlock-form'].onsubmit({preventDefault(){}});await wait(()=>!elements.workspace.hidden);
  elements.add.onclick();assert(elements.editor.open);
  elements.title.value='Custom';elements.category.value='Bank';elements.category.onchange();
  assert([...elements.fields.children].some(row=>row.children[0].value==='Account'));
  elements['add-field'].onclick();const custom=elements.fields.lastChild;custom.children[0].value='Secret answer';custom.children[1].value='password';custom.children[1].onchange();custom.children[2].value='synthetic-secret';
  const beforeSave=storage.get(store);elements['edit-form'].onsubmit({preventDefault(){}});await wait(()=>storage.get(store)!==beforeSave);
  let saved=await open(JSON.parse(storage.get(store)),password),record=saved.items.find(item=>item.title==='Custom');
  assert(record);assert.equal(record.category,'Bank');assert.equal(record.fields.Account,'');assert.equal(record.fields['Secret answer'],'synthetic-secret');assert.equal(record.fieldTypes['Secret answer'],'password');
  elements['workspace-settings'].onclick();assert(elements.settings.open);elements['clear-all'].onclick();await wait(()=>elements.confirm.open);assert.equal(elements.settings.open,false);
  const beforeClear=storage.get(store);elements['confirm-yes'].onclick();await wait(()=>storage.get(store)!==beforeClear);
  saved=await open(JSON.parse(storage.get(store)),password);assert.deepEqual(liveItems(saved.items),[]);assert(saved.items.every(item=>item.deletedAt));assert.match(elements.toast.textContent,/xóa toàn bộ dữ liệu/i);
 }finally{globalThis.setInterval=nativeInterval;globalThis.setTimeout=nativeTimeout}
});
