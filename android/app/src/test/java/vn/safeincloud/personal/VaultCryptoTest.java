package vn.safeincloud.personal;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.io.InputStream;
import javax.crypto.AEADBadTagException;
public class VaultCryptoTest {
 @Test public void readsBrowserVaultWithUnicodePassword()throws Exception{
  String text;try(InputStream in=getClass().getResourceAsStream("/web-vault.json")){text=new String(in.readAllBytes(),StandardCharsets.UTF_8);}
  VaultCrypto.Session s=VaultCrypto.open(text,"Kiểm-thử-123!".toCharArray());assertEquals("Ví dụ",s.items.getJSONObject(0).getString("title"));assertEquals("synthetic-only",s.items.getJSONObject(0).getJSONObject("fields").getString("Password"));assertThrows(AEADBadTagException.class,()->VaultCrypto.open(text,"incorrect".toCharArray()));s.destroy();
 }
 @Test public void roundTripAndTamperRejection()throws Exception{
  VaultCrypto.Session s=VaultCrypto.create("synthetic-password".toCharArray());JSONArray data=new JSONArray().put(new JSONObject().put("id","test").put("title","Test").put("fields",new JSONObject().put("Password","synthetic-secret")));
  String envelope=VaultCrypto.seal(s,data);assertFalse(envelope.contains("synthetic-secret"));assertEquals(data.toString(),VaultCrypto.open(envelope,"synthetic-password".toCharArray()).items.toString());assertNotEquals(new JSONObject(envelope).getString("iv"),new JSONObject(VaultCrypto.seal(s,data)).getString("iv"));JSONObject bad=new JSONObject(envelope);byte[] bytes=VaultCrypto.bytes(bad.getString("data"));bytes[0]^=1;bad.put("data",VaultCrypto.b64(bytes));assertThrows(AEADBadTagException.class,()->VaultCrypto.open(bad.toString(),"synthetic-password".toCharArray()));s.destroy();for(byte b:s.key)assertEquals(0,b);
 }
 @Test public void importsCsvAndPreservesOtp()throws Exception{
  JSONArray rows=CsvImport.parse("\uFEFFTitle,Login,Password,URL,Notes,OTP\r\n\"Test, one\",u,p,https://example.com,\"line 1\nline \"\"2\"\"\",ABC\r\nMail,mail@example.invalid,p,,,\r\nApp,desktop-user,p,,,\r\n");assertEquals("Test, one",rows.getJSONObject(0).getString("title"));assertEquals("ABC",rows.getJSONObject(0).getJSONObject("fields").getString("OTP"));assertEquals("password",rows.getJSONObject(0).getJSONObject("fieldTypes").getString("OTP"));assertEquals("WEB",rows.getJSONObject(0).getString("category"));assertEquals("Email",rows.getJSONObject(1).getString("category"));assertEquals("APP",rows.getJSONObject(2).getString("category"));assertEquals(0,CsvImport.parse("Title,Login,Password,URL,Notes,OTP\n,,,,,\n").length());assertThrows(Exception.class,()->CsvImport.parse("Title,Login\na,b"));
 }
}
