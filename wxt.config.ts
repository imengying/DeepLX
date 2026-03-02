import path from "node:path"
import { defineConfig } from "wxt"

export default defineConfig({
  srcDir: "src",
  imports: false,
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
  manifest: {
    name: "DeepLX",
    description: "DeepLX webpage and selection translator",
    permissions: ["storage", "tabs", "activeTab"],
    host_permissions: ["<all_urls>", "https://api.deeplx.org/*", "https://translate.googleapis.com/*"],
    icons: {
      "16": "icons/github-16.png",
      "32": "icons/github-32.png",
      "48": "icons/github-48.png",
      "128": "icons/github-128.png"
    },
    action: {
      default_title: "DeepLX",
      default_icon: {
        "16": "icons/github-16.png",
        "32": "icons/github-32.png",
        "48": "icons/github-48.png"
      }
    }
  }
})
