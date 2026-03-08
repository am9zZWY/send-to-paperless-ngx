import { isPdfFromUrl } from "./util.js";

document.addEventListener("DOMContentLoaded", async () => {
  const setupEl = document.getElementById("setup");
  const mainEl = document.getElementById("main");
  const urlInput = document.getElementById("urlInput");
  const keyInput = document.getElementById("keyInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const saveMsg = document.getElementById("saveMsg");
  const saveMsgMain = document.getElementById("saveMsgMain");

  let paperlessUrl = "";
  let apiKey = "";
  let editMode = false;

  const config = await browser.storage.local.get(["paperlessUrl", "apiKey"]);
  paperlessUrl = (config.paperlessUrl || "").trim();
  apiKey = (config.apiKey || "").trim();

  render();

  urlInput.onblur = keyInput.onblur = saveConfig;
  urlInput.onkeydown = keyInput.onkeydown = (e) => e.key === "Enter" && saveConfig();

  uploadBtn.onclick = upload;
  editBtn.onclick = () => {
    editMode = !editMode;
    render();
  };
  saveBtn.onclick = () => {
    editMode = false;
    render();
  };

  function configured() {
    return paperlessUrl && apiKey;
  }

  function render() {
    const ready = configured();

    setupEl.style.display = !ready || editMode ? "block" : "none";
    mainEl.style.display = ready && !editMode ? "block" : "none";

    urlInput.value = paperlessUrl;
    keyInput.value = apiKey;

    uploadBtn.disabled = !ready || editMode;
    uploadBtn.textContent = ready ? "Upload" : "Configure first";

    editBtn.style.display = ready ? "block" : "none";
    editBtn.textContent = editMode ? "Cancel" : "Edit";

    saveMsg.textContent = "";
    saveMsgMain.textContent = "";
  }

  async function saveConfig() {
    paperlessUrl = urlInput.value.trim();
    apiKey = keyInput.value.trim();

    await browser.storage.local.set({ paperlessUrl, apiKey });

    editMode = false;
    saveMsg.textContent = saveMsgMain.textContent = "✓ Saved!";
    setTimeout(render, 1500);
  }

  function handleResult(result) {
    if (!result) return;

    if (result.success) {
      saveMsgMain.textContent = `Uploaded ${result.filename}`;
      saveMsgMain.classList.remove("error");
    } else {
      saveMsgMain.textContent = `Upload failed: ${result.error}`;
      saveMsgMain.classList.add("error");
    }
  }

  async function upload() {
    if (!configured()) return;

    saveMsgMain.classList.remove("error");
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.url && isPdfFromUrl(tab.url)) {
      const result = await browser.runtime.sendMessage({
        action: "uploadFromUrl",
        url: tab.url,
      });
      handleResult(result);
      return;
    }

    let pdfBuffers = [];
    try {
      const res = await browser.tabs.sendMessage(tab.id, {
        action: "getPdfBlobs",
      });
      pdfBuffers = res?.pdfBuffers || [];
    } catch {}

    if (!pdfBuffers.length) {
      showMessage("No PDFs found on this page");
      return;
    }

    for (const pdf of pdfBuffers) {
      const result = await browser.runtime.sendMessage({
        action: "uploadFromBlob",
        buffer: pdf.buffer,
        filename: pdf.filename,
      });

      handleResult(result);
    }

    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  }
});
