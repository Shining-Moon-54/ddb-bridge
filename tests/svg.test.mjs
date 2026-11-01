import test from "node:test";
import assert from "node:assert/strict";
import { mediaType } from "../scripts/core/media.js";
import { validateSvg } from "../scripts/core/svg.js";
import { LIMITS } from "../scripts/core/constants.js";
import { utf8 } from "../scripts/core/util.js";
import { runtime, svg } from "./helpers.mjs";

const wrap = content => `<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`;

test("static SVG graphics, gradients and inert editor metadata retain their bytes", () => {
  runtime();
  for (const bytes of [svg, utf8('<?xml version="1.0" encoding="UTF-8"?>' + wrap('<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="20" height="20" style="fill:url(#g);stroke:#000;stroke-width:1"/>')),
    utf8('<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" inkscape:export-filename="C:\\art\\tile.png"><metadata><inkscape:page x="0" y="0"/></metadata><path d="M0 0H10V10Z"/></svg>')]) {
    const before = bytes.slice(); assert.equal(mediaType(bytes, "icons/test.svg"), "image/svg+xml");
    assert.equal(validateSvg(bytes), bytes); assert.deepEqual(bytes, before);
  }
});

test("static SVG inline geometry, sizing and touch styles retain their bytes", () => {
  runtime();
  const styles = [
    "touch-action:none", "touch-action:pan-x pan-y pinch-zoom", " TOUCH-ACTION : manipulation !important ; ",
    "height:100%;width:100%;min-height:1px;max-height:512px;min-width:1px;max-width:512px",
    "x:2px;y:3px;cx:10px;cy:10px;r:8px;rx:2px;ry:3px"
  ];
  for (const style of styles) {
    const bytes = utf8(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style="${style}"><rect width="20" height="20" style="${style}"/></svg>`);
    const before = bytes.slice();
    assert.equal(mediaType(bytes, "icons/test.svg"), "image/svg+xml");
    assert.deepEqual(bytes, before);
  }
});

test("new SVG style properties still reject external, active and unsupported CSS", () => {
  runtime();
  for (const style of ["height:url(https://example.invalid/a.svg)", "width:expression(alert(1))",
    "touch-action:attr(data-touch)", "height:u\\72l(#g)", "width:/* bypass */100%",
    "touch-action:none;behavior:url(#g)", "height:100%;--resource:url(#g)", "animation:spin 1s infinite"]) {
    assert.throws(() => mediaType(utf8(wrap(`<path style="${style}"/>`)), "test.svg"), /SVG/);
  }
});

test("SVG active content, resource loads, CSS bypasses and XML directives are refused", () => {
  runtime();
  const cases = [
    wrap('<script>alert(1)</script>'), wrap('<g onload="alert(1)"/>'),
    wrap('<script xmlns="http://www.inkscape.org/namespaces/inkscape">alert(1)</script>'),
    wrap('<desc><img xmlns="http://www.inkscape.org/namespaces/inkscape" src="https://example.invalid/a.png"/></desc>'),
    wrap('<g xmlns:x="urn:test" x:onload="alert(1)"/>'), wrap('<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">HTML</div></foreignObject>'),
    wrap('<animate attributeName="href" values="javascript:alert(1)"/>'), wrap('<set attributeName="onload" to="alert(1)"/>'),
    wrap('<use href="#shape"/>'), wrap('<image href="https://example.invalid/image.png"/>'),
    wrap('<style>path{fill:red}</style>'), wrap('<path style="background-image:image-set(\'https://example.invalid/a.png\' 1x)"/>'),
    wrap('<path fill="url(https://example.invalid/a.svg#g)"/>'), wrap('<path style="fill:u\\72l(https://example.invalid/a.svg#g)"/>'),
    wrap('<path style="fill:url(/* bypass */#g)"/>'), wrap('<path style="fill:attr(data-url url)"/>'),
    wrap('<textPath href="&#106;avascript:alert(1)"/>'), wrap('<linearGradient xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://example.invalid/g"/>'),
    '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://example.invalid/"><textPath href="#g"/></svg>',
    wrap('<x:svg xmlns:x="http://www.w3.org/1999/xhtml"/>'),
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///private">]>' + wrap('<text>&x;</text>'),
    '<?xml-stylesheet href="https://example.invalid/x.css"?>' + wrap('<path/>')
  ];
  for (const source of cases) assert.throws(() => mediaType(utf8(source), "test.svg"), /SVG/);
});

test("non-SVG, malformed XML, invalid namespaces and invalid UTF-8 are refused", () => {
  runtime();
  for (const source of ["not an image", "<html/>", "<svg/>", wrap("<g></path>"), wrap('<path id="a" id="b"/>'), '<svg xmlns="http://www.w3.org/2000/svg">']) {
    assert.throws(() => mediaType(utf8(source), "test.svg"), /SVG/);
  }
  assert.throws(() => validateSvg(new Uint8Array([0xff, 0xfe, 0x00])), /UTF-8/);
});

test("SVG byte, node, attribute and nesting limits apply before display", () => {
  runtime();
  assert.throws(() => validateSvg(new Uint8Array(LIMITS.svg + 1)), /2 MiB/);
  assert.throws(() => validateSvg(utf8(wrap("<path/>".repeat(10000)))), /viele Elemente/);
  assert.throws(() => validateSvg(utf8(wrap("<g>".repeat(81) + "</g>".repeat(81)))), /verschachtelt/);
  assert.throws(() => validateSvg(utf8(wrap(`<path ${Array.from({ length: 101 }, (_, i) => `a${i}="1"`).join(" ")}/>`))), /viele Attribute/);
});
