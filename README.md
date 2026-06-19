<div align="center">
  <h1>XYZ Project Mapper 🗺️</h1>
  
  <p>
    <strong>A secure, client-side utility for seamlessly packaging codebases into LLM-ready context files.</strong>
  </p>

  <p>
    <a href="https://github.com/MinhKhoixyz/xyz-project-mapper/actions"><img src="https://github.com/MinhKhoixyz/xyz-project-mapper/actions/workflows/deploy.yml/badge.svg" alt="Deploy Status" /></a>
    <a href="https://minhkhoixyz.github.io/xyz-project-mapper/"><img src="https://img.shields.io/badge/Live-Demo-brightgreen.svg" alt="Live Demo" /></a>
    <a href="https://github.com/MinhKhoixyz/xyz-project-mapper/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
  </p>

  <p>
    <a href="#about-the-project">About</a> •
    <a href="#key-features">Features</a> •
    <a href="#usage">Usage</a> •
    <a href="#local-development">Development</a>
  </p>
</div>

<a id="about-the-project"></a>
## 📖 About the Project

### The Challenge
When working with Large Language Models (LLMs) and AI Assistants (e.g., ChatGPT, Claude, Gemini), providing comprehensive and structured context is a recurring challenge. Manually copy-pasting individual files strips away essential architectural context, such as directory structures, and leaves the AI unaware of how components interact. Conversely, exposing an entire repository without curation can lead to token bloat, increased latency, hallucination risks, and potential exposure of sensitive data.

### The Solution
**XYZ Project Mapper** is a lightweight, browser-based utility engineered to streamline context management. It reads your local project directory and compiles a highly formatted text representation of your codebase, complete with a visual ASCII directory tree. By allowing precise, granular selection of files, it ensures you only transmit the necessary context to your AI assistant.

---

<a id="key-features"></a>
## ✨ Key Features

- **🔒 Zero-Backend & Privacy-First**  
  Built on the modern `File System Access API`, all processing is performed 100% locally within your browser. Your proprietary code never leaves your machine.
- **🌳 Intelligent ASCII Tree Generation**  
  Automatically constructs a comprehensive visual hierarchy of your project. Directories are intuitively sorted above files (IDE-style), while heavy or irrelevant directories (such as `node_modules` or `.git`) are cleanly excluded.
- **🎯 Granular Selective Export**  
  Optimize your context window. Select or deselect individual files, or utilize bulk-action controls on directories to efficiently curate the exact payload the LLM requires.
- **💅 Premium Developer Experience**  
  Features an elegant, spacious dark-mode interface with a dynamic animated mesh gradient, a resizable sidebar, and intuitive iconography (powered by Lucide) for a distraction-free workflow.

---

<a id="usage"></a>
## 🚀 Usage

You do not need to install anything to use XYZ Project Mapper. 

1. Navigate to the **[Live Demo](https://minhkhoixyz.github.io/xyz-project-mapper/)**.
2. Click **"Open Directory"** and grant browser permission to read your project folder.
3. Review the generated ASCII tree on the left sidebar.
4. Check the boxes next to the files you wish to include in the context export.
5. Click **"Export"** to generate a single `.txt` file perfectly formatted for LLM consumption.

---

## 🛠️ Technology Stack

This project is built with a focus on simplicity, performance, and modern web standards:

- **Frontend Framework:** Vue.js 3 (via CDN)
- **Styling:** Vanilla CSS3 (Modern Flexbox/Grid, CSS Variables)
- **Icons:** [Lucide Icons](https://lucide.dev/)
- **Core Browser API:** `window.showDirectoryPicker()` (File System Access API)
- **CI/CD Pipeline:** GitHub Actions & GitHub Pages

---

<a id="local-development"></a>
## 💻 Local Development

The project is a pure static frontend. No complex build pipelines, bundlers, or package managers are required.

### Prerequisites
Since the application relies on the `File System Access API`, it must be served over a secure context (`localhost`, `127.0.0.1`, or `HTTPS`).

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MinhKhoixyz/xyz-project-mapper.git
   cd xyz-project-mapper
   ```

2. **Serve locally:**
   Use any local static file server. Here are a few examples:

   *Using Node.js (`npx`):*
   ```bash
   npx serve .
   ```

   *Using Python 3:*
   ```bash
   python -m http.server 8000
   ```

   *Using VS Code:*
   Install and run the **Live Server** extension.

3. **Open in Browser:**
   Navigate to `http://localhost:8000` (or the port specified by your server).

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
