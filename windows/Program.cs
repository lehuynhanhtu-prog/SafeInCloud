using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Windows.Forms;

internal static class Program {
 const string AppUrl="https://lehuynhanhtu-prog.github.io/SafeInCloud/?source=windows-portable&v=0.5.6";

 [STAThread]
 static void Main() {
  Application.EnableVisualStyles();
  Application.SetCompatibleTextRenderingDefault(false);
  try {
   string? edge=FindEdge();
   if(edge is not null) {
    var start=new ProcessStartInfo(edge){UseShellExecute=false};
    start.ArgumentList.Add("--app="+AppUrl);
    start.ArgumentList.Add("--start-maximized");
    Process.Start(start);
   } else Process.Start(new ProcessStartInfo(AppUrl){UseShellExecute=true});
  } catch(Exception) {
   try { Clipboard.SetText(AppUrl); } catch { }
   MessageBox.Show("Không thể mở SafeInCloud tự động. Hãy mở địa chỉ sau bằng Microsoft Edge hoặc Google Chrome:\n\n"+AppUrl,"SafeInCloud Portable",MessageBoxButtons.OK,MessageBoxIcon.Information);
  }
 }

 static string? FindEdge() {
  var roots=new List<string?> {
   Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
   Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
   Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)
  };
  return roots.Where(root=>!string.IsNullOrWhiteSpace(root))
   .Select(root=>Path.Combine(root!,"Microsoft","Edge","Application","msedge.exe"))
   .FirstOrDefault(File.Exists);
 }
}
