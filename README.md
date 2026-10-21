# 人话 renhua

**English:** Rewrite AI-sounding Chinese into Chinese a real person would write, without changing a single fact.

- 32 Chinese-specific AI writing patterns, ranked by strength (strong tells fixed on sight, weak ones only when they cluster)
- Keeps the warmth: de-AI should not mean cold, flat sentences
- Tone follows context: casual for social posts, plain and polite for emails and docs
- Optional voice profile (`me.md`) so rewrites sound like you, not just "less AI"
- [PROMPT.md](PROMPT.md): a plain prompt version for Doubao, DeepSeek, Kimi or ChatGPT
- `check.js`: a zero-dependency Node script that flags the rule-detectable patterns and scores a text 0–100 (`node check.js file.txt`)

Install: copy this folder to `~/.claude/skills/renhua/`, then ask Claude: "用 renhua 把这段改成人话：…". Structure and severity tiers are adapted from [humanizer](https://github.com/blader/humanizer) (MIT).

---

把一眼就是 AI 写的中文，改成真人会说的话。事实一个字不改。

适用于 Claude Code、Claude 桌面版等支持 Agent Skills 的工具。

## 它解决什么问题

AI 写的中文有一股味儿：

- 开头"在这个 XX 的时代"
- 中间"不是……而是……"
- 结尾"这才是真正的……"
- 满篇赋能、打造、底层逻辑、闭环
- 聊个天也要分成 1️⃣2️⃣3️⃣，每行一个 emoji

读者扫一眼就划走了。「人话」会找出这些 AI 腔，改成像真人在说话，同时保证：

- 数字、时间、人名、来源一个都不改
- 不编造细节，不替作者加观点

## 示例

**改前：**

> 在 AI 浪潮席卷全球的今天，内容创作的底层逻辑正在被深度重塑。借助 AI 赋能，个人创作者不仅能够实现效率的指数级提升，更能打造属于自己的内容生态闭环。

**改后：**

> 我现在写一篇帖子，大部分活是 AI 干的：它找资料、写初稿、查有没有说错，我最后改两句再发。

更多例子见 [examples.md](examples.md)。

## 检测脚本：先看看有多少 AI 腔

`check.js` 不用装任何东西，有 Node 18 以上就能跑：

```bash
node check.js 你的文字.txt
echo "在这个快节奏的时代……" | node check.js
node check.js 你的文字.txt --json
```

它按 SKILL.md 里能用规则认出来的那部分扫一遍：不是……而是……、金句收尾、假深刻、万能开头、和空气辩论、排比三连、破折号、分点符号和加粗、emoji 堆砌、AI 高频词、意义拔高、宣传腔、借权威、书面腔、客套、反复安慰、括号动作、聊天机器人话术、套路动作、网文套话等。强信号一处记 3 分，弱信号记 1 分，按每千字折算成 0–100 分，越高越像 AI。

输出长这样（例 1 的改前稿）：

```
AI 腔分数：71/100（很像 AI）  180 字，加权命中 10，每千字 50

[第 6 条] 排比三连 ×2
  · … AI 自己注册账号、自己发帖、自己赚钱。  于是我…
  · …一个房间。 它写代码、查规则、出方案，我做决定。…

[第 2 条] 金句收尾 ×1（强信号）
  · …人看见。  故事才刚开始。

[第 10 条] 分点符号、加粗 ×3（弱信号）
  · …我做决定。  ✦ 坏消息来得…
```

它能做的有限：排比是不是真有三点、比喻贴不贴切、改完有没有变冷，这些脚本判断不了，还得人看。分数低只说明没踩到这些规则，不等于"不像 AI"，也不是用来躲 AI 检测的。

## 实测

`bench/` 里放了 5 组真实的改前改后，都来自作者改小红书笔记和做示例图时的原稿，没有为测试另写。运行 `node bench/run.js` 可以复现：

| 样本 | 字数 | 改前分 | 改后分 | 命中处数 | 事实核对 |
|---|---|---|---|---|---|
| 小红书笔记（例 1） | 180 → 203 | 71 | 0 | 6 → 0 | 数字 0 粉、2 条、4 个浏览都在；丢了"9 月改规则""5 条路"两处信息 |
| 公众号段落（例 2） | 73 → 61 | 94 | 0 | 10 → 0 | 原文没有事实；"一小时、十分钟"是作者补充的 |
| 安慰回复（例 4） | 81 → 40 | 85 | 0 | 8 → 0 | 没有增减事实 |
| 朋友圈 | 43 → 26 | 71 | 0 | 4 → 0 | 骑小电驴、晒脱皮来自作者的原始要求 |
| 请假邮件 | 53 → 32 | 68 | 0 | 5 → 0 | 发烧、组会来自作者的原始要求 |

对照组是 2022 年以前的真人文字，用来看会不会误报：

| 真人对照 | 字数 | 分数 |
|---|---|---|
| 鲁迅《故乡》开头 | 106 | 0 |
| 朱自清《背影》开头 | 134 | 0 |

说实话，这组数据说明的东西有限：

- 样本只有 5 组，而且都是短文。
- 写规则时这些样本就摆在眼前，算不上独立测试。只对这几篇管用的写法已经删掉了，但偏向肯定还有。
- 改后全是 0 分，说明改稿把规则能认出的毛病都去掉了，不说明改后的文字好。例 1 就丢了两处信息，脚本发现不了，是人工核对出来的。

欢迎提交你自己的改前改后，样本多了数据才有意义。

## 在豆包、DeepSeek 里用

不用 Claude 也行。打开 [PROMPT.md](PROMPT.md)，把里面那段提示词复制给豆包、DeepSeek、Kimi、ChatGPT，再贴上要改的文字。豆包可以建一个智能体存起来，ChatGPT 可以放进自定义指令。

## 在 Claude 里安装

把整个文件夹放到 `~/.claude/skills/renhua/`，然后对 Claude 说：

> 用 renhua 把这段改成人话：……

## 它会找的 32 种 AI 腔

按强弱排序。A 组看到一次就改；弱信号要和别的毛病一起出现才改，免得把正常的文字改坏。

| 组 | 包括 |
|---|---|
| A 摆姿态，不说事 | 不是……而是……、金句收尾、假深刻（底层逻辑、归根结底）、万能开头、和空气辩论 |
| B 节奏和排版 | 排比三连、句首重复、破折号、标点太规整、过度分点和加粗、emoji 堆砌、句子一样长 |
| C 拔高和借权威 | AI 高频词（赋能、打造、闭环）、意义拔高（里程碑、未来可期）、宣传腔（天花板、闭眼入）、借权威（有研究表明）、书面腔翻译腔、层层对冲 |
| D 内容上的空 | 空泛感受、万能结尾互动和客套、硬凹网感 |
| E 聊天和人设 | 反复安慰、括号里的动作表情、比喻意象堆砌 |
| F 残留 | 聊天机器人话术（以下是……希望对你有帮助）、知识截止和猜测 |
| G 讲故事、写小说 | 套路动作（愣了一下、看了很久）、网文套话（心提到了嗓子眼）、替读者说破、作者摆对子、要人解码的句子、对话一个腔调 |

每一条都写了为什么像 AI、怎么改，附改前改后的例子。还有两条底线：**去 AI 味不是去人味**，改完要比原文更有温度；**只往好里改**，批量换词会造出新口癖，好的金句、有意的重复要留。

完整规则见 [SKILL.md](SKILL.md)。

## 让它学你的口吻（可选）

通用规则只能去掉 AI 腔，改出来像"一个普通人"。想让它像**你**，就给它一份口吻档案：

1. 复制 [me.example.md](me.example.md)，改名为 `me.md`，放在同一个文件夹
2. 按模板填上你的习惯，最好贴几段你写给人看的原话
3. 以后改你自己的文字，它会先读 `me.md` 再动手

样本选写给人看的：朋友圈、微信长消息、评论回复。别用你给 AI 下的指令，那些话又短又冷，照着改会把文章改得干巴巴的。

`me.md` 已经写进 `.gitignore`，不会被上传。

## 作者

玄猫Nox（小红书） / [China AI Decoded](https://x.com/ChinaAIDecoded)（X）

在美留学生，用 AI 从零做账号，这个工具就是在写小红书时被 AI 腔逼出来的。

## 致谢

结构、强弱分级和"什么时候不改"参考了 [humanizer](https://github.com/blader/humanizer)（MIT），它整理自维基百科的 Signs of AI writing。中文特有的部分来自小红书和公众号的改稿实践。

## 许可

MIT
