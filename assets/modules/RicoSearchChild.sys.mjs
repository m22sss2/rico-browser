import { applyTheme } from "resource://rico/RicoTheme.sys.mjs";

export class RicoSearchChild extends JSWindowActorChild {
  handleEvent(event) {
    const document = this.document;
    const form = document.getElementById("rico-search");
    if (event.type === "pageshow" && form) {
      form.addEventListener("submit", this);
      document.addEventListener("visibilitychange", this);
      this.sendAsyncMessage("RicoSearch:Visible", document.visibilityState === "visible");
    } else if (event.type === "pagehide") {
      form?.removeEventListener("submit", this);
      document.removeEventListener("visibilitychange", this);
      this.sendAsyncMessage("RicoSearch:Visible", false);
    } else if (event.type === "visibilitychange") {
      this.sendAsyncMessage("RicoSearch:Visible", document.visibilityState === "visible");
    } else if (event.type === "submit" && event.isTrusted) {
      event.preventDefault();
      const query = event.currentTarget.querySelector('input[name="q"]').value;
      this.sendQuery("RicoSearch:Submit", { query }).catch(Cu.reportError);
    }
  }

  receiveMessage({ name, data }) {
    if (name !== "RicoSearch:State") return;
    const document = this.document;
    if (data.theme) applyTheme(document, data.theme);
    const input = document.querySelector('#rico-search input[name="q"]');
    const intro = document.getElementById("search-intro");
    if (!data.engine || !input || !intro) return;
    input.placeholder = `Rechercher avec ${data.engine}…`;
    input.setAttribute("aria-label", `Rechercher avec ${data.engine}`);
    intro.textContent = `Cherche sur le Web avec ${data.engine}.`;
  }
}
