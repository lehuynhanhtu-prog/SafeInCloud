package vn.safeincloud.personal;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;
public final class BiometricVault {
 private static final String ALIAS="safeincloud.biometric.v1";private final SharedPreferences prefs;
 public BiometricVault(Context context){prefs=context.getSharedPreferences("biometric",Context.MODE_PRIVATE);}
 public boolean enabled(){return prefs.contains("wrapped");}
 public void clear(){prefs.edit().clear().commit();try{KeyStore k=KeyStore.getInstance("AndroidKeyStore");k.load(null);k.deleteEntry(ALIAS);}catch(Exception ignored){}}
 public Cipher prepareEnrollment()throws Exception{
  clear();KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).setUserAuthenticationRequired(true).setUserAuthenticationValidityDurationSeconds(-1).setInvalidatedByBiometricEnrollment(true).build());
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,g.generateKey());return c;
 }
 public void finishEnrollment(Cipher cipher,byte[] rawKey,byte[] salt)throws Exception{
  cipher.updateAAD(salt);String record=new JSONObject().put("salt",VaultCrypto.b64(salt)).put("iv",VaultCrypto.b64(cipher.getIV())).put("data",VaultCrypto.b64(cipher.doFinal(rawKey))).toString();
  if(!prefs.edit().putString("wrapped",record).commit())throw new IllegalStateException("Không lưu được thiết lập sinh trắc học.");
 }
 public Cipher prepareUnlock(byte[] salt)throws Exception{
  JSONObject v=new JSONObject(prefs.getString("wrapped","{}"));if(!VaultCrypto.b64(salt).equals(v.getString("salt")))throw new IllegalStateException("Kho đã thay đổi. Hãy đăng nhập bằng mật khẩu và bật lại sinh trắc học.");
  KeyStore k=KeyStore.getInstance("AndroidKeyStore");k.load(null);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,(SecretKey)k.getKey(ALIAS,null),new GCMParameterSpec(128,VaultCrypto.bytes(v.getString("iv"))));return c;
 }
 public byte[] finishUnlock(Cipher c,byte[] salt)throws Exception{JSONObject v=new JSONObject(prefs.getString("wrapped","{}"));c.updateAAD(salt);return c.doFinal(VaultCrypto.bytes(v.getString("data")));}
}
