#!/usr/bin/env node
// 人话 renhua 检测脚本：扫出中文 AI 腔，给一个 0–100 的分数（越高越像 AI）。
// 零依赖。用法：
//   node check.js 文件.txt
//   echo "要检查的文字" | node check.js
//   node check.js 文件.txt --json
// 只覆盖 SKILL.md 里能用规则匹配的部分；排比的意思、比喻贴不贴切这类判断还得靠人。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// weight：3 = 强信号（A 组、聊天机器人残留，看到一次就算），2 = 中，1 = 弱信号（要扎堆才说明问题）
const RULES = [
  { id: 1, name: "不是……而是……", weight: 3, patterns: [/不是[^。！？\n]{1,20}?而是/g, /不仅仅?是[^。！？\n]{1,20}?(?:更|还|也)是/g, /不仅[^。！？\n]{1,30}?更/g, /与其说[^。！？\n]{1,20}?不如说/g, /的本质是/g] },
  { id: 2, name: "金句收尾", weight: 3, patterns: [/这才是真正的/g, /故事才刚刚?开始/g, /一切才刚刚?开始/g, /答案，?就在其中/g, /这，?就是[^。！？\n]{0,10}的力量/g] },
  { id: 2, name: "短句排比", weight: 2, patterns: [/(?:^|[。！？\n])((?:[^。！？，\n]{1,6}。){3,})/g] },
  { id: 3, name: "假深刻", weight: 3, patterns: [/本质上/g, /归根结底/g, /说到底/g, /底层逻辑/g, /真正的问题是/g, /核心在于/g, /某种意义上/g] },
  { id: 4, name: "万能开头", weight: 3, patterns: [/在这个[^，。！？\n]{0,10}的时代/g, /随着[^，。！？\n]{0,15}的(?:快速|飞速|迅猛|高速)发展/g, /在[^，。！？\n]{1,12}的今天/g, /你是否也曾/g, /相信大家都不陌生/g, /今天(?:我们)?来聊聊/g, /话不多说/g, /直接上干货/g, /划重点/g] },
  { id: 5, name: "和空气辩论", weight: 3, patterns: [/很多人以为/g, /你可能会说/g, /需要说明的是/g, /值得注意的是/g, /不得不说/g, /当然，这并不是说/g] },
  { id: 6, name: "排比三连", weight: 2, patterns: [/(?:[一-龥]{2,4}、){2}[一-龥]{2,4}(?=[，。！？\n])/g] },
  { id: 8, name: "破折号", weight: 1, patterns: [/——/g] },
  { id: 8, name: "省略号过多", weight: 1, patterns: [/……/g], minCount: 3 },
  { id: 10, name: "分点符号、加粗", weight: 1, patterns: [/^\s*(?:[✦▶◆●■▪►✅☑️👉]|[0-9]️?⃣)/gmu, /\*\*[^*\n]+\*\*/g] },
  { id: 11, name: "emoji 堆砌", weight: 1, emoji: true },
  { id: 13, name: "AI 高频词", weight: 2, patterns: [/赋能|打造|助力|深耕|聚焦|抓手|闭环|赛道|生态|维度|格局|颠覆|重塑|破圈|全方位|多维度|极致|硬核|宝藏|干货满满|不可或缺|至关重要|显著提升|无缝衔接|一站式|沉浸式|浪潮|指数级/g] },
  { id: 14, name: "意义拔高", weight: 2, patterns: [/具有里程碑意义|里程碑|标志着|开启了新篇章|意义深远|影响深远|引发广泛关注|未来可期|任重道远|前景广阔|迈出了坚实的一步|一种生活态度|全新的发展阶段/g] },
  { id: 15, name: "宣传腔", weight: 2, patterns: [/令人惊叹|不容错过|必入|天花板|绝美|颜值爆表|一绝|良心推荐|闭眼入|坐落于|享有盛誉|心心念念/g] },
  { id: 16, name: "借权威", weight: 2, patterns: [/有研究表明|研究显示|专家指出|业内人士认为|据统计|数据显示|网友纷纷表示/g] },
  { id: 17, name: "书面腔", weight: 1, patterns: [/进行了|对[^，。！？\n]{1,8}进行|的过程中|作为一[个名]|致力于|旨在|从而|在此向/g] },
  { id: 18, name: "层层对冲", weight: 1, patterns: [/在一定程度上|某种程度上|相对而言|不排除[^，。！？\n]{0,8}可能/g] },
  { id: 19, name: "空泛感受", weight: 2, patterns: [/收获满满|受益匪浅|意义非凡|感触颇深|难忘的经历|成长了很多/g] },
  { id: 20, name: "万能结尾、客套", weight: 2, patterns: [/欢迎在评论区|记得点赞|点赞收藏关注|感谢阅读|希望对你有(?:所)?帮助|如有不足|非常抱歉打扰|宝贵的时间|致以诚挚的|感谢您的理解与支持/g] },
  { id: 21, name: "硬凹网感", weight: 1, patterns: [/家人们谁懂|绝绝子|yyds|狠狠拿捏|宝子们/gi] },
  { id: 22, name: "反复安慰", weight: 2, patterns: [/别担心|你已经做得很好|做得很好了|真的很正常|很多人都会这样|我完全理解你的?感受|抱抱你/g], minCount: 2 },
  { id: 23, name: "括号动作", weight: 3, patterns: [/[（(](?:轻轻|笑|叹气|微笑|摸摸|拍拍|眨眼|抱抱|点头|挠头)[^）)\n]{0,12}[）)]/g] },
  { id: 24, name: "比喻意象堆砌", weight: 1, patterns: [/灯塔|星辰大海|黑夜里的光|彩虹/g] },
  { id: 25, name: "聊天机器人话术", weight: 3, patterns: [/好的！|当然可以！|这是一个很好的问题|以下是[^。！？\n]{0,20}[：:]|如果你需要，?我可以|还有什么可以帮你|作为一个\s?AI|如有需要可以随时问我/g] },
  { id: 26, name: "知识截止和猜测", weight: 3, patterns: [/截至我的知识|根据现有公开资料|目前尚无公开报道|据推测/g] },
  { id: 27, name: "套路动作", weight: 1, patterns: [/看了一眼|停了一下|愣了一下|想了想|过了一会儿|一动不动|张了张嘴|很久/g], minCount: 3 },
  { id: 28, name: "网文套话", weight: 1, patterns: [/心提到了嗓子眼|空气仿佛凝固|那一刻|不知道为什么/g] },
];

const EMOJI = /\p{Extended_Pictographic}/gu;

// 一个 emoji 算一个字，汉字、字母、数字、标点都算，空白不算
const countChars = (text) => [...text.replace(/\s/g, "")].length;

function snippet(text, index, length) {
  const start = Math.max(0, index - 6);
  const end = Math.min(text.length, index + length + 6);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\n/g, " ") + (end < text.length ? "…" : "");
}

export function check(text) {
  const chars = countChars(text);
  const hits = [];
  for (const rule of RULES) {
    const found = [];
    if (rule.emoji) {
      const all = [...text.matchAll(EMOJI)];
      // 两三个 emoji 是正常的，超过每 100 字 2 个才算堆砌
      const allowed = Math.max(3, Math.floor(chars / 50));
      all.slice(allowed).forEach((m) => found.push({ match: m[0], at: snippet(text, m.index, m[0].length) }));
    } else {
      // 同一条规则里几个写法可能命中同一处，重叠的只算一次
      const spans = [];
      for (const re of rule.patterns) {
        for (const m of text.matchAll(re)) {
          const [s, e] = [m.index, m.index + m[0].length];
          if (spans.some(([a, b]) => s < b && e > a)) continue;
          spans.push([s, e]);
          found.push({ match: m[0].trim(), at: snippet(text, m.index, m[0].length) });
        }
      }
    }
    if (found.length && found.length >= (rule.minCount ?? 1)) hits.push({ id: rule.id, name: rule.name, weight: rule.weight, count: found.length, found });
  }
  const raw = hits.reduce((t, h) => t + h.weight * h.count, 0);
  // 按每千字算；太短的文字按 200 字算，免得一两句话就爆表
  const per1k = (raw * 1000) / Math.max(chars, 200);
  const score = Math.round(100 * (1 - Math.exp(-per1k / 40)));
  return { score, chars, weighted: raw, per1k: Math.round(per1k * 10) / 10, hits };
}

function label(score) {
  if (score >= 60) return "很像 AI";
  if (score >= 30) return "有明显 AI 腔";
  if (score >= 10) return "有一点";
  return "基本没有";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--"));
  const text = file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8");
  const result = check(text);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`AI 腔分数：${result.score}/100（${label(result.score)}）  ${result.chars} 字，加权命中 ${result.weighted}，每千字 ${result.per1k}`);
    if (!result.hits.length) console.log("没扫到规则能认出的 AI 腔。");
    for (const h of result.hits.sort((a, b) => b.weight * b.count - a.weight * a.count)) {
      console.log(`\n[第 ${h.id} 条] ${h.name} ×${h.count}${h.weight === 3 ? "（强信号）" : h.weight === 1 ? "（弱信号）" : ""}`);
      for (const f of h.found.slice(0, 5)) console.log(`  · ${f.at}`);
      if (h.found.length > 5) console.log(`  · 还有 ${h.found.length - 5} 处`);
    }
  }
}
