const { createApp, ref, onMounted, nextTick } = Vue;

// Optimized icon refresh - prevents full DOM scan freeze
let iconTimeout;
const refreshIcons = () => {
  clearTimeout(iconTimeout);
  iconTimeout = setTimeout(() => {
    nextTick(() => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  }, 10);
};

const FileTree = {
  name: "file-tree",
  props: ["nodes", "selectedPaths"],
  template: `
    <ul class="tree-list">
      <li v-for="node in nodes" :key="node.path" class="tree-node">
        <div 
          class="node-content" 
          :class="{ 'is-selected': node.kind === 'file' && selectedPaths.includes(node.path) }"
          @click="handleInteraction(node)"
          :title="node.name"
        >
          <span v-if="node.kind === 'directory'" :key="'chevron-' + isExpanded(node)" class="icon-wrapper">
            <i :data-lucide="isExpanded(node) ? 'chevron-down' : 'chevron-right'" class="icon-sm"></i>
          </span>
          <span v-else class="icon-spacer"></span>

          <span v-if="node.kind === 'directory'" :key="'folder-' + isExpanded(node)" class="icon-wrapper">
            <i :data-lucide="isExpanded(node) ? 'folder-open' : 'folder'" class="icon-sm"></i>
          </span>
          <span v-else class="icon-wrapper">
            <i data-lucide="file-code-2" class="icon-sm"></i>
          </span>
          
          <span class="node-name">{{ node.name }}</span>
          
          <span v-if="node.kind === 'file'" :key="'fcheck-' + selectedPaths.includes(node.path)" class="icon-wrapper" style="margin-left: auto;">
            <i :data-lucide="selectedPaths.includes(node.path) ? 'check-square' : 'square'" 
               class="icon-sm" 
               :class="{ 'icon-checked': selectedPaths.includes(node.path) }">
            </i>
          </span>

          <span v-if="node.kind === 'directory'" class="folder-action" @click.stop="$emit('toggle-folder', node)" title="Select/Deselect all safe files in folder">
            <span :key="'dcheck-' + isAllSelected(node)" class="icon-wrapper">
              <i :data-lucide="isAllSelected(node) ? 'check-square' : 'square'" 
                 class="icon-sm" 
                 :class="{ 'icon-checked': isAllSelected(node) }">
              </i>
            </span>
          </span>
        </div>
        
        <file-tree 
          v-if="node.kind === 'directory' && isExpanded(node)" 
          :nodes="node.children"
          :selected-paths="selectedPaths"
          @select="$emit('select', $event)"
          @toggle="$emit('toggle', $event)"
          @toggle-folder="$emit('toggle-folder', $event)"
        ></file-tree>
      </li>
    </ul>
  `,
  setup(props, { emit }) {
    const expandedNodes = ref([]);

    const isExpanded = (node) => expandedNodes.value.includes(node.path);

    const isAllSelected = (node) => {
      if (node.kind !== "directory" || !node.children) return false;

      let files = [];
      const getFiles = (n) => {
        if (n.kind === "file") files.push(n);
        else if (n.children) n.children.forEach(getFiles);
      };
      getFiles(node);

      if (files.length === 0) return false;

      // Determine selection state based only on non-blacklisted files
      const safeFiles = files.filter((f) => {
        const ext = f.name.toLowerCase();
        // Basic inline check for UI state
        return ![
          ".png",
          ".jpg",
          ".jpeg",
          ".gif",
          ".svg",
          ".ico",
          ".pdf",
          ".zip",
          ".rar",
          ".exe",
          ".jar",
          ".class",
          ".mp4",
          ".mp3",
        ].some((e) => ext.endsWith(e));
      });

      if (safeFiles.length === 0) return false;
      return safeFiles.every((f) => props.selectedPaths.includes(f.path));
    };

    const handleInteraction = (node) => {
      if (node.kind === "directory") {
        const idx = expandedNodes.value.indexOf(node.path);
        if (idx > -1) {
          expandedNodes.value.splice(idx, 1);
        } else {
          expandedNodes.value.push(node.path);
        }
        refreshIcons();
      } else {
        emit("toggle", node);
        emit("select", node);
      }
    };

    return { isExpanded, handleInteraction, isAllSelected };
  },
};

const app = createApp({
  setup() {
    const rootHandle = ref(null);
    const projectTree = ref([]);
    const selectedFileName = ref("");
    const fileContent = ref(
      "// Welcome to XYZ Project Mapper.\n// Click Open Project Folder to begin.\n// Click on a file path to preview and select it for AI Export.\n// Selected files will be highlighted.",
    );

    const selectedPaths = ref([]);
    const selectedNodes = ref([]);

    const currentLanguage = ref('language-javascript');

    const blockEnvFiles = ref(true);
    const customIgnores = ref("target, __pycache__, build, .next");
    const showSettings = ref(false);

    const applySettings = async () => {
      if (rootHandle.value) {
        await reScanFolder();
      }
    };

    const reScanFolder = async () => {
      if (!rootHandle.value) return;
      
      fileContent.value = "// Filter applied. Project folder re-scanned.";
      const children = await scanDirectory(rootHandle.value, rootHandle.value.name);
      projectTree.value = [
        {
          name: rootHandle.value.name,
          kind: "directory",
          path: rootHandle.value.name,
          handle: rootHandle.value,
          children: children,
        },
      ];
      
      // Remove blocked files from current selection to preserve UX
      if (blockEnvFiles.value) {
        const isBlocked = (name) => name === ".env" || (name.startsWith(".env.") && name !== ".env.example");
        
        selectedPaths.value = selectedPaths.value.filter(path => {
          const parts = path.split('/');
          return !isBlocked(parts[parts.length - 1]);
        });
        
        selectedNodes.value = selectedNodes.value.filter(node => {
          return !isBlocked(node.name);
        });
      }
      
      refreshIcons();
    };

    const exportArchitectureMap = async () => {
      if (!rootHandle.value) return;

      fileContent.value = "// Generating Architecture Map... analyzing dependencies and imports.";

      let content = `# Architecture Map: ${rootHandle.value.name}\n\n`;
      content += `> Auto-generated by XYZ Project Mapper\n\n`;

      // 1. Project Structure
      content += `## 🗂️ Project Structure\n\`\`\`text\n`;
      content += generateTreeString(projectTree.value);
      content += `\`\`\`\n\n`;

      // Helper to find file in tree
      const allFiles = getAllFilesInFolder(projectTree.value[0]);
      
      // 2. Tech Stack (Package.json heuristics)
      const packageJsonNode = allFiles.find(f => f.name === 'package.json' && f.path.split('/').length === 2);
      if (packageJsonNode) {
        try {
          const file = await packageJsonNode.handle.getFile();
          const text = await file.text();
          const pkg = JSON.parse(text);
          content += `## 📦 Tech Stack & Dependencies (package.json)\n`;
          if (pkg.dependencies) {
            content += `**Dependencies:**\n`;
            for (const [dep, ver] of Object.entries(pkg.dependencies)) {
              content += `- \`${dep}\`: ${ver}\n`;
            }
          }
          if (pkg.devDependencies) {
            content += `\n**Dev Dependencies:**\n`;
            for (const [dep, ver] of Object.entries(pkg.devDependencies)) {
              content += `- \`${dep}\`: ${ver}\n`;
            }
          }
          content += `\n`;
        } catch (e) {
          console.warn('Could not parse package.json', e);
        }
      }

      // 3. Module Connections (Heuristics)
      content += `## 🔗 Module Connections (Import Heuristics)\n`;
      content += `*Extracting import/require statements from source files.*\n\n`;
      
      const sourceExts = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.py'];
      for (const node of allFiles) {
        if (sourceExts.some(ext => node.name.toLowerCase().endsWith(ext))) {
          try {
            const file = await node.handle.getFile();
            // Don't read files that are too large to prevent freezing
            if (file.size > 500000) continue; 
            const text = await file.text();
            
            // Simple regex for imports
            const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]|(?:require)\(['"]([^'"]+)['"]\)/g;
            const matches = [...text.matchAll(importRegex)];
            
            if (matches.length > 0) {
              content += `### \`${node.path}\`\n`;
              const deps = new Set();
              matches.forEach(m => {
                const dep = m[1] || m[2];
                if (dep) deps.add(dep);
              });
              deps.forEach(dep => {
                content += `- depends on: \`${dep}\`\n`;
              });
              content += `\n`;
            }
          } catch(e) {
            // ignore unreadable files
          }
        }
      }

      fileContent.value = "// Architecture Map generation complete. See downloaded file.";

      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ArchitectureMap_${rootHandle.value.name}.md`;
      link.click();
      URL.revokeObjectURL(url);
    };

    // --- BLACKLIST LOGIC ---
    const blacklistExts = [
      // Images & Graphics
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".ico",
      ".webp",
      ".bmp",
      ".psd",
      ".ai",
      // Fonts
      ".ttf",
      ".woff",
      ".woff2",
      ".eot",
      ".otf",
      // Archives, Executables & System files
      ".zip",
      ".rar",
      ".7z",
      ".tar",
      ".gz",
      ".exe",
      ".dll",
      ".so",
      ".bin",
      ".msi",
      ".DS_Store",
      // Audio & Video
      ".mp4",
      ".mp3",
      ".wav",
      ".avi",
      ".mkv",
      ".mov",
      ".flv",
      // Databases, PDFs & Build artifacts
      ".class",
      ".jar",
      ".war",
      ".ear",
      ".sqlite",
      ".db",
      ".pdf",
      ".docx",
      ".xlsx",
    ];

    const isSafeToRead = (fileName) => {
      const lowerName = fileName.toLowerCase();
      return !blacklistExts.some((ext) => lowerName.endsWith(ext));
    };

    // --- MAIN FLOW: RESIZABLE SIDEBAR ---
    const sidebarWidth = ref(320);
    const isResizing = ref(false);

    const startResize = () => {
      isResizing.value = true;
      document.addEventListener("mousemove", doResize);
      document.addEventListener("mouseup", stopResize);
      document.body.classList.add("is-resizing");
    };

    const doResize = (e) => {
      if (!isResizing.value) return;
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 800) newWidth = 800;
      sidebarWidth.value = newWidth;
    };

    const stopResize = () => {
      isResizing.value = false;
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);
      document.body.classList.remove("is-resizing");
    };

    onMounted(() => {
      refreshIcons();
    });

    const selectFolder = async () => {
      try {
        const handle = await window.showDirectoryPicker();
        rootHandle.value = handle;

        selectedPaths.value = [];
        selectedNodes.value = [];
        selectedFileName.value = "";
        fileContent.value = "// Project folder loaded. Explorer is ready.";

        const children = await scanDirectory(handle, handle.name);
        projectTree.value = [
          {
            name: handle.name,
            kind: "directory",
            path: handle.name,
            handle: handle,
            children: children,
          },
        ];

        setTimeout(() => {
          const rootNode = document.querySelector(".node-content");
          if (rootNode) rootNode.click();
        }, 100);
      } catch (err) {
        console.error("User cancelled or browser not supported", err);
      }
    };

    const scanDirectory = async (handle, parentPath = "") => {
      const nodes = [];
      const ignoreList = customIgnores.value.split(',').map(i => i.trim()).filter(Boolean);

      for await (const entry of handle.values()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist" ||
          entry.name === ".idea" ||
          entry.name === ".vscode" ||
          ignoreList.includes(entry.name)
        )
          continue;

        if (blockEnvFiles.value && entry.kind === "file") {
          if (entry.name === ".env" || (entry.name.startsWith(".env.") && entry.name !== ".env.example")) {
            continue;
          }
        }

        const currentPath = `${parentPath}/${entry.name}`;

        const node = {
          name: entry.name,
          kind: entry.kind,
          path: currentPath,
          handle: entry,
        };

        if (entry.kind === "directory") {
          node.children = await scanDirectory(entry, currentPath);
        }
        nodes.push(node);
      }

      return nodes.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    };

    const toggleSelection = (node) => {
      const idx = selectedPaths.value.indexOf(node.path);
      if (idx > -1) {
        selectedPaths.value.splice(idx, 1);
        const nodeIdx = selectedNodes.value.findIndex(
          (n) => n.path === node.path,
        );
        selectedNodes.value.splice(nodeIdx, 1);
      } else {
        selectedPaths.value.push(node.path);
        selectedNodes.value.push(node);
      }
      refreshIcons();
    };

    const getAllFilesInFolder = (node) => {
      let files = [];
      if (node.kind === "file") {
        files.push(node);
      } else if (node.kind === "directory" && node.children) {
        node.children.forEach((child) => {
          files = files.concat(getAllFilesInFolder(child));
        });
      }
      return files;
    };

    const toggleFolderSelection = (folderNode) => {
      const allFiles = getAllFilesInFolder(folderNode);

      // FILTER: Keep only readable/safe files
      const safeFiles = allFiles.filter((f) => isSafeToRead(f.name));

      if (safeFiles.length === 0) return;

      const allSelected = safeFiles.every((f) =>
        selectedPaths.value.includes(f.path),
      );

      if (allSelected) {
        // Deselect all safe files
        const pathsToRemove = new Set(safeFiles.map((f) => f.path));
        selectedPaths.value = selectedPaths.value.filter(
          (p) => !pathsToRemove.has(p),
        );
        selectedNodes.value = selectedNodes.value.filter(
          (n) => !pathsToRemove.has(n.path),
        );
      } else {
        // Select all safe files
        safeFiles.forEach((f) => {
          if (!selectedPaths.value.includes(f.path)) {
            selectedPaths.value.push(f.path);
            selectedNodes.value.push(f);
          }
        });
      }
      refreshIcons();
    };

    const previewFile = async (node) => {
      if (node.kind === "file") {
        try {
          fileContent.value = "// Loading file content...";
          const file = await node.handle.getFile();
          selectedFileName.value = node.path;

          // Block reading blacklisted files
          if (!isSafeToRead(file.name)) {
            fileContent.value = `// ⚠️ Preview skipped: File [${file.name}] is an unsupported format (Blacklisted).`;
            return;
          }

          fileContent.value = await file.text();
          
          // Determine language for Prism
          const ext = node.name.split('.').pop().toLowerCase();
          const langMap = {
            'js': 'javascript', 'jsx': 'jsx', 'ts': 'typescript', 'tsx': 'tsx',
            'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown',
            'py': 'python', 'java': 'java', 'go': 'go', 'rs': 'rust',
            'php': 'php', 'rb': 'ruby', 'cs': 'csharp', 'cpp': 'cpp', 'c': 'c',
            'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml', 'sh': 'bash', 'sql': 'sql',
            'vue': 'javascript' // fallback for vue
          };
          currentLanguage.value = `language-${langMap[ext] || 'javascript'}`;
          
          Vue.nextTick(() => {
            if (window.Prism) {
              window.Prism.highlightAll();
            }
          });
          
        } catch (e) {
          fileContent.value =
            "// ⚠️ Cannot preview this file type (Image, PDF, or Binary).";
        }
      }
    };

    const generateTreeString = (nodes, prefix = "") => {
      let result = "";
      nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? "└── " : "├── ";

        const selectionMarker =
          node.kind === "file" && selectedPaths.value.includes(node.path)
            ? " [SELECTED] "
            : " ";

        result += `${prefix}${connector}${node.name}${selectionMarker}\n`;

        if (node.kind === "directory" && node.children) {
          const newPrefix = prefix + (isLast ? "    " : "│   ");
          result += generateTreeString(node.children, newPrefix);
        }
      });
      return result;
    };

    const exportForAI = async () => {
      if (!rootHandle.value) return;

      fileContent.value =
        "// Generating export file... this might take a moment if many files are selected.";

      let finalContent = "";

      if (selectedNodes.value.length > 0) {
        // Chỉ xuất code chi tiết, KHÔNG xuất cây thư mục để tiết kiệm Token
        finalContent += `📦 EXPORTED FILES (${selectedNodes.value.length}):\n\n`;
        for (const node of selectedNodes.value) {
          try {
            const file = await node.handle.getFile();
            finalContent += `--- Start of file: ${node.path} ---\n`;

            // Double-check during export to ensure binary files are ignored
            if (!isSafeToRead(file.name)) {
              finalContent += `[Preview skipped: Unsupported or binary format]\n`;
            } else {
              const text = await file.text();
              finalContent += text + "\n";
            }
            finalContent += `--- End of file ---\n\n`;
          } catch (e) {
            finalContent += `[Error reading file]\n\n`;
          }
        }
      } else {
        // Nếu không chọn file nào, xuất cây thư mục mặc định
        finalContent =
          "🗂️ PROJECT STRUCTURE:\n" +
          generateTreeString(projectTree.value) +
          "\n\n";
      }

      fileContent.value = "// Export complete. See downloaded file.";

      const blob = new Blob([finalContent], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MapperProject_${rootHandle.value.name}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    };

    return {
      rootHandle,
      projectTree,
      selectedFileName,
      fileContent,
      selectedPaths,
      selectedNodes,
      sidebarWidth,
      isResizing,
      startResize,
      selectFolder,
      previewFile,
      toggleSelection,
      toggleFolderSelection,
      exportForAI,
      exportArchitectureMap,
      blockEnvFiles,
      customIgnores,
      showSettings,
      applySettings,
      reScanFolder,
      currentLanguage,
    };
  },
});

app.component("file-tree", FileTree);
app.mount("#app");
