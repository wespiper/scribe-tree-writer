# Page snapshot

```yaml
- text: '[plugin:vite:import-analysis] Failed to resolve import "@/contexts/AuthContext" from "src/App.tsx". Does the file exist? /Users/wnp/Desktop/scribe-tree-writer/frontend/src/App.tsx:2:29 16 | } 17 | import { Routes, Route, Navigate } from "react-router-dom"; 18 | import { AuthProvider } from "@/contexts/AuthContext"; | ^ 19 | import { Toaster } from "@/components/ui/toaster"; 20 | import ProtectedRoute from "@/components/Auth/ProtectedRoute"; at TransformPluginContext._formatError (file:///Users/wnp/Desktop/scribe-tree-writer/frontend/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49258:41) at TransformPluginContext.error (file:///Users/wnp/Desktop/scribe-tree-writer/frontend/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49253:16) at normalizeUrl (file:///Users/wnp/Desktop/scribe-tree-writer/frontend/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:64291:23) at process.processTicksAndRejections (node:internal/process/task_queues:105:5) at async file:///Users/wnp/Desktop/scribe-tree-writer/frontend/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:64423:39 at async Promise.all (index 4) at async TransformPluginContext.transform (file:///Users/wnp/Desktop/scribe-tree-writer/frontend/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:64350:7) at async PluginContainer.transform (file:///Users/wnp/Desktop/scribe-tree-writer/frontend/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49099:18) at async loadAndTransform (file:///Users/wnp/Desktop/scribe-tree-writer/frontend/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:51977:27 Click outside, press Esc key, or fix the code to dismiss. You can also disable this overlay by setting'
- code: server.hmr.overlay
- text: to
- code: 'false'
- text: in
- code: vite.config.ts
- text: .
```
