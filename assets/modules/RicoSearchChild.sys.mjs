export class RicoSearchChild extends JSWindowActorChild {
  #timer;
  #engine;

  handleEvent(event) {
    if (event.type === "pageshow") {
      const form = this.document.getElementById("rico-search");
      if (form) {
        form.addEventListener("submit", this);
        this.#refresh();
      }
    } else if (event.type === "pagehide") {
      this.document.getElementById("rico-search")?.removeEventListener("submit", this);
      this.#stop();
    } else if (event.type === "submit" && event.isTrusted) {
      event.preventDefault();
      const query = event.currentTarget.querySelector('input[name="q"]').value;
      this.sendQuery("RicoSearch:Submit", { query }).catch(() => {});
    }
  }

  didDestroy() {
    this.#stop();
  }

  #stop() {
    if (this.#timer !== undefined) {
      this.contentWindow?.clearInterval(this.#timer);
      this.#timer = undefined;
    }
  }

  #refresh() {
    const update = async () => {
      if (this.document?.visibilityState !== "visible") {
        return;
      }
      const engine = await this.sendQuery("RicoSearch:Engine").catch(() => null);
      if (!engine || engine === this.#engine || !this.document) {
        return;
      }
      const input = this.document.querySelector('#rico-search input[name="q"]');
      const intro = this.document.getElementById("search-intro");
      if (!input || !intro) {
        return;
      }
      this.#engine = engine;
      input.placeholder = `Rechercher avec ${engine}…`;
      input.setAttribute("aria-label", `Rechercher avec ${engine}`);
      intro.textContent = `Cherche sur le Web avec ${engine}.`;
    };
    this.#stop();
    update();
    this.#timer = this.contentWindow.setInterval(update, 400);
  }
}
