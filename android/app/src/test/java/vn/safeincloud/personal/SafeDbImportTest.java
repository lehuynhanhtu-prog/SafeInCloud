package vn.safeincloud.personal;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Arrays;

public class SafeDbImportTest {
 private JSONObject fixture()throws Exception{try(InputStream in=getClass().getResourceAsStream("/legacy-db.json")){return new JSONObject(new String(in.readAllBytes(),StandardCharsets.UTF_8));}}
 @Test public void importsSharedBrowserFixtureAndNormalizesFields()throws Exception{
  JSONObject f=fixture();byte[] data=Base64.getDecoder().decode(f.getString("base64"));char[] pw=f.getString("password").toCharArray();
  SafeDbImport.Result r;try{r=SafeDbImport.read(data,pw);}finally{Arrays.fill(pw,'\0');}
  assertEquals(1,r.items.length());assertEquals(1,r.templates);assertEquals(1,r.deleted);assertEquals(2,r.labels);
  JSONObject item=r.items.getJSONObject(0),fields=item.getJSONObject("fields");assertEquals("Ví dụ & Unicode",item.getString("title"));assertEquals("WEB",item.getString("category"));
  assertEquals("demo@example.invalid",fields.getString("Login"));assertEquals("synthetic-only",fields.getString("Password"));assertEquals("1234",fields.getString("PIN"));assertEquals("Email, Cá nhân",fields.getString("Label"));assertEquals("PIN: second value\n__proto__: retained\nOTP: SYNTHETICOTP\nline 1\nline 2 & ghi chú",fields.getString("Note"));assertEquals(6,fields.length());assertEquals(1,r.skippedHistory);assertEquals("password",item.getJSONObject("fieldTypes").getString("PIN"));
  VaultCrypto.Session session=VaultCrypto.create("destination-password".toCharArray());String vault=VaultCrypto.seal(session,r.items);assertFalse(vault.contains("synthetic-only"));assertEquals(1,VaultCrypto.open(vault,"destination-password".toCharArray()).items.length());session.destroy();
 }
 @Test public void rejectsWrongPasswordDamageAndUnsupportedVersions()throws Exception{
  JSONObject f=fixture();byte[] data=Base64.getDecoder().decode(f.getString("base64"));char[] pw=f.getString("password").toCharArray();
  assertThrows(Exception.class,()->SafeDbImport.read(data,"wrong".toCharArray()));
  byte[] bad=data.clone();bad[bad.length-32]^=128;assertThrows(Exception.class,()->SafeDbImport.read(bad,pw));
  byte[] version=data.clone();version[2]=99;assertThrows(Exception.class,()->SafeDbImport.read(version,pw));
  assertThrows(Exception.class,()->SafeDbImport.read(Arrays.copyOf(data,20),pw));Arrays.fill(pw,'\0');
 }
 @Test public void restoresAttachmentsSkipsBrokenFilesAndRejectsUnsafeXml()throws Exception{
  assertThrows(Exception.class,()->SafeDbImport.parse("<!DOCTYPE database [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><database>&x;</database>"));
  SafeDbImport.Result r=SafeDbImport.parse("<database><card title='Files'><file name='note.txt'>SGVsbG8gU2FmZQ==</file><file name='broken.bin'>%%%bad%%%</file></card></database>");assertEquals(1,r.attachments);assertEquals(1,r.skippedAttachments);assertEquals(10,r.attachmentBytes);JSONObject file=r.items.getJSONObject(0).getJSONArray("attachments").getJSONObject(0);assertEquals("note.txt",file.getString("name"));assertEquals("text/plain",file.getString("type"));assertEquals(10,file.getInt("size"));
  assertThrows(Exception.class,()->SafeDbImport.parse("<wrong/>"));assertThrows(Exception.class,()->SafeDbImport.parse("<database><card></database>"));
 }
 @Test public void mapsEmailBankAccountAndUnknownFields()throws Exception{
  String xml="<database><label id='b' name='Bank'/><label id='a' name='Program'/><card title='Bank'><field name='Số tài khoản' type='login'>001122</field><field name='Chi nhánh'>Hà Nội</field><label_id>b</label_id></card><card><field name='Name'>Mail</field><field name='User' type='login'>mail@example.invalid</field><label_id>a</label_id></card></database>";
  SafeDbImport.Result r=SafeDbImport.parse(xml);JSONObject bank=r.items.getJSONObject(0),mail=r.items.getJSONObject(1);assertEquals("Bank",bank.getString("category"));assertEquals("001122",bank.getJSONObject("fields").getString("Account"));assertEquals("Chi nhánh: Hà Nội",bank.getJSONObject("fields").getString("Note"));assertEquals("Mail",mail.getString("title"));assertEquals("Email",mail.getString("category"));assertEquals("Program, Email",mail.getJSONObject("fields").getString("Label"));
 }
}
