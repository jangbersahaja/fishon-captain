export function applySecurityHeaders(res: Response): Response {
  const isDev = process.env.NODE_ENV !== "production";
  // Google Maps domains we need to allow
  const GOOGLE_SCRIPT = "https://maps.googleapis.com"; // main JS loader
  const GOOGLE_STATIC = "https://maps.gstatic.com"; // supporting assets
  // Add 'unsafe-inline' in dev so dynamic Next scripts & React refresh work; optionally add 'strict-dynamic' later.
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-inline' ${GOOGLE_SCRIPT} ${GOOGLE_STATIC}`
    : `script-src 'self' ${GOOGLE_SCRIPT} ${GOOGLE_STATIC}`;
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
    GOOGLE_SCRIPT,
    GOOGLE_STATIC,
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
  // Allow XHR/web fetches to our origin + Google Maps (tile vector endpoints use maps.googleapis.com / *.googleapis.com)
  const connectSrc = ["connect-src 'self'", GOOGLE_SCRIPT, GOOGLE_STATIC].join(
    " "
  );

  const styleSrc = "style-src 'self' 'unsafe-inline'"; // Google Maps injects inline styles
  const csp =
    [
      "default-src 'self'",
      scriptSrc,
      styleSrc,
      imgSrc,
      mediaSrc,
      connectSrc,
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
