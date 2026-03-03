import path from "node:path"
import { defineConfig } from "wxt"

const firefoxAddonId = process.env.FIREFOX_ADDON_ID ?? "deeplx@mengying"

export default defineConfig({
  srcDir: "src",
  publicDir: "public",
  imports: false,
  manifestVersion: 3,
  zip: {
    exclude: ["static/**"],
    excludeSources: ["static/**"],
  },
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
    },
    browser_specific_settings: {
      gecko: {
        id: firefoxAddonId,
        data_collection_permissions: {
          required: [
            "websiteContent",
          ],
          optional: [
            "authenticationInfo",
          ],
        },
      }
    }
  }
})
