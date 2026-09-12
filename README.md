<div align="center">
  <h1>CodePack 📦</h1>
  <p><strong>Package your codebase into perfectly formatted AI context — right in your browser.</strong></p>

  <p>
    <a href="https://github.com/MinhKhoixyz/codepack/actions/workflows/deploy.yml"><img src="https://github.com/MinhKhoixyz/codepack/actions/workflows/deploy.yml/badge.svg" alt="Deploy Status" /></a>
    <a href="https://minhkhoixyz.github.io/codepack/"><img src="https://img.shields.io/badge/Live-Demo-brightgreen.svg" alt="Live Demo" /></a>
    <a href="https://github.com/MinhKhoixyz/codepack/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
  </p>

  <p><a href="https://minhkhoixyz.github.io/codepack/">Try it now →</a></p>
</div>

---

Stop manually copy-pasting files into AI chats. **CodePack** lets you open any project folder, select exactly the files you need, and export a single, clean context file — in the format your LLM prefers.

Zero backend. Zero install. Your code never leaves your machine.

## ✨ Features

- **🎯 Granular Selection** — Select files individually or entire directories in one click
- **📦 Multi-Format Export** — Choose between Plain Text, Markdown code blocks, or XML tags
- **📋 Copy to Clipboard** — Skip the download, paste directly into your AI chat
- **🗺️ Architecture Map** — Auto-generate a project overview with structure, dependencies, and import graph
- **🔒 Privacy First** — Built on the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API); all processing runs locally
- **⚙️ Configurable Filters** — Hide `.env` files, add custom ignore patterns (`target/`, `__pycache__/`, etc.)
- **👁️ File Preview** — Syntax-highlighted code preview before you export

## 🚀 Usage

No installation needed. Open the [**live demo**](https://minhkhoixyz.github.io/codepack/), or serve locally:

```bash
npx serve .
# or
python -m http.server 8000
```

> Requires a secure context (`localhost` or `HTTPS`) due to the File System Access API.

1. Click **Open Project Folder** and grant browser permission
2. Select the files you need from the sidebar
3. Click **Export** → choose your format → **Download** or **Copy to Clipboard**

## 🛠️ Stack

| Layer | Tech |
|---|---|
| UI Framework | Vue.js 3 (CDN) |
| Styling | Vanilla CSS3 |
| Icons | Lucide |
| Syntax Highlight | Prism.js |
| Core API | File System Access API |
| CI/CD | GitHub Actions + GitHub Pages |

## 🤝 Contributing

Contributions are welcome! Open an issue to discuss a feature or bug before submitting a PR.

## 📄 License

MIT © [MinhKhoixyz](https://github.com/MinhKhoixyz)
