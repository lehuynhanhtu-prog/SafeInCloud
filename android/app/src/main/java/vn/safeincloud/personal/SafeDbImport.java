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
import java.time.Instant;
import java.util.*;
import java.util.zip.Inflater;

/** Import-only legacy SafeInCloud v1 reader. Destination encryption is unchanged.
 * Format reference: mxschmitt/golang-safe-in-cloud, decrypt.go (MIT). */
public final class SafeDbImport {
 private static final int MAX_FILE=10*1024*1024,MAX_XML=20*1024*1024;
 private static final String BAD_PASSWORD="Không giải mã được. Mật khẩu không đúng hoặc file bị hỏng.";
 public static final class Result {
  public JSONArray items=new JSONArray();public int templates,deleted,labels;
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
  if(doc.getElementsByTagName("file").getLength()>0)throw new IllegalArgumentException("Kho có tệp đính kèm. Phiên bản này chưa hỗ trợ nhập tệp đính kèm.");
  Map<String,String> labels=new HashMap<>();for(Element l:children(root,"label"))labels.put(l.getAttribute("id"),l.getAttribute("name"));
  Result result=new Result();result.labels=labels.size();
  for(Element card:children(root,"card")){
   if(truth(card.getAttribute("template"))){result.templates++;continue;}
   if(truth(card.getAttribute("deleted"))){result.deleted++;continue;}
   if(result.items.length()>=20000)throw new IllegalArgumentException("Kho vượt quá 20.000 mục.");
   JSONObject fields=new JSONObject();JSONArray originals=new JSONArray();
   for(Element f:children(card,"field")){
    String type=f.getAttribute("type"),name=f.getAttribute("name"),canonical=null;if(name.isEmpty())name="Trường";
    switch(type){case "login":canonical="Login";break;case "password":canonical="Password";break;case "website":canonical="URL";break;case "otp":case "totp":canonical="OTP";break;case "notes":canonical="Notes";break;}
    put(fields,canonical!=null&&!fields.has(canonical)?canonical:name,f.getTextContent());originals.put(attributes(f));
    if(!f.getAttribute("history").isEmpty())put(fields,"Lịch sử · "+name,f.getAttribute("history"));
   }
   List<String> notes=new ArrayList<>();for(Element n:children(card,"notes"))notes.add(n.getTextContent());if(!notes.isEmpty())put(fields,"Notes",String.join("\n",notes));
   List<String> tags=new ArrayList<>();for(Element tag:children(card,"label_id")){String id=tag.getTextContent().trim();tags.add(labels.containsKey(id)?labels.get(id):id);}if(!tags.isEmpty())put(fields,"Nhãn",String.join(", ",tags));
   String hint=String.join(" ",tags).toLowerCase(Locale.ROOT),category="WEB";
   if(hint.contains("credit")||hint.contains("thẻ tín dụng"))category="Thẻ tín dụng";else if(hint.contains("email")||hint.contains("e-mail"))category="Email";else if(hint.contains("khóa cửa"))category="Khóa cửa";else if(hint.contains("ứng dụng")||hint.contains("application"))category="APP";
   String title=card.getAttribute("title");if(title.isEmpty())title="Chưa đặt tên";
   result.items.put(new JSONObject().put("id",UUID.randomUUID().toString()).put("title",title).put("category",category).put("fields",fields).put("updatedAt",Instant.now().toString()).put("source",new JSONObject().put("format","SafeInCloud-db-v1").put("attributes",attributes(card)).put("fields",originals)));
  }
  return result;
 }
}
