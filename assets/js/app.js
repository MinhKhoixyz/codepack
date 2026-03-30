const { createApp, ref, onMounted, nextTick } = Vue;

// Hàm hỗ trợ render icon Lucide sau khi DOM update
const refreshIcons = () => {
  nextTick(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });
};

// 1. COMPONENT: File Tree (Đã "độ" UI)
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
        >
          <i v-if="node.kind === 'directory'" :data-lucide="isExpanded(node) ? 'folder-open' : 'folder'" class="icon-sm"></i>
          <i v-else data-lucide="file-code-2" class="icon-sm"></i>
          
          <span class="node-name">{{ node.name }}</span>
          
          <input type="checkbox" v-if="node.kind === 'file'" class="file-checkbox" :checked="selectedPaths.includes(node.path)" />
        </div>
        
        <file-tree 
          v-if="node.kind === 'directory' && isExpanded(node)" 
          :nodes="node.children"
          :selected-paths="selectedPaths"
          @select="$emit('select', $event)"
          @toggle="$emit('toggle', $event)"
        ></file-tree>
      </li>
    </ul>
  `,
  setup(props, { emit }) {
    const expandedNodes = ref(new Set());

    const isExpanded = (node) => expandedNodes.value.has(node.path);

    const handleInteraction = (node) => {
      if (node.kind === "directory") {
        if (isExpanded(node)) {
          expandedNodes.value.delete(node.path);
        } else {
          expandedNodes.value.add(node.path);
        }
        refreshIcons(); // Render lại icon folder đóng/mở
      } else {
        // Thay vì chỉ preview, ta tích chọn luôn khi click vào dòng
        emit("toggle", node);
        emit("select", node);
      }
    };

    return { isExpanded, handleInteraction };
  },
};

// 2. MAIN APP
const app = createApp({
  setup() {
    const rootHandle = ref(null);
    const projectTree = ref([]);
    const selectedFileName = ref("");
    const fileContent = ref(
      "// Welcome to XYZ Project Mapper.\n// Click Open Project Folder to begin.\n// Click on a file path to both preview it and select it for AI Export.\n// Selected files will appear blue.",
    );

    const selectedPaths = ref([]);
    const selectedNodes = ref([]);

    onMounted(() => {
      refreshIcons(); // Render icon lần đầu
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

        // Tự động mở folder gốc
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
      for await (const entry of handle.values()) {
        // List bỏ qua chuẩn
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist" ||
          entry.name === ".idea" ||
          entry.name === ".vscode"
        )
          continue;

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
      return nodes.sort(
        (a, b) => b.kind.localeCompare(a.kind) || a.name.localeCompare(b.name),
      );
    };

    // Hàm tích chọn: Click vào dòng là tích luôn
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
    };

    const previewFile = async (node) => {
      if (node.kind === "file") {
        try {
          fileContent.value = "// Loading file content...";
          const file = await node.handle.getFile();
          selectedFileName.value = node.path; // Hiện full path cho 'xịn'
          fileContent.value = await file.text();
        } catch (e) {
          fileContent.value =
            "// ⚠️ Cannot preview this file type (Image, PDF, or Binary).";
        }
      }
    };

    // Sơ đồ ASCII xịn hơn
    const generateTreeString = (nodes, prefix = "") => {
      let result = "";
      nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? "└── " : "├── ";

        // Đánh dấu file nào được chọn trong sơ đồ
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

      let finalContent =
        "🗂️ PROJECT STRUCTURE:\n" +
        generateTreeString(projectTree.value) +
        "\n\n";

      if (selectedNodes.value.length > 0) {
        for (const node of selectedNodes.value) {
          try {
            const file = await node.handle.getFile();
            const text = await file.text();
            finalContent += `--- Start of file: ${node.path} ---\n`;
            finalContent += text + "\n";
            finalContent += `--- End of file: ${node.path} ---\n\n`;
          } catch (e) {
            finalContent += `--- Start of file: ${node.path} ---\n// ⚠️ Cannot read binary file.\n--- End of file: ${node.path} ---\n\n`;
          }
        }
      } else {
        finalContent +=
          "// No specific files selected to export. Project structure only.";
      }

      // Reset preview
      fileContent.value = "// Export complete. See downloaded file.";

      // Download
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
      selectFolder,
      previewFile,
      toggleSelection,
      exportForAI,
    };
  },
});

app.component("file-tree", FileTree);
app.mount("#app");
