package vn.safeincloud.personal;

import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class VaultMergeTest {
 @Test public void independentChangesAndDeletionMerge()throws Exception{
  JSONObject old=new JSONObject("{\"id\":\"a\",\"title\":\"A\",\"fields\":{\"Login\":\"old\"},\"updatedAt\":\"2026-01-01T00:00:00Z\"}");
  JSONObject local=new JSONObject(old.toString()).put("fields",new JSONObject().put("Login","local")).put("updatedAt","2026-01-02T00:00:00Z");
  JSONObject remote=new JSONObject("{\"id\":\"b\",\"title\":\"B\",\"fields\":{},\"updatedAt\":\"2026-01-03T00:00:00Z\"}");
  JSONArray merged=VaultMerge.merge(new JSONArray().put(local),new JSONArray().put(old).put(remote));
  assertEquals(2,VaultMerge.liveCount(merged));assertEquals("local",merged.getJSONObject(0).getJSONObject("fields").getString("Login"));
  JSONObject deleted=VaultMerge.tombstone(local,"2026-01-04T00:00:00Z");JSONArray after=VaultMerge.merge(new JSONArray().put(deleted),merged);
  assertEquals(1,VaultMerge.liveCount(after));assertTrue(VaultMerge.deleted(after.getJSONObject(0)));
 }
}
