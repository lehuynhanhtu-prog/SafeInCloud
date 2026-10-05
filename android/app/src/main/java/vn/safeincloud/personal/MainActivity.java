package vn.safeincloud.personal;
import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.content.Intent;
import android.graphics.Color;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
public final class MainActivity extends Activity {
 private static final String URL="https://lehuynhanhtu-prog.github.io/SafeInCloud/?mode=app";
 @Override public void onCreate(Bundle state){super.onCreate(state);launch();finish();}
 private void launch(){try{new CustomTabsIntent.Builder()
  .setShowTitle(false)
  .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(Color.rgb(243,246,251)).build())
  .build().launchUrl(this,Uri.parse(URL));
 }catch(Exception e){startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(URL)));}}
}
