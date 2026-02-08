import { w as bind_props } from "../../chunks/index.js";
import { l as escape_html } from "../../chunks/context.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let data = $$props["data"];
    $$renderer2.push(`<h1>SvelteKit on Stacktape</h1> <p>Server-rendered at ${escape_html(data.timestamp)}</p>`);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
