import { isPdfFromUrl } from "./util.js";

/**
 * Extracts the filename from a URL.
 * @param {string} url - The URL to extract the filename from.
 * @returns {string} - The filename or "document.pdf" if extraction fails.
 */
const getFilename = (url) => {
  try {
    return new URL(url).pathname.split("/").pop() || "document.pdf";
  } catch (err) {
    console.error("Invalid URL provided:", err);
    return "document.pdf";
  }
};

/**
 * Fetches the Paperless configuration from browser storage.
 * @returns {Promise<{paperlessUrl: string, apiKey: string}>} - The configuration object.
 */
async function getConfig() {
  const config = await browser.storage.local.get(["paperlessUrl", "apiKey"]);
  return {
    paperlessUrl: config.paperlessUrl || "",
    apiKey: config.apiKey || "",
  };
}

/**
 * Actual request to Paperless-ngx API
 * Expects URL and API Key already loaded in the config
 *
 * @param {*} pdfBlob
 * @param {*} filename
 */
async function upload(pdfBlob, filename) {
  const { paperlessUrl, apiKey } = await getConfig();
  if (!paperlessUrl || !apiKey) {
    throw new Error("Paperless-ngx is not configured.");
  }

  const formData = new FormData();
  formData.append("document", pdfBlob, filename);
  return await fetch(`${paperlessUrl}/api/documents/post_document/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
    },
    body: formData,
  });
}

/**
 * Uploads from an URL
 * @param {string} pdfUrl - The URL of the PDF to upload.
 */
async function uploadFromUrl(pdfUrl) {
  try {
    if (!isPdfFromUrl(pdfUrl)) {
      throw new Error("Not a PDF URL");
    }
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const pdfBlob = await response.blob();
    const filename = getFilename(pdfUrl);
    console.log("Uploading from URL ...");
    const uploadResponse = await upload(pdfBlob, filename);
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(errorText);
    }
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
    console.log("Uploading from Blob ...");
    const uploadResponse = await upload(pdfBlob, filename);
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(errorText);
    }
    return { success: true, filename };
  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, error: err.message };
  }
}

// Handle browser action (toolbar icon click)
browser.browserAction.onClicked.addListener(async (tab) => {
  if (tab.url && isPdfFromUrl(tab.url)) {
    await uploadToPaperless(tab.url);
  }
});

// Handle messages from other parts of the extension
browser.runtime.onMessage.addListener(async (request) => {
  switch (request.action) {
    case "uploadFromUrl":
      return await uploadFromUrl(request.url);

    case "uploadFromBlob":
      return await uploadFromBlob(request);
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
  if (info.menuItemId === "send-to-paperless") {
    const url = info.linkUrl || tab.url;
    if (isPdfFromUrl(url)) {
      await uploadToPaperless(url);
    }
  }
});
