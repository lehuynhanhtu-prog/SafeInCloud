import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('desktop and mobile keep import, downloads, backup and restore inside settings',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const workspace=html.slice(html.indexOf('<div id="workspace"'),html.indexOf('<dialog id="settings"'));
 const settings=html.slice(html.indexOf('<dialog id="settings"'),html.indexOf('<dialog id="new-vault"'));
 const toolbar=workspace.slice(workspace.indexOf('<div class="toolbar">'),workspace.indexOf('<div class="summary">'));
 assert(!/id="(?:import-db|import|backup|restore|sync)"/.test(toolbar));
 for(const id of ['import-db','import','backup','restore','sync','clear-all'])assert(settings.includes(`id="${id}"`),id);
 assert(settings.includes('chuẩn hóa Name, Login, Password, PIN, URL, Note, Label'));
 assert(settings.includes('href="downloads.html"'));
 assert(html.includes('<option>Bank</option>'));assert(html.includes('Thêm trường text hoặc mật khẩu'));
 const mobile=await readFile(new URL('../dist/mobile.js',import.meta.url),'utf8');
 assert(mobile.includes("['Cài đặt','settings','⚙']"));assert(!mobile.includes('mobile-data'));
 const css=await readFile(new URL('../dist/style.css',import.meta.url),'utf8');
 assert(css.includes('.settings-grid'));assert(css.includes('@media(max-width:650px)'));
});
