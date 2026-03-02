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
      "16": "icons/deeplx.svg",
      "32": "icons/deeplx.svg",
      "48": "icons/deeplx.svg",
      "128": "icons/deeplx.svg"
    },
    action: {
      default_title: "DeepLX",
      default_icon: {
        "16": "icons/deeplx.svg",
        "32": "icons/deeplx.svg",
        "48": "icons/deeplx.svg"
      }
    }
  }
})
