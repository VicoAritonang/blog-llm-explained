// Maintenance helper: wrap known presentation strings without touching IDs,
// model equations, object keys, imports, or types. Translations remain explicit.
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import dictionary from "../src/i18n/en.mjs";
const folders = [
  "app",
  "content",
  "inspector",
  "stations",
  "scene",
  "store",
  "simulation",
];
for (const folder of folders)
  for (const name of fs.readdirSync(`src/${folder}`)) {
    if (!/\.(tsx?|mjs)$/.test(name)) continue;
    const file = `src/${folder}/${name}`,
      input = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
        file,
        input,
        ts.ScriptTarget.Latest,
        true,
        name.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      ),
      edits = [];
    const known = (value) =>
      dictionary[value] !== undefined && dictionary[value] !== value;
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === "t")
        return;
      if (ts.isTemplateExpression(node)) {
        const key =
          node.head.text +
          node.templateSpans.map((s, i) => `{${i}}` + s.literal.text).join("");
        if (known(key)) {
          edits.push([
            node.getStart(source),
            node.end,
            `t(${JSON.stringify(key)}, ${node.templateSpans.map((s) => s.expression.getText(source)).join(", ")})`,
          ]);
          return;
        }
      }
      if (ts.isJsxText(node)) {
        const key = node.text.replace(/\s+/g, " ").trim();
        if (known(key))
          edits.push([node.pos, node.end, `{t(${JSON.stringify(key)})}`]);
        return;
      }
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)
      ) {
        const parent = node.parent;
        if (
          known(node.text) &&
          !ts.isLiteralTypeNode(parent) &&
          !(parent.name === node) &&
          !ts.isImportDeclaration(parent) &&
          !ts.isExportDeclaration(parent)
        ) {
          const replacement = `t(${JSON.stringify(node.text)})`;
          edits.push([
            node.getStart(source),
            node.end,
            ts.isJsxAttribute(parent) ? `{${replacement}}` : replacement,
          ]);
          return;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    if (!edits.length) continue;
    let output = input;
    for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
      output = output.slice(0, start) + replacement + output.slice(end);
    if (
      !/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*["'][^"']*i18n\/core\.mjs/.test(
        input,
      )
    )
      output =
        `import { t } from "${path.relative(path.dirname(file), "src/i18n/core.mjs").replaceAll("\\", "/")}";\n` +
        output;
    fs.writeFileSync(file, output);
    console.log(`${file}: ${edits.length} presentation strings`);
  }
