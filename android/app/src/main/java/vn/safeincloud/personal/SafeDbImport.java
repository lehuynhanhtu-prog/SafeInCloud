package vn.safeincloud.personal;

import org.json.*;
import org.w3c.dom.*;
import org.xml.sax.InputSource;
import org.xml.sax.SAXParseException;
import org.xml.sax.helpers.DefaultHandler;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.util.*;
import java.util.zip.Inflater;

/** Import-only legacy SafeInCloud v1 reader. Destination encryption is unchanged.
 * Format reference: mxschmitt/golang-safe-in-cloud, decrypt.go (MIT). */
public final class SafeDbImport {
 private static final int MAX_FILE=10*1024*1024,MAX_XML=20*1024*1024,MAX_ATTACHMENT=4*1024*1024,MAX_ATTACHMENTS=6*1024*1024;
 private static final String BAD_PASSWORD="Không giải mã được. Mật khẩu không đúng hoặc file bị hỏng.";
 public static final class Result {
  public JSONArray items=new JSONArray();public int templates,deleted,labels,attachments,skippedAttachments,attachmentBytes,skippedHistory;
 }
 private static final class Reader {
  final byte[] data;int pos;
  Reader(byte[] d,int p){data=d;pos=p;}
  byte[] array(){if(pos>=data.length)throw new IllegalArgumentException(BAD_PASSWORD);int n=data[pos++]&255;if(pos+n>data.length)throw new IllegalArgumentException(BAD_PASSWORD);byte[] b=Arrays.copyOfRange(data,pos,pos+n);pos+=n;return b;}
 }
 private static byte[] aes(byte[] key,byte[] iv,byte[] data)throws Exception{
  if(key.length!=32||iv.length!=16||data.length==0||data.length%16!=0)throw new IllegalArgumentException(BAD_PASSWORD);
  Cipher c=Cipher.getInstance("AES/CBC/NoPadding");c.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new IvParameterSpec(iv));return c.doFinal(data);
 }
 public static Result read(byte[] data,char[] password)throws Exception{
  if(data.length>MAX_FILE)throw new IllegalArgumentException("File vượt quá 10 MB.");
  if(data.length<4||data[0]!=5||data[1]!=5||data[2]!=1)throw new IllegalArgumentException("Chỉ hỗ trợ file SafeInCloud .db định dạng cũ, phiên bản 1.");
  if(password.length==0)throw new IllegalArgumentException("Hãy nhập mật khẩu của file .db.");
  byte[] key=null,header=null,innerKey=null,compressed=null,plain=null;
  try{
   Reader r=new Reader(data,3);byte[] salt=r.array(),iv=r.array();r.array();byte[] block=r.array();
   PBEKeySpec spec=new PBEKeySpec(password,salt,10000,256);
   try{key=SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1").generateSecret(spec).getEncoded();}finally{spec.clearPassword();}
   header=aes(key,iv,block);Reader h=new Reader(header,0);byte[] innerIV=h.array();innerKey=h.array();h.array();
   compressed=aes(innerKey,innerIV,Arrays.copyOfRange(data,r.pos,data.length));
   Inflater inflater=new Inflater();byte[] buffer=new byte[16384];
   try(ByteArrayOutputStream out=new ByteArrayOutputStream()){
    inflater.setInput(compressed);
    while(!inflater.finished()){
     int n=inflater.inflate(buffer);
     if(out.size()+n>MAX_XML)throw new IllegalArgumentException("Dữ liệu giải nén vượt quá 20 MB.");
     if(n==0&&!inflater.finished())throw new IOException(BAD_PASSWORD);
     out.write(buffer,0,n);
    }
    plain=out.toByteArray();
   }finally{inflater.end();Arrays.fill(buffer,(byte)0);}
  }catch(Exception e){if("Dữ liệu giải nén vượt quá 20 MB.".equals(e.getMessage()))throw e;throw new IllegalArgumentException(BAD_PASSWORD);}
  finally{wipe(key);wipe(header);wipe(innerKey);wipe(compressed);}
  try{return parse(StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(plain)).toString());}finally{wipe(plain);}
 }
 private static void wipe(byte[] b){if(b!=null)Arrays.fill(b,(byte)0);}
 private static boolean truth(String s){return "true".equalsIgnoreCase(s)||"1".equals(s);}
 private static List<Element> children(Element parent,String name){List<Element> out=new ArrayList<>();for(Node n=parent.getFirstChild();n!=null;n=n.getNextSibling())if(n instanceof Element&&name.equals(n.getNodeName()))out.add((Element)n);return out;}
 private static JSONObject attributes(Element element)throws Exception{JSONObject attrs=new JSONObject();NamedNodeMap map=element.getAttributes();for(int i=0;i<map.getLength();i++)attrs.put(map.item(i).getNodeName(),map.item(i).getNodeValue());return attrs;}
 private static void put(JSONObject fields,String name,String value)throws Exception{if(name.isEmpty())name="Trường";String n=name;int i=2;while(fields.has(n))n=name+" ("+(i++)+")";fields.put(n,value);}
 private static String normalize(String value){return Normalizer.normalize(value==null?"":value,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).trim();}
 private static boolean history(String name){String n=normalize(name);return n.contains("lich su")||n.contains("history");}
 private static boolean email(String value){return value!=null&&value.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");}
 private static boolean bank(List<String> tags){for(String tag:tags)if(normalize(tag).matches(".*\\b(bank|banking|ngan hang)\\b.*"))return true;return false;}
 private static String standard(String type,String name,boolean isBank){
  String t=normalize(type),n=normalize(name);
  if(isBank&&n.matches("account|account number|bank account|so tai khoan|tai khoan|tai khoan ngan hang"))return "Account";
  if(t.equals("login"))return "Login";if(t.equals("password"))return "Password";if(t.equals("website")||t.equals("url"))return "URL";if(t.equals("pin"))return "PIN";if(t.equals("notes")||t.equals("note"))return "Note";
  if(n.matches("name|title|ten|ten muc"))return "Name";if(n.matches("login|username|user name|ten dang nhap|email|e-mail"))return "Login";if(n.matches("password|pass|mat khau"))return "Password";if(n.matches("pin( code| number)?"))return "PIN";if(n.matches("url|website|web site|trang web|dia chi web"))return "URL";if(n.matches("note|notes|ghi chu"))return "Note";if(n.matches("label|labels|nhan"))return "Label";return null;
 }
 private static List<String> uniqueLabels(List<String> values){List<String> result=new ArrayList<>();Set<String> seen=new HashSet<>();for(String value:values)for(String part:value.split("[,;]")){String label=part.trim(),key=normalize(label);if(!key.isEmpty()&&seen.add(key))result.add(label);}return result;}
 private static String mime(String name){String ext=name.contains(".")?name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT):"";switch(ext){case "txt":return "text/plain";case "csv":return "text/csv";case "pdf":return "application/pdf";case "png":return "image/png";case "jpg":case "jpeg":return "image/jpeg";case "gif":return "image/gif";case "webp":return "image/webp";case "svg":return "image/svg+xml";case "doc":return "application/msword";case "docx":return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";case "xls":return "application/vnd.ms-excel";case "xlsx":return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";case "zip":return "application/zip";default:return "application/octet-stream";}}
 private static JSONObject attachment(Element node,int remaining)throws Exception{
  String name=node.getAttribute("name").replaceAll("[\\x00-\\x1f]","");if(name.isEmpty())name="Tệp đính kèm";if(name.length()>255)name=name.substring(0,255);
  String data=node.getTextContent().replaceAll("\\s","");if(data.length()%4==1||!data.matches("[A-Za-z0-9+/]*={0,2}"))throw new IllegalArgumentException("base64");data+="=".repeat((4-data.length()%4)%4);
  byte[] decoded=Base64.getDecoder().decode(data);try{if(decoded.length>MAX_ATTACHMENT||decoded.length>remaining)throw new IllegalArgumentException("size");String declared=node.getAttribute("type");if(declared.isEmpty())declared=node.getAttribute("mime");String type=declared.matches("^[\\w.+-]+/[\\w.+-]+$")?declared:mime(name);return new JSONObject().put("name",name).put("type",type).put("size",decoded.length).put("data",data);}finally{wipe(decoded);}
 }
 public static Result parse(String xml)throws Exception{
  if(xml.getBytes(StandardCharsets.UTF_8).length>MAX_XML)throw new IllegalArgumentException("Dữ liệu giải nén vượt quá 20 MB.");
  String upper=xml.toUpperCase(Locale.ROOT);
  if(upper.contains("<!DOCTYPE")||upper.contains("<!ENTITY"))throw new IllegalArgumentException("File chứa khai báo XML không được hỗ trợ.");
  DocumentBuilderFactory factory=DocumentBuilderFactory.newInstance();factory.setNamespaceAware(false);factory.setValidating(false);factory.setExpandEntityReferences(false);
  javax.xml.parsers.DocumentBuilder builder=factory.newDocumentBuilder();
  builder.setEntityResolver((publicId,systemId)->new InputSource(new StringReader("")));
  builder.setErrorHandler(new DefaultHandler(){@Override public void error(SAXParseException e)throws SAXParseException{throw e;}@Override public void fatalError(SAXParseException e)throws SAXParseException{throw e;}});
  Document doc;try{doc=builder.parse(new InputSource(new StringReader(xml)));}catch(Exception e){throw new IllegalArgumentException("Nội dung .db không phải kho SafeInCloud hợp lệ.");}
  Element root=doc.getDocumentElement();if(!"database".equals(root.getNodeName()))throw new IllegalArgumentException("Nội dung .db không phải kho SafeInCloud hợp lệ.");
  Map<String,String> labels=new HashMap<>();for(Element l:children(root,"label"))labels.put(l.getAttribute("id"),l.getAttribute("name"));
  Result result=new Result();result.labels=labels.size();
  for(Element card:children(root,"card")){
   if(truth(card.getAttribute("template"))){result.templates++;continue;}
   if(truth(card.getAttribute("deleted"))){result.deleted++;continue;}
   if(result.items.length()>=20000)throw new IllegalArgumentException("Kho vượt quá 20.000 mục.");
   List<Element> fieldNodes=children(card,"field");List<String> tags=new ArrayList<>();for(Element tag:children(card,"label_id")){String id=tag.getTextContent().trim();tags.add(labels.containsKey(id)?labels.get(id):id);}for(Element f:fieldNodes)if("Label".equals(standard(f.getAttribute("type"),f.getAttribute("name"),false)))tags.add(f.getTextContent());
   boolean isBank=bank(tags);JSONObject fields=new JSONObject(),fieldTypes=new JSONObject();JSONArray originals=new JSONArray();List<String> noteParts=new ArrayList<>();String title=card.getAttribute("title").trim();
   for(Element f:fieldNodes){
    String type=f.getAttribute("type"),name=f.getAttribute("name"),value=f.getTextContent();if(name.isEmpty())name="Trường";if(history(name)){result.skippedHistory++;continue;}String canonical=standard(type,name,isBank);
    if("Name".equals(canonical)){if(title.isEmpty())title=value.trim();else if(!value.trim().isEmpty()&&!value.trim().equals(title))noteParts.add(name+": "+value);}
    else if("Note".equals(canonical))noteParts.add(value);else if("Label".equals(canonical))tags.add(value);else if(canonical!=null&&!fields.has(canonical))fields.put(canonical,value);else if(!value.isEmpty())noteParts.add(name+": "+value);
    JSONObject attrs=attributes(f);if(attrs.has("history")){if(!attrs.optString("history").isEmpty())result.skippedHistory++;attrs.remove("history");}originals.put(attrs);
   }
   for(Element n:children(card,"notes"))if(!n.getTextContent().isEmpty())noteParts.add(n.getTextContent());tags=uniqueLabels(tags);if(email(fields.optString("Login"))&&tags.stream().noneMatch(tag->normalize(tag).equals("email")))tags.add("Email");if(!tags.isEmpty())fields.put("Label",String.join(", ",tags));if(isBank&&!fields.has("Account"))fields.put("Account","");if(!noteParts.isEmpty())fields.put("Note",String.join("\n",noteParts));
   for(Iterator<String> keys=fields.keys();keys.hasNext();){String name=keys.next();fieldTypes.put(name,name.equals("Password")||name.equals("PIN")?"password":"text");}
   JSONArray files=new JSONArray();for(Element f:children(card,"file"))try{JSONObject file=attachment(f,MAX_ATTACHMENTS-result.attachmentBytes);files.put(file);result.attachmentBytes+=file.getInt("size");result.attachments++;}catch(Exception e){result.skippedAttachments++;}
   String hint=normalize(String.join(" ",tags)),category="APP";if(hint.matches(".*\\b(credit cards?|credit card|card|the tin dung)\\b.*"))category="Thẻ tín dụng";else if(hint.matches(".*\\b(door lock|khoa cua)\\b.*"))category="Khóa cửa";else if(hint.matches(".*\\b(bank|banking|ngan hang)\\b.*"))category="Bank";else if(hint.matches(".*\\b(web logins?|web|website)\\b.*")||!fields.optString("URL").trim().isEmpty())category="WEB";else if(hint.matches(".*\\b(email|e-mail|email accts?|mail)\\b.*")||email(fields.optString("Login")))category="Email";else if(hint.matches(".*\\b(forum|memberships?)\\b.*"))category="WEB";
   if(title.isEmpty())title="Chưa đặt tên";JSONObject item=new JSONObject().put("id",UUID.randomUUID().toString()).put("title",title).put("category",category).put("fields",fields).put("fieldTypes",fieldTypes).put("updatedAt",Instant.now().toString()).put("source",new JSONObject().put("format","SafeInCloud-db-v1").put("attributes",attributes(card)).put("fields",originals));if(files.length()>0)item.put("attachments",files);result.items.put(item);
  }
  return result;
 }
}
