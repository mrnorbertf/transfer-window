import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { render, validate, formatDiagnostics } from "@hyper-elements/react";
import { design } from "./design.mjs";

const notice = JSON.parse(await readFile(process.argv[2] || new URL("./notice.json", import.meta.url), "utf8"));
const outputs = [];
for (const format of ["page", "email", "poster"]) {
  const template = design(notice, format);
  const check = validate(template);
  if (!check.valid) throw Error(formatDiagnostics(check.diagnostics));
  const result = await render(template);
  outputs.push([format + ".html", result.html]);
  if (format === "email") outputs.push(["email.txt", result.text]);
}
const destination = process.argv[3] || "out";
await mkdir(destination, { recursive: true });
for (const [name, body] of outputs) await writeFile(join(destination, name), body);
