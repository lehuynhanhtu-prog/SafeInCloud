// Synthetic data only. Never use a real vault as a test fixture.
import {randomBytes,pbkdf2Sync,createCipheriv} from 'node:crypto';
import {deflateSync} from 'node:zlib';
export const password='Kiểm-thử-DB-123!';
export const xml=`<?xml version="1.0" encoding="UTF-8"?><database>
<label id="1" name="Email"/><label id="2" name="Cá nhân"/>
<card id="101" title="Ví dụ &amp; Unicode" star="true"><field name="Tài khoản" type="login">demo@example.invalid</field><field name="Mật khẩu" type="password" history="old-synthetic">synthetic-only</field><field name="Website" type="website">https://example.invalid</field><field name="PIN" type="pin">1234</field><field name="PIN" type="text">second value</field><field name="__proto__" type="text">retained</field><field name="OTP" type="otp">SYNTHETICOTP</field><notes>line 1\nline 2 &amp; ghi chú</notes><label_id>1</label_id><label_id>2</label_id></card>
<card id="102" title="Mẫu" template="true"><field name="Password" type="password"/></card>
<card id="103" title="Đã xóa" deleted="true"/><ghost id="104"/>
</database>`;
export function encryptLegacy(xmlText,pass=password,zeroPadding=false){
 const salt=randomBytes(64),iv=randomBytes(16),innerIV=randomBytes(16),innerKey=randomBytes(32),key=pbkdf2Sync(pass,salt,10000,32,'sha1');
 const array=b=>Buffer.concat([Buffer.from([b.length]),b]);
 const encrypt=(data,k,v)=>{const c=createCipheriv('aes-256-cbc',k,v);if(zeroPadding){c.setAutoPadding(false);data=Buffer.concat([data,Buffer.alloc(16-data.length%16)]);}return Buffer.concat([c.update(data),c.final()]);};
 const header=encrypt(Buffer.concat([array(innerIV),array(innerKey),array(Buffer.alloc(0))]),key,iv);
 return Buffer.concat([Buffer.from([5,5,1]),array(salt),array(iv),array(Buffer.alloc(0)),array(header),encrypt(deflateSync(xmlText),innerKey,innerIV)]);
}
