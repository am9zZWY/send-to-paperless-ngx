import { isPdfFromUrl } from "./util.js";

/**
 * Extracts the filename from a URL.
 * @param {string} url - The URL to extract the filename from.
 * @returns {string} - The filename or "document.pdf" if extraction fails.
 */
const getFilename = (url) => {
  try {
    return new URL(url).pathname.split("/").pop() || "document.pdf";
  } catch {
    return "document.pdf";
  }
};

/**
 * Fetches the Paperless configuration from browser storage.
 * @returns {Promise<{paperlessUrl: string, apiKey: string}>} - The configuration object.
 */
async function getConfig() {
  const { paperlessUrl = "", apiKey = "" } = await browser.storage.local.get([
    "paperlessUrl",
    "apiKey",
  ]);
  return { paperlessUrl, apiKey };
}

/**
 * Actual request to Paperless-ngx API
 * Expects URL and API Key already loaded in the config
 *
 * @param {*} pdfBlob
 * @param {*} filename
 */
async function upload(pdfBlob, filename) {
  let { paperlessUrl, apiKey } = await getConfig();
  if (!paperlessUrl || !apiKey) throw new Error("Paperless-ngx is not configured.");

  if (paperlessUrl.endsWith("/")) {
    paperlessUrl = paperlessUrl.slice(0, -1);
  }

  const formData = new FormData();
  formData.append("document", pdfBlob, filename);

  return fetch(`${paperlessUrl}/api/documents/post_document/`, {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}` },
    body: formData,
  });
}

async function uploadFromUrl(pdfUrl) {
  try {
    if (!isPdfFromUrl(pdfUrl)) throw new Error("Not a PDF URL");

    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

    const pdfBlob = await response.blob();
    const filename = getFilename(pdfUrl);

    const uploadResponse = await upload(pdfBlob, filename);
    if (!uploadResponse.ok) throw new Error(await uploadResponse.text());

    return { success: true, filename };
  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Uploads from a blob
 * @param {*} pdfUrl
 * @returns
 */
async function uploadFromBlob({ buffer, filename }) {
  try {
    const pdfBlob = new Blob([buffer], { type: "application/pdf" });

    const uploadResponse = await upload(pdfBlob, filename);
    if (!uploadResponse.ok) throw new Error(await uploadResponse.text());

    return { success: true, filename };
  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, error: err.message };
  }
}

browser.runtime.onMessage.addListener((request) => {
  if (request.action === "uploadFromUrl") return uploadFromUrl(request.url);
  if (request.action === "uploadFromBlob") return uploadFromBlob(request);
});

browser.browserAction.onClicked.addListener(async (tab) => {
  if (tab.url && isPdfFromUrl(tab.url)) {
    await uploadFromUrl(tab.url);
  }
});

// Create context menu item
browser.contextMenus.create({
  id: "send-to-paperless",
  title: "Send to Paperless-ngx",
  contexts: ["link", "page"],
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "send-to-paperless") return;

  const url = info.linkUrl || tab.url;
  if (isPdfFromUrl(url)) {
    await uploadFromUrl(url);
  }
});
