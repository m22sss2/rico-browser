import { NetUtil } from "resource://gre/modules/NetUtil.sys.mjs";

const cacheVersion = 2;
const prefix = "resource://rico-l10n/";
const legacyBundles = [
  "chrome://global/locale/appstrings.properties",
  "chrome://browser/locale/appstrings.properties",
  "chrome://devtools/locale/jsonview.properties",
  "chrome://devtools/locale/memory.properties",
  "chrome://devtools/locale/responsive.properties",
];

function path(root, relative) {
  const file = root.clone();
  for (const part of relative.split("/")) {
    file.append(part);
  }
  return file;
}

function directory(file) {
  if (file.exists()) return;
  directory(file.parent);
  try {
    file.create(Ci.nsIFile.DIRECTORY_TYPE, 0o755);
  } catch (error) {
    if (!file.exists() || !file.isDirectory()) throw error;
  }
}

function read(stream) {
  try {
    return NetUtil.readInputStreamToString(stream, stream.available(), { charset: "UTF-8" });
  } finally {
    stream.close();
  }
}

function readURI(uri) {
  return read(NetUtil.newChannel({ uri, loadUsingSystemPrincipal: true }).open());
}

function write(file, text) {
  directory(file.parent);
  const stream = Cc["@mozilla.org/network/safe-file-output-stream;1"]
    .createInstance(Ci.nsIFileOutputStream);
  stream.init(file, 0x02 | 0x08 | 0x20, 0o644, 0);
  try {
    const bytes = new TextEncoder().encode(text);
    for (let start = 0; start < bytes.length; start += 8192) {
      const chunk = String.fromCharCode(...bytes.subarray(start, start + 8192));
      if (stream.write(chunk, chunk.length) !== chunk.length) throw new Error("Short write");
    }
    stream.QueryInterface(Ci.nsISafeOutputStream).finish();
  } catch (error) {
    stream.close();
    throw error;
  }
}

function translate(text) {
  // Skip comments, markup, URLs, third-party service names and trademark notices.
  const protectedPart = /(<[^>]*>|(?:https?|chrome|resource|about|moz-extension):[^\s<>"']+|Firefox (?:Focus|Relay|Monitor|Send|Accounts|for Android|for iOS)\b)/g;
  return text.split("\n").map(line => {
    if (/^\s*(?:#|trademarkInfo\s*=)/.test(line) || !line.includes("Firefox")) return line;
    return line.split(protectedPart).map((part, index) => index % 2 ? part :
      part.replace(/\b(?:Mozilla Firefox|Firefox)(?: ESR)?\b/g, "Rico")).join("");
  }).join("\n");
}

function buildCache(cache) {
  const files = new Set();
  const locales = new Set();
  const gre = Services.dirsvc.get("GreD", Ci.nsIFile);
  const app = Services.dirsvc.get("XCurProcD", Ci.nsIFile);
  for (const archive of [path(gre, "omni.ja"), path(app, "omni.ja")]) {
    const reader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
    reader.open(archive);
    try {
      const entries = reader.findEntries("localization/*.ftl");
      while (entries.hasMore()) {
        const entry = entries.getNext();
        const relative = entry.slice("localization/".length);
        if (!/^[\w-]+\/[\w./-]+\.ftl$/.test(relative) ||
            relative.split("/").some(part => part === "..")) continue;
        const original = read(reader.getInputStream(entry));
        const branded = translate(original);
        if (branded === original) continue;
        write(path(cache, relative), branded);
        files.add(relative);
        locales.add(relative.split("/")[0]);
      }
    } finally {
      reader.close();
    }
  }
  const legacy = [];
  for (const [position, uri] of legacyBundles.entries()) {
    let original;
    try {
      original = readURI(Services.io.newURI(uri));
    } catch {
      // Legacy bundle locations vary by ESR version.
      continue;
    }
    const branded = translate(original);
    if (branded === original) continue;
    const relative = `legacy/${position}.properties`;
    write(path(cache, relative), branded);
    legacy.push(`override ${uri} ${prefix}${relative}`);
  }
  if (legacy.length) write(path(cache, "legacy.manifest"), legacy.join("\n") + "\n");
  const index = { files: [...files], locales: [...locales], legacy: legacy.length > 0 };
  write(path(cache, "index.json"), JSON.stringify(index));
  return index;
}

export function registerRicoBranding(assets) {
  const cache = path(assets, `.branding-cache/${Services.appinfo.appBuildID}-${Services.locale.appLocaleAsBCP47}-${cacheVersion}`);
  const marker = path(cache, "index.json");
  let index;
  if (marker.exists()) {
    try {
      index = JSON.parse(readURI(Services.io.newFileURI(marker)));
    } catch (error) {
      Cu.reportError(error);
    }
  }
  index ??= buildCache(cache);
  if (!index.files.length) return;
  Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler)
    .setSubstitution("rico-l10n", Services.io.newFileURI(cache));
  if (index.legacy) {
    Components.manager.QueryInterface(Ci.nsIComponentRegistrar)
      .autoRegister(path(cache, "legacy.manifest"));
  }
  const source = new L10nFileSource("rico-brand", "app", index.locales, `${prefix}{locale}/`,
    {}, index.files.map(file => prefix + file));
  L10nRegistry.getInstance().registerSources([source]);
}
