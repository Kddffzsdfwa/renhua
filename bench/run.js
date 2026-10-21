// 跑 bench/ 里的改前改后对照：node bench/run.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check } from "../check.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const names = { "1-xhs": "小红书笔记（例 1）", "2-article": "公众号段落（例 2）", "3-comfort": "安慰回复（例 4）", "4-moments": "朋友圈", "5-email": "请假邮件" };
const rows = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith("-before.txt")).sort()) {
  const key = f.replace("-before.txt", "");
  const before = check(fs.readFileSync(path.join(dir, f), "utf8"));
  const after = check(fs.readFileSync(path.join(dir, `${key}-after.txt`), "utf8"));
  const n = (r) => r.hits.reduce((t, h) => t + h.count, 0);
  rows.push(`| ${names[key] ?? key} | ${before.chars} → ${after.chars} | ${before.score} | ${after.score} | ${n(before)} → ${n(after)} | ${after.hits.map((h) => `${h.name}×${h.count}`).join("、") || "无"} |`);
}
console.log("| 样本 | 字数 | 改前分 | 改后分 | 命中处数 | 改后还剩 |");
console.log("|---|---|---|---|---|---|");
console.log(rows.join("\n"));

// 对照：2022 年以前的真人文字，应该接近 0 分
console.log("\n| 真人对照 | 字数 | 分数 |\n|---|---|---|");
for (const f of fs.readdirSync(path.join(dir, "human")).sort()) {
  const r = check(fs.readFileSync(path.join(dir, "human", f), "utf8"));
  console.log(`| ${f.replace(".txt", "")} | ${r.chars} | ${r.score} |`);
}
