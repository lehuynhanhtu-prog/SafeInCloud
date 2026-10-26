package vn.safeincloud.personal;

import org.json.*;
import java.time.Instant;
import java.util.*;

/** Deterministic per-record merge shared by every Android sync path. */
public final class VaultMerge {
 private VaultMerge(){}
 public static boolean deleted(JSONObject item){return item!=null&&!item.optString("deletedAt","").isEmpty();}
 public static int liveCount(JSONArray items){int count=0;for(int i=0;i<items.length();i++)if(!deleted(items.optJSONObject(i)))count++;return count;}
 public static JSONObject tombstone(JSONObject item,String now)throws Exception{return new JSONObject().put("id",item.getString("id")).put("title",item.optString("title")).put("category",item.optString("category","APP")).put("fields",new JSONObject()).put("updatedAt",now).put("deletedAt",now);}
 private static long stamp(JSONObject item){try{return Instant.parse(item.optString("updatedAt",item.optString("deletedAt"))).toEpochMilli();}catch(Exception ignored){return 0;}}
 private static String stable(Object value)throws Exception{
  if(value==null||value==JSONObject.NULL)return "null";
  if(value instanceof JSONArray){JSONArray a=(JSONArray)value;StringBuilder s=new StringBuilder("[");for(int i=0;i<a.length();i++){if(i>0)s.append(',');s.append(stable(a.get(i)));}return s.append(']').toString();}
  if(value instanceof JSONObject){JSONObject o=(JSONObject)value;ArrayList<String> keys=new ArrayList<>();for(Iterator<String> it=o.keys();it.hasNext();)keys.add(it.next());Collections.sort(keys);StringBuilder s=new StringBuilder("{");for(int i=0;i<keys.size();i++){if(i>0)s.append(',');String key=keys.get(i);s.append(JSONObject.quote(key)).append(':').append(stable(o.get(key)));}return s.append('}').toString();}
  if(value instanceof String)return JSONObject.quote((String)value);
  if(value instanceof Number||value instanceof Boolean)return String.valueOf(value);
  return JSONObject.quote(String.valueOf(value));
 }
 private static JSONObject newer(JSONObject left,JSONObject right)throws Exception{long a=stamp(left),b=stamp(right);if(a!=b)return a>b?left:right;return stable(left).compareTo(stable(right))>=0?left:right;}
 public static JSONArray merge(JSONArray local,JSONArray remote)throws Exception{
  TreeMap<String,JSONObject> records=new TreeMap<>();
  for(JSONArray source:new JSONArray[]{local,remote})for(int i=0;i<source.length();i++){JSONObject item=source.optJSONObject(i);if(item==null)continue;String id=item.optString("id","");if(id.isEmpty())continue;records.put(id,records.containsKey(id)?newer(records.get(id),item):item);}
  JSONArray out=new JSONArray();for(JSONObject item:records.values())out.put(new JSONObject(item.toString()));return out;
 }
 public static boolean same(JSONArray left,JSONArray right)throws Exception{return stable(merge(left,new JSONArray())).equals(stable(merge(right,new JSONArray())));}
}
