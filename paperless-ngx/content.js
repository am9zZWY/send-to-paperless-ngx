async function getPdfBlobs() {
  const objects = Array.from(document.querySelectorAll("object, embed"));
  const blobs = [];

  for (const el of objects) {
    const url = el.data || el.src;
    if (!url?.startsWith("blob:")) continue;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      if (blob.type === "application/pdf") {
        blobs.push({ blob, filename: "document.pdf" });
      }
    } catch (err) {
      console.warn("Cannot read blob URL", url, err);
    }
  }

  return Promise.all(
    blobs.map(async ({ blob, filename }) => ({
      buffer: await blob.arrayBuffer(),
      filename,
    })),
  );
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPdfBlobs") {
    getPdfBlobs().then((pdfBuffers) => {
      sendResponse({ pdfBuffers });
    });
    return true;
  }
});
