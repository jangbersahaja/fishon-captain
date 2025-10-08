# External Video Normalization Worker (Template)

This folder contains a **copy-paste template** for deploying the FishOn external video normalization + trimming worker as a **standalone Vercel project**.

> IMPORTANT: Do **NOT** import server-only app code from the main Captain repo. This worker must stay lean, stateless, and isolated.

---

## ✨ Responsibilities

1. Download original uploaded video (public URL provided by Captain app)
2. Optionally seek to `trimStartSec` (accurate keyframe-aware seek)
3. Transcode & normalize to a max 30s 720p H.264/AAC MP4
4. Generate a thumbnail (JPEG) ~1s into trimmed segment
5. Upload both assets to Vercel Blob storage
6. Return JSON result (QStash forwards to Captain callback endpoint)

No database writes happen here—persistence is handled when the Captain app receives the callback at `/api/videos/normalize-callback`.

---

## 🔐 Environment Variables

| Name                           | Required | Description                                                                                                      |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `VIDEO_WORKER_SECRET`          | Yes      | Shared bearer token. Must match the Captain app's value. Used to authenticate the forwarded request from QStash. |
| `VERCEL_BLOB_READ_WRITE_TOKEN` | Yes      | Token for `@vercel/blob` uploads.                                                                                |
| `LOG_LEVEL`                    | No       | `debug`, `info` (default), or `error`.                                                                           |

Place them in a `.env` file locally:

```
VIDEO_WORKER_SECRET=change-me
VERCEL_BLOB_READ_WRITE_TOKEN=...blob-token...
LOG_LEVEL=info
```

Or start from the provided example:

```bash
cp .env.example .env
# then edit .env to insert real secrets
```

---

## 🏗 Tech Stack

- Runtime: Vercel Edge Function (Node.js) or Node Serverless Function (uses ffmpeg — requires Node runtime)
- FFmpeg: `fluent-ffmpeg` + `ffmpeg-static`
- Storage: `@vercel/blob`
- Queue: Upstash QStash (Captain app already publishes; worker only needs to respond)

> Use the **Node.js Serverless Function runtime** (NOT Edge) because ffmpeg binaries are required.

---

## 📦 `package.json` (example)

```json
{
  "name": "fishon-external-video-worker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vercel dev",
    "build": "echo 'Vercel handles build'",
    "lint": "eslint ."
  },
  "dependencies": {
    "@vercel/blob": "^0.23.0",
    "ffmpeg-static": "^5.2.0",
    "fluent-ffmpeg": "^2.1.2"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0"
  }
}
```

---

## 🧪 Local Test (Manual)

You can simulate a request locally:

```bash
curl -X POST http://localhost:3000/api/worker-normalize \
  -H "Authorization: Bearer $VIDEO_WORKER_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{
    "videoId": "test-123",
    "originalUrl": "https://example.com/sample.mp4",
    "trimStartSec": 12.5
  }'
```

---

## 🧩 Response (Success)

```json
{
  "success": true,
  "videoId": "test-123",
  "readyUrl": "https://.../captain-videos/normalized/test-123-720p.mp4",
  "normalizedBlobKey": "captain-videos/normalized/test-123-720p.mp4",
  "thumbnailUrl": "https://.../captain-videos/thumbs/test-123.jpg",
  "thumbnailBlobKey": "captain-videos/thumbs/test-123.jpg",
  "processingMs": 4210,
  "originalDurationSec": 183.42,
  "processedDurationSec": 30,
  "appliedTrimStartSec": 12.5
}
```

---

## ⚠️ Error Example

```json
{
  "success": false,
  "videoId": "test-123",
  "error": "ffmpeg_error",
  "message": "spawn error: ..."
}
```

---

## 🚀 Deploy

1. Create a new Vercel project (Node.js runtime)
2. Copy `normalize.ts` (or `normalize.js`) handler into `api/worker-normalize.ts`
3. Add env vars in Vercel dashboard
4. Deploy
5. Set `EXTERNAL_WORKER_URL=https://fishon-video-worker.vercel.app/api/worker-normalize` in Captain app

---

## 🔍 Verification Checklist

- [ ] Captain app `/api/videos/queue` logs show payload with correct `trimStartSec`
- [ ] Worker logs show `appliedTrimStartSec` & timing
- [ ] Callback updates `CaptainVideo` to `ready`
- [ ] Output duration <= 30s (manually inspect or add ffprobe)

---

## 🧠 Notes

- Use pre-input `-ss` for faster, keyframe-aligned seeking.
- Always include `-t 30` to hard-cap the segment.
- If `trimStartSec` is near end of original (less than 1 second left) you may get a very short clip—optionally clamp.
- Consider adding a safety: if `trimStartSec > originalDurationSec - 0.5` then shift back 0.5s.

---

Happy processing! 🎣
