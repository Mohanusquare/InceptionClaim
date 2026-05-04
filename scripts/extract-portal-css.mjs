import fs from "fs";

const htmlPath = new URL("../../inception2-claim-portal/index.html", import.meta.url);
const outPath = new URL("../app/portal-parity.css", import.meta.url);

const s = fs.readFileSync(htmlPath, "utf8");
const start = s.indexOf("<style>") + 7;
const end = s.indexOf("</style>");
let css = s.slice(start, end);

css = css.split('url("inception_background.png")').join('url("/inception_background.png")');
css = css.split('font-family: "Geist",').join('font-family: var(--font-geist-sans), "Geist",');
css = css.split('font-family: "Geist Mono"').join('font-family: var(--font-geist-mono), "Geist Mono"');
css = css.split('font-family: "Italiana", serif').join('font-family: var(--font-italiana), "Italiana", serif');
css = css.replace("html, body {", "html, body {\n    color-scheme: light;");

fs.writeFileSync(outPath, css.trim() + "\n");
console.log("Wrote", outPath.pathname, css.length);
