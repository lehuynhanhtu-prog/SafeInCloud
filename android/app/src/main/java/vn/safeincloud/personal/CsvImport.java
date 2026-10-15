package vn.safeincloud.personal;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.*;
import java.time.Instant;
public final class CsvImport {
 public static JSONArray parse(String source)throws Exception{
  if(source.startsWith("\uFEFF"))source=source.substring(1);
  List<List<String>> rows=new ArrayList<>();List<String> row=new ArrayList<>();StringBuilder cell=new StringBuilder();boolean quoted=false;
  for(int i=0;i<source.length();i++){char c=source.charAt(i);if(c=='"'){if(quoted&&i+1<source.length()&&source.charAt(i+1)=='"'){cell.append('"');i++;}else if(!quoted&&cell.length()>0)throw new IllegalArgumentException("CSV không hợp lệ.");else quoted=!quoted;}else if(c==','&&!quoted){row.add(cell.toString());cell.setLength(0);}else if((c=='\n'||c=='\r')&&!quoted){if(c=='\r'&&i+1<source.length()&&source.charAt(i+1)=='\n')i++;row.add(cell.toString());if(row.stream().anyMatch(s->!s.isEmpty()))rows.add(row);row=new ArrayList<>();cell.setLength(0);}else cell.append(c);}
  if(quoted)throw new IllegalArgumentException("CSV có dấu ngoặc kép chưa đóng.");row.add(cell.toString());if(row.stream().anyMatch(s->!s.isEmpty()))rows.add(row);
  String[] headers={"Title","Login","Password","URL","Notes","OTP"};
  if(rows.isEmpty()||!rows.remove(0).equals(Arrays.asList(headers)))throw new IllegalArgumentException("CSV cần các cột Title,Login,Password,URL,Notes,OTP.");
  JSONArray result=new JSONArray();for(List<String> r:rows){if(r.size()!=6)throw new IllegalArgumentException("Số cột CSV không đúng.");if(result.length()>=20000)throw new IllegalArgumentException("CSV vượt quá 20.000 mục.");JSONObject fields=new JSONObject();for(int i=1;i<6;i++)fields.put(headers[i],r.get(i));result.put(new JSONObject().put("id",UUID.randomUUID().toString()).put("title",r.get(0).isEmpty()?"Chưa đặt tên":r.get(0)).put("category","WEB").put("fields",fields).put("updatedAt",Instant.now().toString()));}return result;
 }
}
