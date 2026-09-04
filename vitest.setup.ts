import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * `server-only` (lib/auth/*, lib/db/client.ts) throws unconditionally when
 * imported outside Next's own build: the package relies on Next's
 * webpack/Turbopack config aliasing it per bundle target (a no-op on the
 * server, a throwing stub on the client), and Vitest runs neither bundle —
 * it is plain Node/jsdom importing the raw npm package, which always throws.
 * The gap is the test runner's, not the product's, so it is stubbed to a
 * no-op here rather than removing the guard from production code.
 */
vi.mock("server-only", () => ({}));

/**
 * jsdom implements `<dialog>` as an element but not its methods: `showModal`,
 * `show` and `close` are all missing, and calling one throws
 * "el.showModal is not a function".
 *
 * The gap is jsdom's, not the product's — MDN records `<dialog>` as Baseline
 * widely available since March 2022, which is why components/ui/dialog.tsx uses
 * it instead of shipping a Radix modal to polyfill the platform. Guarding the
 * component against a missing method would be letting the test environment
 * shape production code, so the environment is patched instead.
 *
 * This stub only tracks the `open` property. It does NOT reproduce focus
 * trapping, Escape-to-close or the inert backdrop — those are the browser's
 * behaviours, and a test asserting them here would be asserting against this
 * file rather than against a browser.
 */
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function show() {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }
}
