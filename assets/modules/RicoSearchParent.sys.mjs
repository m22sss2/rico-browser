import { SearchService } from "moz-src:///toolkit/components/search/SearchService.sys.mjs";
import { PrivateBrowsingUtils } from "resource://gre/modules/PrivateBrowsingUtils.sys.mjs";
import { readTheme, themePref } from "resource://rico/RicoTheme.sys.mjs";

const appRoot = Services.dirsvc.get("GreD", Ci.nsIFile).parent;
appRoot.append("assets");
appRoot.append("home.html");
const homeURL = Services.io.newFileURI(appRoot).spec;
const notifications = ["browser-search-engine-modified", "urlbar-searchmodechanged"];

export class RicoSearchParent extends JSWindowActorParent {
  #listening = false;
  #onStateChange = () => this.#publish().catch(Cu.reportError);

  #homeBrowser() {
    const context = this.browsingContext;
    const browser = context.embedderElement;
    if (context !== context.top || !browser ||
        context.currentWindowGlobal !== this.manager ||
        this.manager.documentURI.spec !== homeURL) {
      return null;
    }
    return browser;
  }

  async #searchContext(browser) {
    await SearchService.init();
    const window = browser.ownerDocument.defaultView;
    if (!window?.gBrowser) {
      return null;
    }
    const mode = window.gBrowser.selectedBrowser === browser
      ? window.gURLBar.searchMode
      : null;
    const temporaryEngine = !mode?.isPreview && mode?.engineName
      ? SearchService.getEngineByName(mode.engineName)
      : null;
    const engine = temporaryEngine || (PrivateBrowsingUtils.isBrowserPrivate(browser)
      ? await SearchService.getDefaultPrivate()
      : await SearchService.getDefault());
    return { window, engine, temporaryEngine };
  }

  #listen(active) {
    if (this.#listening === active) return;
    this.#listening = active;
    if (active) {
      for (const topic of notifications) Services.obs.addObserver(this.#onStateChange, topic);
      Services.prefs.addObserver(themePref, this.#onStateChange);
    } else {
      for (const topic of notifications) Services.obs.removeObserver(this.#onStateChange, topic);
      Services.prefs.removeObserver(themePref, this.#onStateChange);
    }
  }

  didDestroy() {
    this.#listen(false);
  }

  async #publish() {
    const browser = this.#homeBrowser();
    if (!browser || !this.#listening) return;
    const context = await this.#searchContext(browser);
    if (this.#listening && this.#homeBrowser() === browser) {
      this.sendAsyncMessage("RicoSearch:State", { engine: context?.engine?.name, theme: readTheme() });
    }
  }

  async receiveMessage({ name, data }) {
    if (name === "RicoSearch:Visible" && data === false) {
      this.#listen(false);
      return null;
    }
    const browser = this.#homeBrowser();
    if (!browser) return null;
    if (name === "RicoSearch:Visible") {
      this.#listen(data === true);
      if (this.#listening) await this.#publish();
      return null;
    }
    if (name !== "RicoSearch:Submit" || typeof data?.query !== "string" ||
        !data.query.trim()) {
      return null;
    }
    const search = await this.#searchContext(browser);
    if (!search?.engine || this.#homeBrowser() !== browser) return null;
    const { window, engine, temporaryEngine } = search;
    const submission = engine.getSubmission(data.query.trim(), "");
    if (!submission?.uri || !["http", "https"].includes(submission.uri.scheme)) {
      return null;
    }

    if (temporaryEngine && window.gBrowser.selectedBrowser === browser) {
      window.gURLBar.searchMode = null;
    }
    browser.loadURI(submission.uri, {
      postData: submission.postData,
      triggeringPrincipal: this.manager.documentPrincipal,
    });
    return true;
  }
}
