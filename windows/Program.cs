using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
class Program {
 [STAThread] static void Main() {
  const string url="https://safeincloud-vault.lehuynhanhtu-2025.chatgpt.site";
  string edge=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),"Microsoft","Edge","Application","msedge.exe");
  try { if(File.Exists(edge)) Process.Start(new ProcessStartInfo(edge,"--app="+url){UseShellExecute=false}); else Process.Start(new ProcessStartInfo(url){UseShellExecute=true}); }
  catch { MessageBox.Show("Không mở được trình duyệt. Mở địa chỉ SafeinCloud bằng Microsoft Edge.","SafeinCloud"); }
 }
}
