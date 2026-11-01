import { LIMITS } from "./constants.js";
import { assert } from "./util.js";

const SVG = "http://www.w3.org/2000/svg";
const XMLNS = "http://www.w3.org/2000/xmlns/";
const XML = "http://www.w3.org/XML/1998/namespace";
const ELEMENTS = new Set(("svg g path rect circle ellipse line polyline polygon defs symbol marker clipPath mask pattern " +
  "linearGradient radialGradient stop title desc metadata text tspan textPath filter feBlend feColorMatrix " +
  "feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow " +
  "feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feMerge feMergeNode feMorphology feOffset fePointLight " +
  "feSpecularLighting feSpotLight feTile feTurbulence").split(" "));
const METADATA = new Set([
  "http://www.inkscape.org/namespaces/inkscape", "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#", "http://purl.org/dc/elements/1.1/", "http://creativecommons.org/ns#"
]);
const ACTIVE = new Set(("script style foreignobject a image use animate animatemotion animatetransform set " +
  "iframe object embed img audio video source track link meta base form input button").split(" "));
const STYLE = new Set(("fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin " +
  "stroke-miterlimit stroke-dasharray stroke-dashoffset opacity color display visibility transform transform-origin " +
  "clip-path clip-rule mask filter vector-effect paint-order stop-color stop-opacity flood-color flood-opacity " +
  "color-interpolation color-interpolation-filters font-family font-size font-style font-weight text-anchor " +
  "dominant-baseline letter-spacing word-spacing isolation mix-blend-mode " +
  "width height min-width min-height max-width max-height x y cx cy r rx ry touch-action").split(" "));

function passiveValue(value) {
  assert(!/[\\@]|\/\*|(?:javascript|vbscript|data|https?|file)\s*:|(?:expression|attr)\s*\(/i.test(value),
    "SVG enthält aktive, externe oder nicht unterstützte Stilwerte.");
  const remainder = value.replace(/url\s*\(([^)]*)\)/gi, (_match, target) => {
    assert(/^(['"]?)#[a-z0-9_.:-]+\1$/i.test(target.trim()), "SVG enthält einen externen Ressourcenverweis.");
    return "";
  });
  assert(!/url\s*\(/i.test(remainder), "SVG enthält einen ungültigen Ressourcenverweis.");
}

// Validate a bounded, static SVG profile without inserting it into the page.
// Accepted bytes stay unchanged; this is rejection, not an SVG sanitizer.
export function validateSvg(bytes) {
  assert(bytes.byteLength <= LIMITS.svg, "SVG überschreitet das Größenlimit von 2 MiB.");
  let source;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("SVG muss gültiges UTF-8 enthalten."); }
  assert(!/<!DOCTYPE|<!ENTITY/i.test(source) && !/<\?/.test(source.replace(/^\s*<\?xml\s+[^?]*\?>/, "")),
    "SVG mit DTD, Entitäten oder Verarbeitungsanweisungen wird nicht übernommen.");
  assert(typeof globalThis.DOMParser === "function", "SVG-Prüfung ist in diesem Browser nicht verfügbar.");
  let doc;
  try { doc = new DOMParser().parseFromString(source, "image/svg+xml"); }
  catch { throw new Error("SVG ist kein wohlgeformtes XML."); }
  assert(doc?.documentElement?.localName === "svg" && doc.documentElement.namespaceURI === SVG &&
    !doc.getElementsByTagName("parsererror").length && !doc.doctype, "SVG ist kein wohlgeformtes SVG-XML.");
  const elements = Array.from(doc.getElementsByTagName("*"));
  assert(elements.length <= 10000, "SVG enthält zu viele Elemente.");
  for (const element of elements) {
    let depth = 0;
    for (let parent = element.parentNode; parent; parent = parent.parentNode) depth++;
    assert(depth <= LIMITS.depth, "SVG ist zu tief verschachtelt.");
    const svg = element.namespaceURI === SVG;
    assert(!ACTIVE.has(element.localName.toLowerCase()) && (svg ? ELEMENTS.has(element.localName) : METADATA.has(element.namespaceURI)),
      `SVG-Element wird nicht unterstützt: ${element.localName}`);
    const attributes = Array.from(element.attributes);
    assert(attributes.length <= 100, "SVG-Element enthält zu viele Attribute.");
    for (const attribute of attributes) {
      const name = (attribute.localName || attribute.name).toLowerCase();
      if (attribute.namespaceURI === XMLNS || attribute.name === "xmlns") continue;
      assert(!name.startsWith("on") && !(attribute.namespaceURI === XML && name === "base"),
        "SVG enthält Ereignisbehandlung oder einen veränderten Ressourcenursprung.");
      if (name === "href") assert(/^#[a-z0-9_.:-]+$/i.test(attribute.value), "SVG enthält einen externen Ressourcenverweis.");
      if ((svg && !METADATA.has(attribute.namespaceURI)) || name === "style") passiveValue(attribute.value);
      if (name === "style") for (const declaration of attribute.value.split(";").filter(part => part.trim())) {
        const colon = declaration.indexOf(":"), property = declaration.slice(0, colon).trim().toLowerCase();
        assert(colon > 0 && STYLE.has(property), `SVG-Stileigenschaft wird nicht unterstützt: ${property}`);
      }
    }
  }
  return bytes;
}
