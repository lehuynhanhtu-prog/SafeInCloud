package vn.safeincloud.personal;
import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.content.Intent;
import android.widget.Button;
import androidx.browser.customtabs.CustomTabsIntent;
public final class MainActivity extends Activity {
 private static final String URL="https://lehuynhanhtu-prog.github.io/SafeInCloud/";
 @Override public void onCreate(Bundle state){super.onCreate(state);Button button=new Button(this);button.setText("Mở kho SafeinCloud");button.setOnClickListener(v->launch());setContentView(button);launch();}
 private void launch(){try{new CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(this,Uri.parse(URL));}catch(Exception e){startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(URL)));}}
}
