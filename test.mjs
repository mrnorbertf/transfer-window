import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { render } from "@hyper-elements/react";
import { design } from "./design.mjs";

const fixture = JSON.parse(await readFile(new URL("./notice.json", import.meta.url)));
test("a changed route and an extra boarding point reach all passenger formats", async () => {
  const changed = structuredClone(fixture);
  changed.replacement.line = "17X";
  changed.stops.push({ name: "Shipyard", boarding: "Bay Z · north gate" });
  for (const format of ["email", "page", "poster"]) {
    const { html, text } = await render(design(changed, format));
    assert.match(html, /Take bus 17X/i);
    assert.match(html, /Bay Z · north gate/);
    assert.match(html, /Dock Street and Shipyard/);
    assert.doesNotMatch(html, /04B/);
    if (format === "email") assert.match(text, /Bay Z · north gate/);
    else assert.match(html, /aria-label="Bus diversion calling at Dock Street, Kiln Market, Glassworks, Shipyard"/);
  }
});
test("missing boarding instructions prevent rendering", () => {
  const changed = { ...fixture, stops: [{ name: "One" }, { name: "Two" }] };
  assert.throws(() => design(changed, "page"), /boarding point/);
});

test("a metro replacement uses ferry wording throughout all outputs", async () => {
  const harbour = JSON.parse(await readFile(new URL("./examples/harbour.json", import.meta.url)));
  for (const format of ["email", "page", "poster"]) {
    const { html, text } = await render(design(harbour, format));
    assert.match(html, /Harbour Metro/i);
    assert.match(html, /Take ferry F2/i);
    assert.match(html, /Pier 2/);
    assert.match(html, /Pier 1/);
    assert.doesNotMatch(html, /\b(bus|tram)\b/i);
    if (format === "email") {
      assert.match(html, /Take ferry F2 between North Quay and South Bank/);
      assert.match(text, /TAKE FERRY F2/i);
    } else {
      assert.match(html, /aria-label="Ferry diversion calling at North Quay, South Bank"/);
    }
  }
});
test("original bus-only records still render the same notice", async () => {
  const { replacement, ...record } = fixture;
  const legacy = { ...record, bus: replacement.line };
  for (const format of ["email", "page", "poster"]) {
    assert.equal((await render(design(fixture, format))).html, (await render(design(legacy, format))).html);
  }
});
