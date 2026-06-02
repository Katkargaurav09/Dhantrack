// src/utils/shareImage.js
// One shared helper for saving/sharing images that works BOTH on a real
// Capacitor Android device AND in a desktop browser.
//
// On device: writes the PNG to the app's Cache directory, then opens the
// native Share sheet so the user can pick WhatsApp / Save to Gallery / Files.
// On desktop (no Capacitor): falls back to a normal browser download.
//
// Usage:
//   import { saveOrShareImage } from "../utils/shareImage";
//   await saveOrShareImage(blob, "dhantrack-personality.png", {
//     title: "My DhanTrack Personality",
//     text: "I'm a Smart Saver!",
//   });

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// Convert a Blob to a base64 string (without the data: prefix)
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result looks like "data:image/png;base64,XXXX" — strip the prefix
      const result = reader.result || "";
      const base64 = String(result).split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Save or share an image blob.
 * @param {Blob} blob - the PNG/JPEG blob to share
 * @param {string} fileName - e.g. "dhantrack-report.png"
 * @param {{title?: string, text?: string}} meta - share sheet text
 * @returns {Promise<"shared"|"downloaded">}
 */
export async function saveOrShareImage(blob, fileName, meta = {}) {
  if (!blob) throw new Error("No image to share");

  const isNative = Capacitor.isNativePlatform && Capacitor.isNativePlatform();

  // ── NATIVE (Android app) path ──
  if (isNative) {
    const base64 = await blobToBase64(blob);

    // Write to Cache directory (no storage permission needed)
    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    // Get a file:// URI we can hand to the Share sheet
    const uriResult = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });

    await Share.share({
      title: meta.title || "DhanTrack",
      text: meta.text || "",
      url: uriResult.uri,        // attaches the image file to the share
      dialogTitle: "Share or save your image",
    });

    return "shared";
  }

  // ── DESKTOP / web browser fallback: normal download ──
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return "downloaded";
}