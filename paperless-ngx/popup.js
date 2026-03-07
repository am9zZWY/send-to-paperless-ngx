import { isPdfFromUrl } from "./util.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  const setupEl = document.getElementById("setup");
  const mainEl = document.getElementById("main");
  const urlInput = document.getElementById("urlInput");
  const keyInput = document.getElementById("keyInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const saveMsg = document.getElementById("saveMsg");
  const saveMsgMain = document.getElementById("saveMsgMain");

  // State
  let paperlessUrl = "";
  let apiKey = "";
  let currentUrl = "";
  let editMode = false;
  let justSaved = false;

  // Initialize the popup
  async function init() {
    // Load saved configuration
    const config = await browser.storage.local.get(["paperlessUrl", "apiKey"]);
    paperlessUrl = (config.paperlessUrl || "").trim();
    apiKey = (config.apiKey || "").trim();

    // Get current tab URL
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    currentUrl = tab?.url || "";

    // Render UI based on state
    render();

    // Bind events
    urlInput.onblur = urlInput.onkeydown = handleUrlInput;
    keyInput.onblur = keyInput.onkeydown = handleKeyInput;
    uploadBtn.onclick = upload;
    editBtn.onclick = toggleEditMode;
    saveBtn.onclick = exitEditMode;
  }

  // Render UI based on current state
  function render() {
    const configured = !!paperlessUrl.trim() && !!apiKey.trim();

    // Show setup or main view based on configuration and edit mode
    setupEl.style.display = !configured || editMode ? "block" : "none";
    mainEl.style.display = configured && !editMode ? "block" : "none";

    urlInput.value = paperlessUrl;
    keyInput.value = apiKey;

    uploadBtn.disabled = !configured || editMode;
    uploadBtn.textContent = configured ? "Upload" : "Configure first";

    editBtn.textContent = editMode ? "Cancel" : "Edit";
    editBtn.style.display = configured ? "block" : "none";

    if (!justSaved) {
      saveMsg.textContent = saveMsgMain.textContent = "";
    }
  }

  // Toggle edit mode
  function toggleEditMode() {
    editMode = !editMode;
    render();
  }

  function exitEditMode() {
    editMode = false;
    render();
  }

  // Handle URL input events
  function handleUrlInput(e) {
    if (e.key === "Enter" || e.type === "blur") {
      save();
    }
  }

  // Handle API key input events
  function handleKeyInput(e) {
    if (e.key === "Enter" || e.type === "blur") {
      save();
    }
  }

  // Save configuration
  async function save() {
    paperlessUrl = urlInput.value.trim();
    apiKey = keyInput.value.trim();

    await browser.storage.local.set({
      paperlessUrl: paperlessUrl,
      apiKey: apiKey,
    });

    justSaved = true;
    editMode = false;
    saveMsg.textContent = saveMsgMain.textContent = "✓ Saved!";
    setTimeout(() => {
      justSaved = false;
      render();
    }, 1800);
  }

  // Upload PDF to Paperless
  async function upload() {
    saveMsgMain.classList.remove("error");
    if (!paperlessUrl.trim() || !apiKey.trim()) {
      return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await browser.tabs.sendMessage(tab.id, {
        action: "getPdfBlobs",
      });
      const { pdfBuffers } = response;

      if (!pdfBuffers || !pdfBuffers.length) {
        saveMsgMain.textContent = "No PDFs found on this page";
        saveMsgMain.classList.add("error");
        return;
      }

      if (tab?.url && isPdfFromUrl(tab?.url)) {
        const result = await browser.runtime.sendMessage({
          action: "uploadFromUrl",
          url: tab?.url,
        });
        if (result.success) {
          saveMsgMain.textContent = `Uploaded ${result.filename}`;
          saveMsgMain.classList.remove("error");
        } else {
          saveMsgMain.textContent = `Upload failed: ${result.error}`;
          saveMsgMain.classList.add("error");
        }
      }

      for (const { buffer, filename } of pdfBuffers) {
        const result = await browser.runtime.sendMessage({
          action: "uploadFromBlob",
          buffer,
          filename,
        });
        if (result.success) {
          saveMsgMain.textContent = `Uploaded ${result.filename}`;
          saveMsgMain.classList.remove("error");
        } else {
          saveMsgMain.textContent = `Upload failed: ${result.error}`;
          saveMsgMain.classList.add("error");
        }
      }
    } catch (err) {
      saveMsgMain.textContent = `Upload failed: ${err.message}`;
      saveMsgMain.classList.add("error");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload";
    }
  }

  // Start the popup
  init();
});
