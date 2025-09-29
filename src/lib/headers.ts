export function applySecurityHeaders(res: Response): Response {
  const isDev = process.env.NODE_ENV !== "production";
  // Google Maps domains we need to allow
  const GOOGLE_SCRIPT = "https://maps.googleapis.com"; // main JS loader
  const GOOGLE_STATIC = "https://maps.gstatic.com"; // supporting assets
  const GOOGLE_FONTS = "https://fonts.googleapis.com"; // Google Fonts for Maps UI
  // NOTE: Next.js emits a small inline bootstrap script. Long-term we should migrate to a nonce-based CSP.
  // Interim approach: keep 'unsafe-inline' (plus 'strict-dynamic' to reduce risk) in prod until nonce wiring is added.
  // If an env flag FORCE_CSP_NONCE is introduced later, we can branch and inject a nonce instead.
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-inline' ${GOOGLE_SCRIPT} ${GOOGLE_STATIC}`
    : `script-src 'self' 'unsafe-inline' 'strict-dynamic' ${GOOGLE_SCRIPT} ${GOOGLE_STATIC}`;
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

  const styleSrc = `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS}`; // Google Maps injects inline styles and loads external fonts
  const fontSrc = `font-src 'self' data:`; // allow embedded fonts (extend if using fonts.gstatic.com)
  const objectSrc = "object-src 'none'";
  const baseUri = "base-uri 'self'";
  const formAction = "form-action 'self'";
  const csp =
    [
      "default-src 'self'",
      scriptSrc,
      styleSrc,
      fontSrc,
      imgSrc,
      mediaSrc,
      connectSrc,
      objectSrc,
      baseUri,
      formAction,
      // Allow embedding Google Maps iframe in review preview
      `frame-src 'self' ${GOOGLE_SCRIPT} ${GOOGLE_STATIC} https://www.google.com https://maps.googleapis.com`,
      "frame-ancestors 'none'",
    ].join("; ") + ";";
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  // Comma separate directives per spec to avoid parse errors.
  res.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  return res;
}
