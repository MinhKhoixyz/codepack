<div align="center">
  <h1>XYZ Project Mapper 🗺️</h1>
  <p><b>The ultimate context-packing tool for AI Assistants (ChatGPT, Claude, Gemini)</b></p>
  
  [![Deploy Status](https://github.com/MinhKhoixyz/xyz-project-mapper/actions/workflows/deploy.yml/badge.svg)](https://github.com/MinhKhoixyz/xyz-project-mapper/actions)
</div>

## 🚀 Live Demo

**[Try XYZ Project Mapper Now](https://minhkhoixyz.github.io/xyz-project-mapper/)**

---

## 💡 The Problem

Providing context to Large Language Models (LLMs) can be painful. You can't just drag and drop a whole project folder. Copy-pasting individual files loses the crucial directory structure, leaving the AI confused about how your project pieces fit together. Furthermore, with the rise of AI Agents, managing exactly what an AI *should* and *should not* see is crucial for preventing hallucinations, ensuring security, and saving tokens.

## ✨ The Solution

**XYZ Project Mapper** is a lightweight web utility that solves this context management problem. It reads your local project directory, generates a beautiful ASCII directory tree, allows you to selectively pick important code files, and bundles everything into a single `.txt` file perfectly formatted for AI consumption.

### 🔥 Key Features

- 🔒 **Privacy First (Zero Backend):** Uses the modern `File System Access API`. Your code never leaves your machine. It's processed 100% locally in your browser.
- 🌳 **Smart ASCII Tree:** Automatically generates a visual structure of your project, intelligently sorting directories above files (IDE-style) while skipping heavy folders like `node_modules` or `.git`.
- 🎯 **Selective & Bulk Export:** Don't bloat your prompt! Check only the files you want the AI to analyze. Use the quick action button on any folder to instantly select or deselect all its contents.
- 💅 **Premium IDE-like UI:** A beautifully spacious, dark-mode interface featuring a smooth animated mesh gradient background, resizable sidebar, custom scrollbars, and intuitive Lucide icons to ensure a top-tier developer experience.

## 🛠️ Tech Stack

- **Frontend:** Vue.js 3 (CDN), HTML5, Vanilla CSS3 (Modern Flexbox/Grid)
- **Icons:** [Lucide Icons](https://lucide.dev/)
- **Core API:** `window.showDirectoryPicker()`
- **CI/CD:** GitHub Actions & GitHub Pages

## 💻 Local Development

This project is pure frontend with no complex build steps required. To run or modify the code locally:

1. **Clone this repository:**
   ```bash
   git clone https://github.com/MinhKhoixyz/xyz-project-mapper.git
   ```

2. **Run a local server:**
   Because it uses the `File System Access API`, it must be served over `localhost`, `127.0.0.1`, or HTTPS. You can use any static server, such as VS Code's Live Server, Python, or npx:
   ```bash
   npx serve .
   # or
   python -m http.server
   ```
