const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

// Optimized icon refresh - debounced, prevents full DOM scan freeze
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
  // PERF: selectedPathsSet is a Set (O(1) has) derived from selectedPaths
  props: ["nodes", "selectedPaths", "selectedPathsSet"],
  template: `
    <ul class="tree-list">
      <li v-for="node in nodes" :key="node.path" class="tree-node">
        <div 
          class="node-content" 
          :class="{ 'is-selected': node.kind === 'file' && selectedPathsSet.has(node.path) }"
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
          
          <span v-if="node.kind === 'file'" :key="'fcheck-' + selectedPathsSet.has(node.path)" class="icon-wrapper" style="margin-left: auto;">
            <i :data-lucide="selectedPathsSet.has(node.path) ? 'check-square' : 'square'" 
               class="icon-sm" 
               :class="{ 'icon-checked': selectedPathsSet.has(node.path) }">
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
          :selected-paths-set="selectedPathsSet"
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

    // PERF: uses props.selectedPathsSet.has() — O(1) instead of O(n) includes()
    const isAllSelected = (node) => {
      if (node.kind !== "directory" || !node.children) return false;

      // PERF: use accumulator-based getAllFiles to avoid intermediate arrays
      const files = [];
      const getFiles = (n) => {
        if (n.kind === "file") files.push(n);
        else if (n.children) n.children.forEach(getFiles);
      };
      getFiles(node);

      if (files.length === 0) return false;

      const safeFiles = files.filter((f) => {
        const ext = f.name.toLowerCase();
        return ![
          ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
          ".pdf", ".zip", ".rar", ".exe", ".jar", ".class",
          ".mp4", ".mp3",
        ].some((e) => ext.endsWith(e));
      });

      if (safeFiles.length === 0) return false;
      // PERF: O(1) Set.has() instead of O(n) Array.includes()
      return safeFiles.every((f) => props.selectedPathsSet.has(f.path));
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

const parseGitignore = (content) => {
  return content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(pattern => {
      let regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]');
      
      if (pattern.startsWith('/')) {
        return new RegExp('^' + regexPattern.substring(1) + '(/.*)?$');
      } else {
        return new RegExp('(^|/)' + regexPattern + '(/.*)?$');
      }
    });
};

const app = createApp({
  setup() {
    const rootHandle = ref(null);
    const projectTree = ref([]);
    const selectedFileName = ref("");
    const fileContent = ref(
      "// Welcome to CodePack.\n// Click Open Project Folder to begin.\n// Click on a file path to preview and select it for AI Export.\n// Selected files will be highlighted.",
    );

    const selectedPaths = ref([]);
    const selectedNodes = ref([]);

    // PERF: O(1) lookup Set — derived from selectedPaths, auto-updates reactively
    const selectedPathsSet = computed(() => new Set(selectedPaths.value));

    const currentLanguage = ref('language-javascript');

    const blockEnvFiles = ref(true);
    const gitignoreRules = ref([]);
    // COMMITTED ignore state — only updated when user presses Apply
    const ignoreTags = ref(["node_modules", ".git", "dist", "build", "target", ".idea", ".vscode", "__pycache__", ".next"]);

    // DRAFT state — temp copies while Settings modal is open
    // Discarded on Cancel/close, committed to ignoreTags on Apply
    const draftIgnoreTags = ref([]);
    const draftIgnoreInput = ref("");

    const openSettings = () => {
      // Clone committed state into draft — user works on this copy
      draftIgnoreTags.value = [...ignoreTags.value];
      draftIgnoreInput.value = "";
      showSettings.value = true;
    };

    const addIgnoreTag = () => {
      const entries = draftIgnoreInput.value.split(',').map(s => s.trim()).filter(Boolean);
      entries.forEach(entry => {
        if (entry && !draftIgnoreTags.value.includes(entry)) {
          draftIgnoreTags.value.push(entry);
        }
      });
      draftIgnoreInput.value = "";
    };

    const removeIgnoreTag = (index) => {
      draftIgnoreTags.value.splice(index, 1);
    };

    const handleIgnoreKeydown = (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addIgnoreTag();
      } else if (e.key === 'Backspace' && draftIgnoreInput.value === '' && draftIgnoreTags.value.length > 0) {
        draftIgnoreTags.value.pop();
      }
    };

    const showSettings = ref(false);
    
    const showExportModal = ref(false);
    const exportFormat = ref("xml");

    watch(fileContent, () => {
      nextTick(() => {
        if (window.Prism) {
          Prism.highlightAll();
        }
      });
    });

    const applySettings = async () => {
      // Commit any text still in the input field first
      if (draftIgnoreInput.value.trim()) addIgnoreTag();
      // Commit draft → committed state
      ignoreTags.value = [...draftIgnoreTags.value];
      if (rootHandle.value) {
        await reScanFolder();
      }
    };

    const reScanFolder = async () => {
      if (!rootHandle.value) return;
      
      fileContent.value = "// Filter applied. Project folder re-scanned.";
      // PERF: ignoreTags is already an array — pass directly, no parsing needed
      const children = await scanDirectory(rootHandle.value, rootHandle.value.name, ignoreTags.value, gitignoreRules.value);
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

      // PERF: use array + join for string building instead of repeated +=
      const parts = [];
      parts.push(`# Architecture Map: ${rootHandle.value.name}\n\n`);
      parts.push(`> Auto-generated by Code Snapshot\n\n`);

      // 1. Project Structure
      parts.push(`## 🗂️ Project Structure\n\`\`\`text\n`);
      parts.push(generateTreeString(projectTree.value));
      parts.push(`\`\`\`\n\n`);

      const allFiles = getAllFilesInFolder(projectTree.value[0]);
      
      // 2. Tech Stack (Package.json heuristics)
      const packageJsonNode = allFiles.find(f => f.name === 'package.json' && f.path.split('/').length === 2);
      if (packageJsonNode) {
        try {
          const file = await packageJsonNode.handle.getFile();
          const text = await file.text();
          const pkg = JSON.parse(text);
          parts.push(`## 📦 Tech Stack & Dependencies (package.json)\n`);
          if (pkg.dependencies) {
            parts.push(`**Dependencies:**\n`);
            for (const [dep, ver] of Object.entries(pkg.dependencies)) {
              parts.push(`- \`${dep}\`: ${ver}\n`);
            }
          }
          if (pkg.devDependencies) {
            parts.push(`\n**Dev Dependencies:**\n`);
            for (const [dep, ver] of Object.entries(pkg.devDependencies)) {
              parts.push(`- \`${dep}\`: ${ver}\n`);
            }
          }
          parts.push(`\n`);
        } catch (e) {
          console.warn('Could not parse package.json', e);
        }
      }

      // 3. Module Connections (Heuristics)
      parts.push(`## 🔗 Dependency Graph (Mermaid)\n`);
      parts.push(`\`\`\`mermaid\ngraph TD;\n`);
      
      const sourceExts = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.py'];
      const connectionDetails = [];
      const graphLines = [];

      for (const node of allFiles) {
        if (sourceExts.some(ext => node.name.toLowerCase().endsWith(ext))) {
          try {
            const file = await node.handle.getFile();
            if (file.size > 500_000) continue;
            const text = await file.text();
            
            let matchResults = [];
            if (node.name.toLowerCase().endsWith('.py')) {
               const pyRegex = /(?:^|\n)\s*(?:import|from)\s+([a-zA-Z0-9_\.]+)/g;
               const found = [...text.matchAll(pyRegex)];
               matchResults = found.map(m => m[1]);
            } else {
               const jsRegex = /(?:import(?:[\s\S]*?from)?\s+['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g;
               const found = [...text.matchAll(jsRegex)];
               matchResults = found.map(m => m[1] || m[2]).filter(Boolean);
            }
            
            if (matchResults.length > 0) {
              const deps = new Set(matchResults);
              let detailsStr = `### \`${node.path}\`\n`;
              
              const sourceName = node.path.split('/').slice(1).join('/'); 
              
              deps.forEach(dep => {
                 const isLocal = dep.startsWith('.') || dep.startsWith('/') || dep.startsWith('@/') || dep.startsWith('~/');
                 if (isLocal) {
                    detailsStr += `- 📄 Local file: \`${dep}\`\n`;
                    graphLines.push(`  "${sourceName}" --> "${dep}";`);
                 } else {
                    detailsStr += `- 📦 External package: \`${dep}\`\n`;
                    graphLines.push(`  "${sourceName}" -.-> "${dep}";`);
                 }
              });
              connectionDetails.push(detailsStr + `\n`);
            }
          } catch(e) {
            // ignore unreadable files
          }
        }
      }

      if (graphLines.length > 0) {
        parts.push(graphLines.join('\n'));
      } else {
        parts.push(`  %% No dependencies found`);
      }
      parts.push(`\n\`\`\`\n\n`);
      
      parts.push(`## 🔗 Module Connections (Details)\n`);
      parts.push(`*Extracting import/require statements from source files.*\n\n`);
      if (connectionDetails.length > 0) {
        parts.push(connectionDetails.join(''));
      } else {
        parts.push(`*No dependencies found.*\n\n`);
      }

      const content = parts.join('');
      fileContent.value = "// Architecture Map generation complete. See downloaded file.";

      const filename = `ArchitectureMap_${rootHandle.value.name}.md`;
      const mimeType = "text/markdown;charset=utf-8";

      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Markdown File',
              accept: { 'text/markdown': ['.md'] }
            }]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Save file failed:', err);
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
          }
        }
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    };

    // --- BLACKLIST LOGIC ---
    const blacklistExts = [
      // Images & Graphics
      ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp", ".psd", ".ai",
      // Fonts
      ".ttf", ".woff", ".woff2", ".eot", ".otf",
      // Archives, Executables & System files
      ".zip", ".rar", ".7z", ".tar", ".gz", ".exe", ".dll", ".so", ".bin", ".msi", ".DS_Store",
      // Audio & Video
      ".mp4", ".mp3", ".wav", ".avi", ".mkv", ".mov", ".flv",
      // Databases, PDFs & Build artifacts
      ".class", ".jar", ".war", ".ear", ".sqlite", ".db", ".pdf", ".docx", ".xlsx",
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

      window.addEventListener("dragenter", (e) => {
        e.preventDefault();
        isDragging.value = true;
      });
      window.addEventListener("dragover", (e) => {
        e.preventDefault();
        isDragging.value = true;
      });
      window.addEventListener("dragleave", (e) => {
        e.preventDefault();
        if (!e.relatedTarget || e.relatedTarget.nodeName === "HTML") {
          isDragging.value = false;
        }
      });
      window.addEventListener("drop", (e) => {
        e.preventDefault();
        handleDrop(e);
      });
    });

    const loadFolder = async (handle) => {
      try {
        rootHandle.value = handle;

        selectedPaths.value = [];
        selectedNodes.value = [];
        selectedFileName.value = "";
        fileContent.value = "// Project folder loaded. Explorer is ready.";

        // Read .gitignore if exists
        try {
          const gitignoreHandle = await handle.getFileHandle('.gitignore');
          const file = await gitignoreHandle.getFile();
          const text = await file.text();
          gitignoreRules.value = parseGitignore(text);
        } catch (e) {
          gitignoreRules.value = [];
        }

        // PERF: ignoreTags is already an array - pass directly, no parsing needed
        const children = await scanDirectory(handle, handle.name, ignoreTags.value, gitignoreRules.value);
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
        console.error("Failed to load folder", err);
      }
    };

    const selectFolder = async () => {
      try {
        const handle = await window.showDirectoryPicker();
        await loadFolder(handle);
      } catch (err) {
        console.error("User cancelled or browser not supported", err);
      }
    };

    const isDragging = ref(false);
    watch(isDragging, (val) => {
      if (val) refreshIcons();
    });

    const handleDrop = async (e) => {
      isDragging.value = false;
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;
      
      const item = Array.from(items).find(i => i.kind === 'file');
      if (item) {
        try {
          const handle = await item.getAsFileSystemHandle();
          if (handle && handle.kind === 'directory') {
            await loadFolder(handle);
          } else {
            alert("Please drop a folder, not a file.");
          }
        } catch (err) {
          console.error(err);
          alert("Failed to read dropped folder. Note: File System Access API must be supported.");
        }
      }
    };

    // PERF: ignoreList is now a parameter, parsed once by caller instead of re-computed per directory
    const scanDirectory = async (handle, parentPath = "", ignoreList = [], gitignoreRulesList = []) => {
      const nodes = [];

      for await (const entry of handle.values()) {
        if (ignoreList.includes(entry.name)) continue;

        const currentPath = `${parentPath}/${entry.name}`;
        const relativePath = currentPath.substring(currentPath.indexOf('/') + 1);
        
        if (gitignoreRulesList.length > 0 && gitignoreRulesList.some(regex => regex.test(relativePath) || regex.test(entry.name))) {
          continue;
        }

        if (blockEnvFiles.value && entry.kind === "file") {
          if (entry.name === ".env" || (entry.name.startsWith(".env.") && entry.name !== ".env.example")) {
            continue;
          }
        }

        const node = {
          name: entry.name,
          kind: entry.kind,
          path: currentPath,
          handle: entry,
        };

        if (entry.kind === "directory") {
          node.children = await scanDirectory(entry, currentPath, ignoreList, gitignoreRulesList);
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
      // PERF: removed redundant refreshIcons() — Vue's :key bindings re-render icons automatically
    };

    // PERF: accumulator pattern — avoids creating intermediate arrays on each recursive call
    const getAllFilesInFolder = (node, acc = []) => {
      if (node.kind === "file") {
        acc.push(node);
      } else if (node.kind === "directory" && node.children) {
        node.children.forEach((child) => getAllFilesInFolder(child, acc));
      }
      return acc;
    };

    const toggleFolderSelection = (folderNode) => {
      const allFiles = getAllFilesInFolder(folderNode);

      const safeFiles = allFiles.filter((f) => isSafeToRead(f.name));

      if (safeFiles.length === 0) return;

      // PERF: use selectedPathsSet (O(1) has) for the allSelected check
      const allSelected = safeFiles.every((f) => selectedPathsSet.value.has(f.path));

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
        // Select all safe files — skip if already in set (O(1) check)
        safeFiles.forEach((f) => {
          if (!selectedPathsSet.value.has(f.path)) {
            selectedPaths.value.push(f.path);
            selectedNodes.value.push(f);
          }
        });
      }
      // PERF: removed redundant refreshIcons() — Vue's :key bindings re-render icons automatically
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

          // PERF: skip rendering very large files to prevent UI freeze
          const MAX_PREVIEW_BYTES = 500_000; // 500 KB
          if (file.size > MAX_PREVIEW_BYTES) {
            fileContent.value = `// ⚠️ File quá lớn để preview (${(file.size / 1024).toFixed(0)} KB).\n// File vẫn sẽ được include trong Export nếu được chọn.`;
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
      // PERF: array + join instead of string concatenation
      const parts = [];
      nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? "└── " : "├── ";
        parts.push(`${prefix}${connector}${node.name}\n`);
        if (node.kind === "directory" && node.children) {
          const newPrefix = prefix + (isLast ? "    " : "│   ");
          parts.push(generateTreeString(node.children, newPrefix));
        }
      });
      return parts.join('');
    };

    const generateExportContent = async () => {
      if (!rootHandle.value) return "";
      
      fileContent.value = "// Generating export content... this might take a moment if many files are selected.";
      // PERF: use array + join for string building — avoids creating O(n) intermediate strings
      const parts = [];
      const format = exportFormat.value;

      if (selectedNodes.value.length > 0) {
        const treeStr = generateTreeString(projectTree.value);
        
        // --- Add Repomix-style Preamble & Structure ---
        if (format === 'xml') {
          parts.push(`<!-- 
This document contains a packed representation of selected project files.
It is designed to be easily consumable by AI systems.
-->\n\n`);
          parts.push(`<project-structure>\n<![CDATA[\n${treeStr}]]>\n</project-structure>\n\n`);
          parts.push(`<documents count="${selectedNodes.value.length}">\n\n`);
        } else if (format === 'md') {
          parts.push(`> This document contains a packed representation of selected project files.\n> It is designed to be easily consumable by AI systems.\n\n`);
          parts.push(`# 🗂️ PROJECT STRUCTURE\n\`\`\`text\n${treeStr}\`\`\`\n\n`);
          parts.push(`# EXPORTED FILES (${selectedNodes.value.length})\n\n`);
        } else {
          parts.push(`================================================================\n`);
          parts.push(`Project Summary & Selected Files\n`);
          parts.push(`================================================================\n\n`);
          parts.push(`🗂️ PROJECT STRUCTURE:\n${treeStr}\n\n`);
          parts.push(`📦 EXPORTED FILES (${selectedNodes.value.length}):\n\n`);
        }

        for (const node of selectedNodes.value) {
          try {
            const file = await node.handle.getFile();
            
            if (format === 'xml') {
              parts.push(`<document path="${node.path}">\n`);
            } else if (format === 'md') {
              const ext = node.name.split('.').pop();
              parts.push(`## \`${node.path}\`\n\`\`\`${ext}\n`);
            } else {
              parts.push(`================\nFile: ${node.path}\n================\n`);
            }

            if (!isSafeToRead(file.name)) {
              if (format === 'xml') parts.push(`<!-- Preview skipped: Unsupported or binary format -->\n`);
              else parts.push(`[Preview skipped: Unsupported or binary format]\n`);
            } else {
              const text = await file.text();
              if (format === 'xml') {
                parts.push(`<![CDATA[\n${text}\n]]>\n`);
              } else {
                parts.push(text + (text.endsWith('\n') ? "" : "\n"));
              }
            }
            
            if (format === 'xml') {
              parts.push(`</document>\n\n`);
            } else if (format === 'md') {
              parts.push(`\`\`\`\n\n`);
            } else {
              parts.push(`\n\n`);
            }
          } catch (e) {
            if (format === 'xml') parts.push(`<!-- Error reading file -->\n\n`);
            else parts.push(`[Error reading file]\n\n`);
          }
        }
        
        if (format === 'xml') {
          parts.push(`</documents>\n`);
        }
      } else {
        // Fallback if no files selected, just print the tree
        const treeStr = generateTreeString(projectTree.value);
        if (format === 'xml') {
          parts.push(`<project-structure>\n<![CDATA[\n${treeStr}]]>\n</project-structure>\n\n`);
        } else if (format === 'md') {
          parts.push(`# 🗂️ PROJECT STRUCTURE\n\`\`\`text\n${treeStr}\`\`\`\n\n`);
        } else {
          parts.push("🗂️ PROJECT STRUCTURE:\n" + treeStr + "\n\n");
        }
      }
      
      return parts.join('');
    };

    const downloadExport = async () => {
      const content = await generateExportContent();
      if (!content) return;
      
      const ext = exportFormat.value;
      const filename = `MapperProject_${rootHandle.value.name}.${ext}`;
      const mimeType = "text/plain;charset=utf-8";
      
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Exported File',
              accept: { 'text/plain': [`.${ext}`] }
            }]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
          fileContent.value = `// Export complete. File saved as .${ext}`;
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Save file failed:', err);
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            fileContent.value = `// Export complete. File downloaded as .${ext}`;
          }
        }
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        fileContent.value = `// Export complete. File downloaded as .${ext}`;
      }
      showExportModal.value = false;
    };

    const copyExport = async () => {
      const content = await generateExportContent();
      if (!content) return;
      
      try {
        await navigator.clipboard.writeText(content);
        fileContent.value = "// Context successfully copied to clipboard!";
      } catch (err) {
        console.error('Failed to copy: ', err);
        fileContent.value = "// Error: Failed to copy to clipboard.";
      }
      showExportModal.value = false;
    };

    return {
      rootHandle,
      projectTree,
      selectedFileName,
      fileContent,
      selectedPaths,
      selectedNodes,
      selectedPathsSet,
      sidebarWidth,
      isResizing,
      startResize,
      selectFolder,
      isDragging,
      handleDrop,
      previewFile,
      toggleSelection,
      toggleFolderSelection,
      showExportModal,
      exportFormat,
      downloadExport,
      copyExport,
      exportArchitectureMap,
      blockEnvFiles,
      ignoreTags,
      draftIgnoreTags,
      draftIgnoreInput,
      openSettings,
      addIgnoreTag,
      removeIgnoreTag,
      handleIgnoreKeydown,
      showSettings,
      applySettings,
      reScanFolder,
      currentLanguage,
    };
  },
});

app.component("file-tree", FileTree);
app.mount("#app");
