export class RicoSettingsChild extends JSWindowActorChild {
  handleEvent() {
    const document = this.document;
    if (document.documentURI.split(/[?#]/)[0] !== "about:preferences") return;

    const logoUrl = "resource://rico-assets/rico.svg";
    const mascotUrl = "resource://rico-assets/rico-cat.svg";
    const brand = () => {
      const nav = document.getElementById("categories");
      const logo = nav?.openOrClosedShadowRoot?.querySelector(".logo");
      if (logo) {
        logo.style.setProperty("background-image", `url("${logoUrl}")`, "important");
      }
      const about = document.getElementById("category-about-firefox");
      if (about) {
        about.setAttribute("iconsrc", logoUrl);
        if (about.textContent.includes("Firefox")) {
          about.removeAttribute("data-l10n-id");
          about.textContent = about.textContent.replace("Firefox", "Rico Browser");
        }
      }
      for (const id of ["isDefaultPane", "isNotDefaultPane"]) {
        for (const promo of document.querySelectorAll(`[id="${id}"]`)) {
          promo.setAttribute("imagesrc", mascotUrl);
          const message = promo.getAttribute("message");
          if (message?.includes("Firefox")) {
            promo.removeAttribute("data-l10n-id");
            promo.setAttribute("message", message.replace("Firefox", "Rico Browser"));
          }
        }
      }
    };
    brand();
    // Settings sections are populated after the main document has loaded.
    const observer = new this.contentWindow.MutationObserver(brand);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    this.contentWindow.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  }
}
