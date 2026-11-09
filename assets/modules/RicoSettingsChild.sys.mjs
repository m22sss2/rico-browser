import { applyTheme, prelaunchPref, presets, readTheme, saveTheme, themePref } from "resource://rico/RicoTheme.sys.mjs";

const html = "http://www.w3.org/1999/xhtml";

function addControls(document, pane) {
  const make = (tag, attributes = {}, text = "") => {
    const node = document.createElementNS(html, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text) node.textContent = text;
    return node;
  };
  const section = make("section", { id: "rico-appearance", "data-category": "paneAppearance", "aria-labelledby": "rico-appearance-title" });
  section.append(make("h2", { id: "rico-appearance-title" }, "Personnaliser Rico"));
  section.append(make("p", {}, "Les couleurs s’appliquent à la barre d’outils, aux paramètres et à la page d’accueil."));
  const controls = make("div", { class: "rico-appearance-controls" });
  const labeled = (caption, control) => {
    const label = make("label", { for: control.id }, caption);
    label.append(control);
    controls.append(label);
    return label;
  };
  const choice = make("select", { id: "rico-theme-choice" });
  for (const [value, label] of Object.entries({
    rico: "Rico violet", light: "Clair", midnight: "Sombre", ocean: "Océan", forest: "Forêt", custom: "Personnalisé",
  })) choice.append(make("option", { value }, label));
  labeled("Thème", choice);
  const mode = make("select", { id: "rico-theme-mode" });
  mode.append(make("option", { value: "dark" }, "Sombre"), make("option", { value: "light" }, "Clair"));
  const modeLabel = labeled("Mode des menus", mode);
  const background = make("input", { id: "rico-theme-background", type: "color" });
  const backgroundLabel = labeled("Couleur de fond", background);
  const accent = make("input", { id: "rico-theme-accent", type: "color" });
  const accentLabel = labeled("Couleur d’accent", accent);
  section.append(controls);

  const memory = make("input", { id: "rico-memory-saving", type: "checkbox" });
  memory.checked = !Services.prefs.getBoolPref(prelaunchPref, true);
  const memoryLabel = make("label", { class: "rico-memory-row" });
  memoryLabel.append(memory, make("span", {}, "Économie de mémoire"));
  section.append(memoryLabel, make("p", {}, "Évite de démarrer des processus web à l’avance. La première ouverture d’un site peut être un peu plus lente."));
  memory.addEventListener("change", () => Services.prefs.setBoolPref(prelaunchPref, !memory.checked));

  const refresh = () => {
    const theme = readTheme();
    applyTheme(document, theme);
    choice.value = theme.preset;
    mode.value = theme.mode;
    background.value = theme.background;
    accent.value = theme.accent;
    for (const label of [modeLabel, backgroundLabel, accentLabel]) label.hidden = theme.preset !== "custom";
  };
  const persistCustom = () => saveTheme({
    preset: "custom", mode: mode.value, background: background.value, accent: accent.value,
  });
  choice.addEventListener("change", () => {
    if (choice.value === "custom") persistCustom();
    else if (Object.hasOwn(presets, choice.value)) saveTheme({ preset: choice.value });
  });
  for (const control of [mode, background, accent]) control.addEventListener("change", persistCustom);
  const updateVisibility = () => {
    section.hidden = document.location.hash !== "#appearance";
  };
  document.defaultView.addEventListener("hashchange", updateVisibility);
  Services.prefs.addObserver(themePref, refresh);
  document.defaultView.addEventListener("pagehide", () => {
    Services.prefs.removeObserver(themePref, refresh);
    document.defaultView.removeEventListener("hashchange", updateVisibility);
    section.remove();
  }, { once: true });
  pane.prepend(section);
  refresh();
  updateVisibility();
}

export class RicoSettingsChild extends JSWindowActorChild {
  handleEvent() {
    const document = this.document;
    if (document.documentURI.split(/[?#]/)[0] !== "about:preferences" ||
        !document.nodePrincipal.isSystemPrincipal) return;

    const pane = document.getElementById("mainPrefPane");
    if (pane && !document.getElementById("rico-appearance")) addControls(document, pane);

    const logoUrl = "resource://rico-assets/rico.svg";
    const brand = () => {
      const nav = document.getElementById("categories");
      const logo = nav?.openOrClosedShadowRoot?.querySelector(".logo");
      if (logo) {
        logo.style.setProperty("background-image", `url("${logoUrl}")`, "important");
      }
      const about = document.getElementById("category-about-firefox");
      if (about) about.setAttribute("iconsrc", logoUrl);
    };
    brand();
    // Settings sections are populated after the main document has loaded.
    const observer = new this.contentWindow.MutationObserver(brand);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    this.contentWindow.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  }
}
