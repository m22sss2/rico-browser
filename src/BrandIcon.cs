using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

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
    private static extern IntPtr FindResourceEx(IntPtr module, IntPtr type, IntPtr name, ushort language);
    [DllImport("kernel32", SetLastError = true)]
    private static extern uint SizeofResource(IntPtr module, IntPtr resource);
    [DllImport("kernel32", SetLastError = true)]
    private static extern IntPtr LoadResource(IntPtr module, IntPtr resource);
    [DllImport("kernel32")]
    private static extern IntPtr LockResource(IntPtr resource);
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
        var languages = new List<ushort>[groups.Length];
        var versions = new Dictionary<ushort, byte[]>();
        IntPtr module = LoadLibraryEx(path, IntPtr.Zero, 2);
        if (module == IntPtr.Zero) throw new Win32Exception();
        try
        {
            for (int index = 0; index < groups.Length; index++)
            {
                var ids = new List<ushort>();
                EnumResourceLanguages(module, (IntPtr)14, (IntPtr)groups[index],
                    (m, t, n, lang, d) => { ids.Add(lang); return true; }, IntPtr.Zero);
                languages[index] = ids;
            }
            var versionLanguages = new List<ushort>();
            EnumResourceLanguages(module, (IntPtr)16, (IntPtr)1,
                (m, t, n, lang, d) => { versionLanguages.Add(lang); return true; }, IntPtr.Zero);
            foreach (ushort language in versionLanguages)
            {
                byte[] original = ReadVersionResource(module, language);
                int namesChanged = 0;
                versions.Add(language, RewriteVersionBlock(original, 0, original.Length, "", ref namesChanged));
                if (namesChanged < 2)
                    throw new InvalidDataException("Description ou nom de produit Windows introuvable.");
            }
        }
        finally { FreeLibrary(module); }
        if (languages[0].Count == 0) throw new InvalidDataException("Groupe d'icones Mozilla introuvable.");
        if (versions.Count == 0) throw new InvalidDataException("Ressource VERSIONINFO Mozilla introuvable.");

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
            foreach (var version in versions)
                Write(update, 16, 1, version.Key, version.Value);
            commit = true;
        }
        finally
        {
            if (!EndUpdateResource(update, !commit) && commit) throw new Win32Exception();
        }
    }

    private static byte[] ReadVersionResource(IntPtr module, ushort language)
    {
        IntPtr resource = FindResourceEx(module, (IntPtr)16, (IntPtr)1, language);
        if (resource == IntPtr.Zero) throw new Win32Exception();
        int size = checked((int)SizeofResource(module, resource));
        IntPtr loaded = LoadResource(module, resource);
        if (loaded == IntPtr.Zero) throw new Win32Exception();
        IntPtr pointer = LockResource(loaded);
        if (pointer == IntPtr.Zero || size < 6) throw new InvalidDataException("VERSIONINFO invalide.");
        var result = new byte[size];
        Marshal.Copy(pointer, result, 0, size);
        return result;
    }

    private static int Aligned(int position) { return (position + 3) & ~3; }

    private static byte[] RewriteVersionBlock(byte[] input, int start, int limit, string parent, ref int namesChanged)
    {
        // VERSIONINFO uses variable-length, DWORD-aligned blocks. Text lengths are UTF-16 units.
        if (limit - start < 6) throw new InvalidDataException("Bloc VERSIONINFO incomplet.");
        int end = start + BitConverter.ToUInt16(input, start);
        if (end > limit || end - start < 8) throw new InvalidDataException("Longueur VERSIONINFO invalide.");
        ushort valueLength = BitConverter.ToUInt16(input, start + 2);
        ushort type = BitConverter.ToUInt16(input, start + 4);
        int keyEnd = start + 6;
        while (keyEnd + 2 <= end && BitConverter.ToUInt16(input, keyEnd) != 0) keyEnd += 2;
        if (keyEnd + 2 > end) throw new InvalidDataException("Cle VERSIONINFO invalide.");
        string key = Encoding.Unicode.GetString(input, start + 6, keyEnd - (start + 6));
        int valueStart = Aligned(keyEnd + 2);
        int valueBytes = valueLength * (type == 1 ? 2 : 1);
        if (valueBytes != 0 && valueStart + valueBytes > end) throw new InvalidDataException("Valeur VERSIONINFO invalide.");

        bool replace = parent == "StringTable" && (key == "FileDescription" || key == "ProductName");
        string childParent = key == "VS_VERSION_INFO" ? "Root"
            : parent == "Root" && key == "StringFileInfo" ? "StringFileInfo"
            : parent == "StringFileInfo" ? "StringTable" : null;
        if (!replace && childParent == null)
        {
            var unchanged = new byte[end - start];
            Buffer.BlockCopy(input, start, unchanged, 0, unchanged.Length);
            return unchanged;
        }

        byte[] name = replace ? Encoding.Unicode.GetBytes("Rico\0") : null;
        using (var output = new MemoryStream())
        using (var writer = new BinaryWriter(output))
        {
            writer.Write((ushort)0);
            writer.Write(replace ? (ushort)(name.Length / 2) : valueLength);
            writer.Write(replace ? (ushort)1 : type);
            writer.Write(input, start + 6, keyEnd + 2 - (start + 6));
            if (replace || valueBytes != 0) Pad(writer);
            if (replace)
            {
                writer.Write(name);
                namesChanged++;
            }
            else
            {
                if (valueBytes != 0) writer.Write(input, valueStart, valueBytes);
                for (int child = Aligned(valueStart + valueBytes); child + 6 <= end;)
                {
                    ushort length = BitConverter.ToUInt16(input, child);
                    if (length == 0) break;
                    Pad(writer);
                    writer.Write(RewriteVersionBlock(input, child, end, childParent, ref namesChanged));
                    child = Aligned(child + length);
                }
            }
            writer.Seek(0, SeekOrigin.Begin);
            writer.Write(checked((ushort)output.Length));
            return output.ToArray();
        }
    }

    private static void Pad(BinaryWriter writer)
    {
        while ((writer.BaseStream.Position & 3) != 0) writer.Write((byte)0);
    }

    private static void Write(IntPtr update, int kind, int id, ushort language, byte[] data)
    {
        if (!UpdateResource(update, (IntPtr)kind, (IntPtr)id, language, data, (uint)data.Length))
            throw new Win32Exception();
    }
}
