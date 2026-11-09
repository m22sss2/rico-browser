export class RicoSettingsChild extends JSWindowActorChild {
  handleEvent() {
    const document = this.document;
    if (document.documentURI.split(/[?#]/)[0] !== "about:preferences") return;

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
