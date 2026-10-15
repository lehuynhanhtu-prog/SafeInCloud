package vn.safeincloud.personal;
import org.json.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
public final class DriveClient {
 public static final String SCOPE="https://www.googleapis.com/auth/drive.appdata";
 private static String request(String path,String token,String method,String type,String body)throws Exception{
  HttpURLConnection c=(HttpURLConnection)new URL("https://www.googleapis.com/"+path).openConnection();c.setConnectTimeout(20000);c.setReadTimeout(30000);c.setInstanceFollowRedirects(false);c.setRequestMethod(method);c.setRequestProperty("Authorization","Bearer "+token);
  try{if(body!=null){c.setDoOutput(true);c.setRequestProperty("Content-Type",type);try(OutputStream out=c.getOutputStream()){out.write(body.getBytes(StandardCharsets.UTF_8));}}int status=c.getResponseCode();if(status<200||status>=300)throw new IOException("Google Drive không hoàn tất thao tác ("+status+"). Kho cũ được giữ nguyên.");try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>14000000)throw new IOException("Kho vượt quá dung lượng hỗ trợ.");out.write(b,0,n);}return out.toString("UTF-8");}}finally{c.disconnect();}
 }
 public static void upload(String envelope,String token)throws Exception{
  VaultCrypto.validate(envelope);String boundary="safeincloud_"+UUID.randomUUID();JSONObject meta=new JSONObject().put("name","SafeinCloud-"+Instant.now()+".vault").put("parents",new JSONArray().put("appDataFolder")).put("appProperties",new JSONObject().put("app","safeincloud-v1"));String body="--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+meta+"\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n"+envelope+"\r\n--"+boundary+"--";request("upload/drive/v3/files?uploadType=multipart",token,"POST","multipart/related; boundary="+boundary,body);
 }
 public static String pull(String token)throws Exception{String q=URLEncoder.encode("trashed = false and appProperties has { key='app' and value='safeincloud-v1' }","UTF-8");JSONArray files=new JSONObject(request("drive/v3/files?spaces=appDataFolder&pageSize=1&orderBy=createdTime%20desc&fields=files(id)&q="+q,token,"GET",null,null)).getJSONArray("files");if(files.length()==0)throw new IOException("Tài khoản này chưa có kho SafeInCloud.");String envelope=request("drive/v3/files/"+URLEncoder.encode(files.getJSONObject(0).getString("id"),"UTF-8")+"?alt=media",token,"GET",null,null);VaultCrypto.validate(envelope);return envelope;}
}
