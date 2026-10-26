import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('download center publishes matching Web, Android and Windows releases',async()=>{
 const html=await readFile(new URL('../dist/downloads.html',import.meta.url),'utf8');
 const css=await readFile(new URL('../dist/downloads.css',import.meta.url),'utf8');
 const project=await readFile(new URL('../windows/SafeinCloud.csproj',import.meta.url),'utf8');
 const launcher=await readFile(new URL('../windows/Program.cs',import.meta.url),'utf8');
 for(const text of ['Web 0.5.6','Android 1.3.2','Windows 0.5.6','SafeInCloud-Windows-x64.zip','SafeInCloud-Android.apk'])assert(html.includes(text),text);
 assert(html.includes('Dùng cùng email'));assert(html.includes('Mở ứng dụng Web'));
 assert(css.includes('@media(max-width:650px)'));assert(css.includes('.cards'));
 assert(project.includes('<Version>0.5.6</Version>'));assert(project.includes('<AssemblyName>SafeInCloud</AssemblyName>'));
 assert(launcher.includes('source=windows-portable'));assert(launcher.includes('v=0.5.6'));
});
