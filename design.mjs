import { createElement as h } from "react";
import {
  Circle, Column, Divider, Document, Email, Heading, Page, Path, Row, Svg, Text, defineTheme
} from "@hyper-elements/react";

const ink = "#142d30", paper = "#faf8ef", yellow = "#f4dc50", soft = "#e5ebdf", muted = "#455956";
const theme = defineTheme({
  colors: { background: paper, foreground: ink },
  fonts: { body: "Arial, Helvetica, sans-serif", heading: "Arial, Helvetica, sans-serif" }
});
const stack = (style, ...children) => h(Column, { style }, ...children);
const text = (value, style = {}) => h(Text, { style }, value);
const heading = (value, level, style = {}) => h(Heading, { level, style }, value);
const label = (value, color = muted) => text(value, { fontFamily: "Courier New, monospace", fontSize: 13, fontWeight: 700, letterSpacing: 1, color });
const path = (d, color) => h(Path, { d, style: { fill: "transparent", stroke: color, strokeWidth: 4 } });

function diagram(stops, mode) {
  // Nodes on the lifted section represent the boarding points for the replacement service.
  const start = 32, end = 202;
  const nodes = stops.map((stop, i) => h(Circle, {
    key: stop.name, cx: start + (end - start) * i / (stops.length - 1), cy: 16, r: 5,
    style: { fill: ink, stroke: yellow, strokeWidth: 3 }
  }));
  return h(Svg, { width: 236, height: 52, title: mode[0].toUpperCase() + mode.slice(1) + " diversion calling at " + stops.map(s => s.name).join(", ") },
    path("M0 40 H8 L32 16 H202 L226 40 H236", yellow), ...nodes);
}

function serviceNotice(n, format, replacement) {
  const { mode, line } = replacement;
  const print = format === "poster", email = format === "email";
  const pad = print ? 28 : email ? 24 : 36;
  const first = n.stops[0].name, last = n.stops.at(-1).name;
  const headlineSize = print ? 60 : email ? 42 : 64;
  const smallScreen = print ? {} : { mobile: { padding: 19 } };
  const band = (bg, gap, ...items) => stack({ padding: pad, gap, backgroundColor: bg, ...smallScreen }, ...items);
  const stopRows = n.stops.flatMap(s => [h(Divider, {style: {borderTop: { width: 1, style: "solid", color: "#a1b3a8" }}}), stack({
    padding: [5, 0], gap: 2
  }, text(s.name, { fontSize: print ? 20 : 21, fontWeight: 700 }), text(s.boarding, { fontSize: 16, color: muted }))]);
  const schedule = stack({ padding: [15, pad], gap: 4, backgroundColor: yellow, ...smallScreen },
    text(n.date + "   /   " + n.window, { fontSize: print ? 24 : 23, fontWeight: 700 }),
    text(n.frequency + "   ·   " + n.extra, { fontSize: 16 }));
  const headlineStyle = { fontSize: headlineSize, lineHeight: 1.04, color: paper,
    ...(print ? {} : { mobile: { fontSize: 41 } }) };
  const masthead = band(ink, print ? 7 : 12,
    label(n.operator.toUpperCase() + "   /   " + n.route.toUpperCase(), yellow),
    heading("Take " + mode + " " + line + ".", 1, headlineStyle),
    text("Between " + first + " and " + last + " in both directions.", { color: paper, fontSize: print ? 21 : 23 }),
    ...(!email ? [diagram(n.stops, mode)] : [])
  );
  const boarding = band(paper, print ? 6 : 9, label("REPLACEMENT " + mode.toUpperCase() + "  /  " + line),
    heading("Where to board", 2, { fontSize: print ? 29 : 32 }), ...stopRows);
  const detail = (title, value) => stack({ gap: 6 }, label(title), text(value, { fontSize: 16 }));
  const guidance = stack({ padding: [20, pad], backgroundColor: soft, ...smallScreen },
    h(Row, { style: { gap: 21 } }, detail("ACCESS", n.access), detail("TICKETS", n.fare)));
  const footer = stack({ padding: [16, pad], backgroundColor: paper, gap: 5, ...smallScreen },
    label(n.reason.toUpperCase() + "   /   " + n.reference),
    text("Updated " + n.updated + (n.sample ? "  ·  Fictional service notice" : ""), { fontSize: 13, color: muted }));
  return stack({ backgroundColor: paper }, masthead, schedule, boarding, guidance, footer);
}

export function design(n, format) {
  if (!["page", "email", "poster"].includes(format)) throw Error("Unknown output " + format);
  if (!Array.isArray(n.stops) || n.stops.length < 2) throw Error("At least two boarding stops required");
  for (const key of ["operator","route","date","window","frequency","extra","reason","access","fare","reference","updated"])
    if (typeof n[key] !== "string" || !n[key].trim()) throw Error("Missing notice field: " + key);
  for (const s of n.stops) if (!s?.name?.trim() || !s?.boarding?.trim()) throw Error("Each stop needs a name and boarding point");
  // Accept the original release's bus-only records as well.
  const replacement = n.replacement === undefined ? { mode: "bus", line: n.bus } : n.replacement;
  if (typeof replacement?.mode !== "string" || !replacement.mode.trim() ||
      typeof replacement?.line !== "string" || !replacement.line.trim()) {
    throw Error("A replacement needs its transport mode and line name");
  }
  const props = { lang: "en", title: n.route + " replacement service · " + n.date, theme };
  const content = serviceNotice(n, format, replacement);
  if (format === "email") return h(Email, { ...props, width: 610, previewText: n.window + " · Take " + replacement.mode + " " + replacement.line + " between " + n.stops[0].name + " and " + n.stops.at(-1).name + "." }, content);
  if (format === "poster") return h(Document, { ...props, size: "A4", margin: 20 }, h(Document.Page, {}, content));
  return h(Page, { ...props, width: 736, style: { backgroundColor: "#d8ded4" } }, content);
}
