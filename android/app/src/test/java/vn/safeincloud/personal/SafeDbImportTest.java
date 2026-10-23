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
 @Test public void importsSharedBrowserFixtureAndKeepsCustomFields()throws Exception{
  JSONObject f=fixture();byte[] data=Base64.getDecoder().decode(f.getString("base64"));char[] pw=f.getString("password").toCharArray();
  SafeDbImport.Result r;try{r=SafeDbImport.read(data,pw);}finally{Arrays.fill(pw,'\0');}
  assertEquals(1,r.items.length());assertEquals(1,r.templates);assertEquals(1,r.deleted);assertEquals(2,r.labels);
  JSONObject item=r.items.getJSONObject(0),fields=item.getJSONObject("fields");assertEquals("Ví dụ & Unicode",item.getString("title"));assertEquals("Email",item.getString("category"));
  assertEquals("demo@example.invalid",fields.getString("Login"));assertEquals("synthetic-only",fields.getString("Password"));assertEquals("1234",fields.getString("PIN"));assertEquals("second value",fields.getString("PIN (2)"));assertEquals("retained",fields.getString("__proto__"));assertEquals("SYNTHETICOTP",fields.getString("OTP"));assertEquals("Email, Cá nhân",fields.getString("Nhãn"));assertEquals("line 1\nline 2 & ghi chú",fields.getString("Notes"));
  VaultCrypto.Session session=VaultCrypto.create("destination-password".toCharArray());String vault=VaultCrypto.seal(session,r.items);assertFalse(vault.contains("synthetic-only"));assertEquals(1,VaultCrypto.open(vault,"destination-password".toCharArray()).items.length());session.destroy();
 }
 @Test public void rejectsWrongPasswordDamageAndUnsupportedVersions()throws Exception{
  JSONObject f=fixture();byte[] data=Base64.getDecoder().decode(f.getString("base64"));char[] pw=f.getString("password").toCharArray();
  assertThrows(Exception.class,()->SafeDbImport.read(data,"wrong".toCharArray()));
  byte[] bad=data.clone();bad[bad.length-32]^=128;assertThrows(Exception.class,()->SafeDbImport.read(bad,pw));
  byte[] version=data.clone();version[2]=99;assertThrows(Exception.class,()->SafeDbImport.read(version,pw));
  assertThrows(Exception.class,()->SafeDbImport.read(Arrays.copyOf(data,20),pw));Arrays.fill(pw,'\0');
 }
 @Test public void rejectsEntitiesAttachmentsAndInvalidXml()throws Exception{
  assertThrows(Exception.class,()->SafeDbImport.parse("<!DOCTYPE database [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><database>&x;</database>"));
  assertThrows(Exception.class,()->SafeDbImport.parse("<database><card><file>FAKE</file></card></database>"));
  assertThrows(Exception.class,()->SafeDbImport.parse("<wrong/>"));assertThrows(Exception.class,()->SafeDbImport.parse("<database><card></database>"));
 }
}
