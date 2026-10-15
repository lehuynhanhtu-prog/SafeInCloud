package vn.safeincloud.personal;

import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/** Version 1 is byte-compatible with the browser vault format. */
public final class VaultCrypto {
 public static final int ITERATIONS=600000;
 private static final SecureRandom RANDOM=new SecureRandom();
 private static final byte[] AAD="SafeinCloud:1".getBytes(StandardCharsets.UTF_8);
 public static final class Session {
  public byte[] key,salt; public JSONArray items;
  Session(byte[] k,byte[] s,JSONArray i){key=k;salt=s;items=i;}
  public void destroy(){Arrays.fill(key,(byte)0);Arrays.fill(salt,(byte)0);items=new JSONArray();}
 }
 public static byte[] random(int n){byte[] b=new byte[n];RANDOM.nextBytes(b);return b;}
 public static String b64(byte[] b){return Base64.getEncoder().encodeToString(b);}
 public static byte[] bytes(String s){return Base64.getDecoder().decode(s);}
 public static byte[] derive(char[] password,byte[] salt)throws Exception{
  PBEKeySpec spec=new PBEKeySpec(password,salt,ITERATIONS,256);
  try{return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();}finally{spec.clearPassword();}
 }
 public static Session create(char[] password)throws Exception{
  byte[] salt=random(16);return new Session(derive(password,salt),salt,new JSONArray());
 }
 public static JSONObject validate(String text)throws Exception{
  if(text.length()>14000000)throw new IllegalArgumentException("Kho vượt quá dung lượng hỗ trợ.");
  JSONObject v=new JSONObject(text);
  if(!"SafeinCloud".equals(v.getString("format"))||v.getInt("version")!=1||!"PBKDF2-SHA256".equals(v.getString("kdf"))||v.getInt("iterations")!=ITERATIONS||bytes(v.getString("salt")).length!=16||bytes(v.getString("iv")).length!=12||bytes(v.getString("data")).length<16)throw new IllegalArgumentException("Định dạng kho không được hỗ trợ.");
  return v;
 }
 public static Session open(String text,char[] password)throws Exception{
  JSONObject v=validate(text);byte[] salt=bytes(v.getString("salt")),key=derive(password,salt);
  try{return openWithKey(v,key,salt);}catch(Exception e){Arrays.fill(key,(byte)0);throw e;}
 }
 public static Session openWithKey(JSONObject v,byte[] key,byte[] salt)throws Exception{
  if(!Arrays.equals(salt,bytes(v.getString("salt"))))throw new IllegalArgumentException("Khóa không khớp kho.");
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,bytes(v.getString("iv"))));c.updateAAD(AAD);
  byte[] plain=c.doFinal(bytes(v.getString("data")));
  try{JSONArray items=new JSONArray(new String(plain,StandardCharsets.UTF_8));validateItems(items);return new Session(key,salt,items);}finally{Arrays.fill(plain,(byte)0);}
 }
 public static void validateItems(JSONArray items)throws Exception{
  if(items.length()>20000)throw new IllegalArgumentException("Kho vượt quá 20.000 mục.");
  for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);item.getString("id");item.getString("title");JSONObject fields=item.getJSONObject("fields");for(java.util.Iterator<String> k=fields.keys();k.hasNext();)if(!(fields.get(k.next()) instanceof String))throw new IllegalArgumentException("Trường dữ liệu không hợp lệ.");}
 }
 public static String seal(Session session,JSONArray items)throws Exception{
  validateItems(items);byte[] iv=random(12);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(session.key,"AES"),new GCMParameterSpec(128,iv));c.updateAAD(AAD);
  byte[] plain=items.toString().getBytes(StandardCharsets.UTF_8);
  try{return new JSONObject().put("format","SafeinCloud").put("version",1).put("kdf","PBKDF2-SHA256").put("iterations",ITERATIONS).put("salt",b64(session.salt)).put("iv",b64(iv)).put("data",b64(c.doFinal(plain))).toString();}finally{Arrays.fill(plain,(byte)0);}
 }
 public static String generate(){String chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_+";StringBuilder s=new StringBuilder();for(int i=0;i<24;i++)s.append(chars.charAt(RANDOM.nextInt(chars.length())));return s.toString();}
}
