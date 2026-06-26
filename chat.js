// Vercel serverless function — proxies to OpenAI so the API key stays server-side.
// Set OPENAI_API_KEY in Vercel project env vars. Model: gpt-4o-mini (cheap).

const MODEL = "gpt-4o-mini";

const CORE = `你是「T-F 关系翻译器」。

核心洞察:说话的人和听话的人常常用着两套不同的编码,误差就是关系摩擦的来源。
- 偏 F(Feeling)的表达:话语承载情绪和连接需求,字面意思常常不是真意。"我没事" ≈ "我很有事,先别讲道理"。
- 偏 T(Thinking)的表达:话语承载信息和解决方案,直白 ≠ 冷漠。"你可以试试 A" ≈ "我在用我的方式关心你"。

分寸(很重要):
- T/F 是好用的钩子,不是铁律。绝不把人本质化成"你是 T 所以冷血""F 就是矫情"。同一个人不同情境会切换。只说"这句话偏 T/F 的表达"。
- 语气可以带刻板印象的幽默感(段子感让人愿意看),但底层判断必须真诚、准确、对双方都尊重。好笑但不刻薄。
- 全程用中文。简洁,不写小作文。`;

const PROMPTS = {
  translate: `${CORE}

任务:用户给你一句别人说的话(可能附带情境)。判断它偏 T 还是偏 F 的表达,翻成对方能正确接收的版本。
严格只输出 JSON,结构:
{
  "lean": "F" 或 "T",
  "surface": "表面像在说什么(容易被误读成什么)",
  "meaning": "真正的意思",
  "need": "底下的需求(被倾听/被认同/要方案/要陪伴/要确认 等)",
  "landmine": "这句话为什么容易让对方多想;没有就填空字符串",
  "replies": [
    {"tone": "暖一点的", "text": "可直接发出去的回复"},
    {"tone": "干脆一点的", "text": "可直接发出去的回复"}
  ],
  "flip": "如果用户想反过来让对方更懂自己,可以怎么说;没必要就填空字符串"
}`,

  question: `${CORE}

任务:出一道练习题。给一个真实感很强的小情境 + 一句对方说的话(偏 T 或偏 F 随机)。先不要给答案。
严格只输出 JSON,结构:
{
  "scenario": "一句话情境(谁说的、什么场合)",
  "message": "对方说的那句话",
  "lean": "F" 或 "T"
}
每次尽量出新的、不重复的题。可以从经典款逐渐到更微妙、T/F 信号混合的。`,

  score: `${CORE}

任务:这是一道练习题,用户已经写下了自己的猜测(对方真意 + 怎么回)。给出参考答案并点评打分。
严格只输出 JSON,结构:
{
  "stars": 1 到 3 的整数,
  "verdict": "一句话总评(轻快、像陪练不像考官)",
  "hit": "用户猜中了什么",
  "miss": "用户漏了或偏了什么;没有就填空字符串",
  "meaning": "参考真意",
  "need": "参考需求",
  "reply": "一版参考回复"
}`
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "服务端没配置 OPENAI_API_KEY" });
  }

  try {
    const { mode, input } = req.body || {};
    const system = PROMPTS[mode];
    if (!system) return res.status(400).json({ error: "未知模式" });

    let userContent;
    if (mode === "translate") {
      userContent = `请翻译这句话:\n${input.message}` + (input.context ? `\n\n情境:${input.context}` : "");
    } else if (mode === "question") {
      userContent = "出一道新题。" + (input && input.lean ? `这次出偏 ${input.lean} 的。` : "");
    } else if (mode === "score") {
      userContent = `题目情境:${input.scenario}\n对方说:${input.message}\n\n用户的猜测:${input.guess}`;
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: mode === "question" ? 1.0 : 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent }
        ]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: "OpenAI 调用失败", detail: t.slice(0, 300) });
    }

    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { error: "返回格式异常", raw: text }; }
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 300) });
  }
}
