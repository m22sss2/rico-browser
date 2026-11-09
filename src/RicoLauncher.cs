using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

[assembly: AssemblyTitle("Rico")]
[assembly: AssemblyProduct("Rico")]
[assembly: AssemblyDescription("Lanceur de Rico Browser")]
[assembly: AssemblyVersion("1.4.1.0")]

internal static class RicoLauncher
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            string root = AppDomain.CurrentDomain.BaseDirectory;
            string profile = Path.Combine(root, "profile");
            string chrome = Path.Combine(profile, "chrome");
            string assets = Path.Combine(root, "assets");
            string runtime = Path.Combine(root, "browser");
            if (args.Length == 2 && args[0] == "--brand-runtime")
            {
                BrandIcon.Apply(Path.GetFullPath(args[1]), Path.Combine(assets, "rico.ico"));
                return 0;
            }

            Directory.CreateDirectory(chrome);
            File.Copy(Path.Combine(assets, "userChrome.css"),
                      Path.Combine(chrome, "userChrome.css"), true);
            File.Copy(Path.Combine(assets, "userContent.css"),
                      Path.Combine(chrome, "userContent.css"), true);
            File.Copy(Path.Combine(assets, "rico.svg"),
                      Path.Combine(chrome, "rico.svg"), true);

            string policyPath = Path.Combine(runtime, "distribution", "policies.json");
            var serializer = new JavaScriptSerializer();
            var config = serializer.DeserializeObject(File.ReadAllText(policyPath));
            var policies = GetObject(config, "policies");
            var homepage = GetObject(policies, "Homepage");
            var extensions = GetObject(policies, "ExtensionSettings");
            var ublock = GetObject(extensions, "uBlock0@raymondhill.net");
            string homepageUrl = new Uri(Path.Combine(assets, "home.html")).AbsoluteUri;
            string extensionUrl = new Uri(Path.Combine(assets, "ublock.xpi")).AbsoluteUri;
            if (!Equals(homepage["URL"], homepageUrl) || !Equals(ublock["install_url"], extensionUrl))
            {
                homepage["URL"] = homepageUrl;
                ublock["install_url"] = extensionUrl;
                string temp = policyPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
                try
                {
                    File.WriteAllText(temp, serializer.Serialize(config), new UTF8Encoding(false));
                    File.Replace(temp, policyPath, null);
                }
                finally
                {
                    File.Delete(temp);
                }
            }

            var start = new ProcessStartInfo
            {
                FileName = Path.Combine(runtime, "rico.exe"),
                WorkingDirectory = runtime,
                Arguments = "-no-remote -profile \"" + profile + "\"",
                UseShellExecute = false
            };
            using (Process.Start(start)) { }
            return 0;
        }
        catch (Exception error)
        {
            if (args.Length == 2 && args[0] == "--brand-runtime") Console.Error.WriteLine(error.Message);
            else MessageBox.Show(error.Message, "Rico Browser", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static Dictionary<string, object> GetObject(object parent, string key)
    {
        return (Dictionary<string, object>)((Dictionary<string, object>)parent)[key];
    }
}
