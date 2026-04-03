<div align="center">
  <h1>XYZ Project Mapper 🗺️</h1>
  <p><b>The ultimate context-packing tool for AI Assistants (ChatGPT, Claude, Gemini)</b></p>
  
  [![Deploy Status](https://github.com/MinhKhoixyz/xyz-project-mapper/actions/workflows/deploy.yml/badge.svg)](https://github.com/MinhKhoixyz/xyz-project-mapper/actions)
</div>

## 🚀 Live Demo

**[Try XYZ Project Mapper Now](https://minhkhoixyz.github.io/xyz-project-mapper/)**

---

## 💡 The Problem

Providing context to Large Language Models (LLMs) can be painful. You can't just drag and drop a whole project folder. Copy-pasting individual files loses the crucial directory structure, leaving the AI confused about how your project pieces fit together.

## ✨ The Solution

**XYZ Project Mapper** is a lightweight web utility that solves this. It reads your local project directory, generates a beautiful ASCII directory tree, allows you to selectively pick important code files, and bundles everything into a single `.txt` file perfectly formatted for AI consumption.

### 🔥 Key Features

- 🔒 **Privacy First (Zero Backend):** Uses the modern `File System Access API`. Your code never leaves your machine. It's processed 100% locally in your browser.
- 🌳 **Smart ASCII Tree:** Automatically generates a visual structure of your project, skipping heavy folders like `node_modules` or `.git`.
- 🎯 **Selective Export:** Don't bloat your prompt! Check only the files you want the AI to analyze.
- 💅 **Modern IDE-like UI:** Sleek dark mode interface inspired by modern editors, ensuring a smooth developer experience.

## 🛠️ Tech Stack

- **Frontend:** Vue.js 3 (CDN), HTML5, CSS3 (Modern Flexbox/Grid)
- **Icons:** [Lucide Icons](https://lucide.dev/)
- **Core API:** `window.showDirectoryPicker()`
- **CI/CD:** GitHub Actions & GitHub Pages

## 💻 How to Use (Local Development)

If you want to run or modify the code yourself:

```bash
git clone https://github.com/MinhKhoixyz/xyz-project-mapper.git
```
