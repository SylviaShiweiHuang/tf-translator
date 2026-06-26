# T-F 翻译器

帮 T 人和 F 人互相听懂对方话里的意思和需求。两个模式:
- **翻译**:粘一句话,给你对方真意 + 需求 + 怎么回
- **练习**:出题让你猜真意,翻牌打分,记连击

AI 用 OpenAI 的 `gpt-4o-mini`(便宜),key 放在服务端,访客点链接直接用。

---

## 上线步骤(约 5 分钟)

### 1. 拿一个 OpenAI API key
- 去 https://platform.openai.com/api-keys 新建一个 key,复制好(`sk-...`)
- **重要**:去 https://platform.openai.com/settings/organization/limits 设一个**每月消费上限**(比如 $5),防止链接被刷爆。

### 2. 部署到 Vercel
方式 A — 网页拖拽(最简单):
1. 注册/登录 https://vercel.com
2. 把这个 `tf-web` 文件夹直接拖进 Vercel 的新建项目页(或先传到 GitHub 再导入)
3. 部署前/后在项目的 **Settings → Environment Variables** 加一条:
   - Name: `OPENAI_API_KEY`
   - Value: 你的 `sk-...`
4. 重新部署一次(让环境变量生效),完成。

方式 B — 命令行:
```
npm i -g vercel
cd tf-web
vercel            # 跟着提示走
vercel env add OPENAI_API_KEY   # 粘贴你的 key
vercel --prod
```

### 3. 拿到链接
部署完 Vercel 给你一个 `https://你的项目名.vercel.app`,这就是能发给任何人的链接。

---

## 花多少钱
- 托管:免费(Vercel 免费额度够个人项目)
- 调用:`gpt-4o-mini` 约 0.03 美分/次,1 美元≈4000 次。自己用/发朋友基本忽略不计。
- 设了月度上限就不会失控。

## 想改
- 换模型:改 `api/chat.js` 顶部的 `MODEL`
- 改语气/题库风格:改 `api/chat.js` 里的 `CORE` 和各 `PROMPTS`
- 改外观:改 `index.html` 顶部的 `:root` 颜色变量
