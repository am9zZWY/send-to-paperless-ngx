/**
 * Checks if a URL points to a PDF file.
 * @param {string} url - The URL to check.
 * @returns {boolean} - True if the URL ends with ".pdf" (case-insensitive).
 */
export async function isPdfFromUrl(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "";
    return (
      contentType.toLowerCase().includes("application/pdf") || url.toLowerCase().endsWith(".pdf")
    );
  } catch (err) {
    console.warn("Failed to check file type, falling back to URL extension:", err);
    return url.toLowerCase().endsWith(".pdf");
  }
}
