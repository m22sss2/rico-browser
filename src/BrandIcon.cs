using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;

internal static class BrandIcon
{
    private delegate bool LanguageCallback(IntPtr module, IntPtr type, IntPtr name, ushort language, IntPtr data);
    [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr LoadLibraryEx(string path, IntPtr file, uint flags);
    [DllImport("kernel32", SetLastError = true)]
    private static extern bool FreeLibrary(IntPtr module);
    [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool EnumResourceLanguages(IntPtr module, IntPtr type, IntPtr name, LanguageCallback callback, IntPtr data);
    [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr BeginUpdateResource(string path, bool erase);
    [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool UpdateResource(IntPtr update, IntPtr type, IntPtr name, ushort language, byte[] bytes, uint size);
    [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool EndUpdateResource(IntPtr update, bool discard);

    internal static void Apply(string path, string iconPath)
    {
        byte[] icon = File.ReadAllBytes(iconPath);
        if (BitConverter.ToUInt16(icon, 2) != 1)
            throw new InvalidDataException("Icone Rico invalide.");
        int count = BitConverter.ToUInt16(icon, 4);
        var frames = new byte[count][];
        byte[] group = new byte[6 + count * 14];
        Buffer.BlockCopy(icon, 0, group, 0, 6);
        for (int index = 0; index < count; index++)
        {
            int input = 6 + 16 * index;
            int output = 6 + 14 * index;
            int size = BitConverter.ToInt32(icon, input + 8);
            int offset = BitConverter.ToInt32(icon, input + 12);
            frames[index] = new byte[size];
            Buffer.BlockCopy(icon, offset, frames[index], 0, size);
            Buffer.BlockCopy(icon, input, group, output, 12);
            Buffer.BlockCopy(BitConverter.GetBytes((ushort)(201 + index)), 0, group, output + 12, 2);
        }
        var groups = new[] { 1, 32512 };
        var languages = new System.Collections.Generic.List<ushort>[groups.Length];
        IntPtr module = LoadLibraryEx(path, IntPtr.Zero, 2);
        if (module == IntPtr.Zero) throw new Win32Exception();
        try
        {
            for (int index = 0; index < groups.Length; index++)
            {
                var ids = new System.Collections.Generic.List<ushort>();
                EnumResourceLanguages(module, (IntPtr)14, (IntPtr)groups[index],
                    (m, t, n, lang, d) => { ids.Add(lang); return true; }, IntPtr.Zero);
                languages[index] = ids;
            }
        }
        finally { FreeLibrary(module); }
        if (languages[0].Count == 0) throw new InvalidDataException("Groupe d'icones Mozilla introuvable.");

        IntPtr update = BeginUpdateResource(path, false);
        if (update == IntPtr.Zero) throw new Win32Exception();
        bool commit = false;
        try
        {
            for (int groupIndex = 0; groupIndex < groups.Length; groupIndex++)
            {
                foreach (ushort language in languages[groupIndex])
                {
                    for (int index = 0; index < frames.Length; index++)
                        Write(update, 3, 201 + index, language, frames[index]);
                    Write(update, 14, groups[groupIndex], language, group);
                }
            }
            commit = true;
        }
        finally
        {
            if (!EndUpdateResource(update, !commit) && commit) throw new Win32Exception();
        }
    }

    private static void Write(IntPtr update, int kind, int id, ushort language, byte[] data)
    {
        if (!UpdateResource(update, (IntPtr)kind, (IntPtr)id, language, data, (uint)data.Length))
            throw new Win32Exception();
    }
}
