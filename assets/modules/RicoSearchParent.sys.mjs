import { SearchService } from "moz-src:///toolkit/components/search/SearchService.sys.mjs";
import { PrivateBrowsingUtils } from "resource://gre/modules/PrivateBrowsingUtils.sys.mjs";

const appRoot = Services.dirsvc.get("GreD", Ci.nsIFile).parent;
appRoot.append("assets");
appRoot.append("home.html");
const homeURL = Services.io.newFileURI(appRoot).spec;

export class RicoSearchParent extends JSWindowActorParent {
  async receiveMessage({ name, data }) {
    const context = this.browsingContext;
    const browser = context.embedderElement;
    if (context !== context.top || !browser ||
        context.currentWindowGlobal !== this.manager ||
        this.manager.documentURI.spec !== homeURL) {
      return null;
    }

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
    if (!engine) {
      return null;
    }
    if (name === "RicoSearch:Engine") {
      return engine.name;
    }
    if (name !== "RicoSearch:Submit" || typeof data?.query !== "string" ||
        !data.query.trim() || context.currentWindowGlobal !== this.manager) {
      return null;
    }
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
