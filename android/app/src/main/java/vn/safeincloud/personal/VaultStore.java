package vn.safeincloud.personal;
import android.content.Context;
import android.util.AtomicFile;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;
public final class VaultStore {
 private final Context context;private final AtomicFile file;
 public VaultStore(Context c){context=c;file=new AtomicFile(new File(c.getNoBackupFilesDir(),"vault-v1.json"));}
 public boolean exists(){return file.getBaseFile().exists()||new File(file.getBaseFile().getPath()+".bak").exists();}
 public String read()throws Exception{return new String(file.readFully(),StandardCharsets.UTF_8);}
 public synchronized void write(String envelope)throws Exception{
  VaultCrypto.validate(envelope);FileOutputStream out=null;
  try{out=file.startWrite();out.write(envelope.getBytes(StandardCharsets.UTF_8));file.finishWrite(out);}catch(Exception e){if(out!=null)file.failWrite(out);throw e;}
 }
 public synchronized void replace(String envelope)throws Exception{
  VaultCrypto.validate(envelope);if(exists()){
   AtomicFile backup=new AtomicFile(new File(context.getNoBackupFilesDir(),"previous-vault.json"));FileOutputStream out=null;
   try{out=backup.startWrite();out.write(read().getBytes(StandardCharsets.UTF_8));backup.finishWrite(out);}catch(Exception e){if(out!=null)backup.failWrite(out);throw e;}
  }write(envelope);
 }
 public String previous()throws Exception{return new String(new AtomicFile(new File(context.getNoBackupFilesDir(),"previous-vault.json")).readFully(),StandardCharsets.UTF_8);}
}
