export function applySecurityHeaders(res: Response): Response {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self'";
  // Allow images/videos from Vercel Blob public host(s)
  const vercelBlobWildcard = "https://*.public.blob.vercel-storage.com";
  // Optionally allow a specific hostname via env if provided
  const specificBlobHost = process.env.BLOB_HOSTNAME
    ? `https://${process.env.BLOB_HOSTNAME}`
    : null;
  const imgSrc = [
    "img-src 'self' data: blob:",
    vercelBlobWildcard,
    specificBlobHost,
  ]
    .filter(Boolean)
    .join(" ");
  const mediaSrc = [
    "media-src 'self' blob:",
    vercelBlobWildcard,
    specificBlobHost,
  ]
    .filter(Boolean)
    .join(" ");
  const csp =
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      imgSrc,
      mediaSrc,
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; ") + ";";
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Permissions-Policy",
    "geolocation=() microphone=() camera=()"
  );
  return res;
}
