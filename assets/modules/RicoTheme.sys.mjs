export const themePref = "rico.appearance.theme";
export const prelaunchPref = "dom.ipc.processPrelaunch.enabled";
export const defaultTheme = Object.freeze({
  preset: "rico", mode: "dark", background: "#141222", accent: "#ffad79",
});
export const presets = Object.freeze({
  rico: defaultTheme,
  light: { mode: "light", background: "#f3effa", accent: "#6944a4" },
  midnight: { mode: "dark", background: "#10131b", accent: "#9cbcff" },
  ocean: { mode: "dark", background: "#102336", accent: "#73d8ff" },
  forest: { mode: "dark", background: "#14251e", accent: "#a5dda3" },
});

const hex = /^#[0-9a-f]{6}$/i;

function normalize(value) {
  if (value?.preset === "custom" && ["light", "dark"].includes(value.mode) &&
      typeof value.background === "string" && hex.test(value.background) &&
      typeof value.accent === "string" && hex.test(value.accent)) {
    return { preset: "custom", mode: value.mode, background: value.background, accent: value.accent };
  }
  if (typeof value?.preset === "string" && Object.hasOwn(presets, value.preset)) {
    return { ...presets[value.preset], preset: value.preset };
  }
  return { ...defaultTheme };
}

export function readTheme() {
  try {
    return normalize(JSON.parse(Services.prefs.getStringPref(themePref, "{}")));
  } catch {
    return { ...defaultTheme };
  }
}

export function saveTheme(theme) {
  const next = normalize(theme);
  Services.prefs.setStringPref(themePref, JSON.stringify(next));
  return next;
}

function luminance(color) {
  return [1, 3, 5].reduce((total, index, channel) => {
    const value = parseInt(color.slice(index, index + 2), 16) / 255;
    const linear = value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    return total + [.2126, .7152, .0722][channel] * linear;
  }, 0);
}

function readable(color) {
  return luminance(color) > .179 ? "#000000" : "#ffffff";
}

export function applyTheme(document, theme) {
  const { preset, mode, background, accent } = normalize(theme);
  const root = document.documentElement;
  root.setAttribute("data-rico-theme", preset);
  root.setAttribute("data-rico-scheme", mode);
  root.style.setProperty("--rico-base", background);
  root.style.setProperty("--rico-tone", accent);
  root.style.setProperty("--rico-ink", readable(background));
  root.style.setProperty("--rico-on-tone", readable(accent));
}
