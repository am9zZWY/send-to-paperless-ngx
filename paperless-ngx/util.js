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

/**
 * Remove trailingslash if it exists
 * @param {string} s - Any string
 * @return {string} - String with removed trailingslash
 */
export function cleanURL(s) {
  let cleanedString = s.trim();
  if (cleanedString.endsWith("/")) {
    cleanedString = cleanedString.slice(0, -1);
  }
  return cleanedString.toLowerCase();
}

/**
 * Execute a function lazily
 * @param {*} fn
 * @param {*} delay
 * @returns
 */
export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
