"use client";

import { useState } from "react";

interface UploadResult {
  ok?: boolean;
  pendingMediaId?: string;
  status?: string;
  previewUrl?: string;
  error?: string;
}

export default function VideoUploadTest() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [charterId, setCharterId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (charterId) formData.append("charterId", charterId);

      console.log("🚀 Uploading test video:", file.name);

      const response = await fetch("/api/media/video", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("📤 Upload response:", data);

      setResult(data);

      // If it's a video, let's watch what happens
      if (data.pendingMediaId) {
        console.log("📹 Video uploaded, monitoring pending status...");
        monitorPending(data.pendingMediaId);
      }
    } catch (error) {
      console.error("💥 Upload failed:", error);
      setResult({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  const monitorPending = async (pendingId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds

    const check = async () => {
      try {
        const response = await fetch(`/api/media/pending?ids=${pendingId}`);
        const data = await response.json();

        console.log(`📊 Pending status check #${attempts + 1}:`, data);

        if (data.ok && data.items?.[0]) {
          const item = data.items[0];
          console.log(
            `📋 Status: ${item.status}, Final URL: ${
              item.finalUrl || "none"
            }, Thumbnail: ${item.thumbnailUrl || "none"}`
          );

          if (item.status === "READY" || item.status === "FAILED") {
            console.log("🏁 Processing complete:", item);
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(check, 1000);
        } else {
          console.log("⏰ Monitoring timeout after 30 seconds");
        }
      } catch (error) {
        console.error("❌ Failed to check pending status:", error);
      }
    };

    setTimeout(check, 1000); // Start checking after 1 second
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        🎥 Video Upload Test
      </h2>

      <div className="space-y-4">
        <div className="grid gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Charter ID (required for video)
            </label>
            <input
              type="text"
              value={charterId}
              onChange={(e) => setCharterId(e.target.value)}
              placeholder="enter charterId"
              className="w-full rounded border px-2 py-1 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select test video file
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <div className="mt-2 text-sm text-slate-600">
              Selected: {file.name} ({Math.round(file.size / 1024)}KB)
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading || !charterId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload Test Video"}
        </button>

        {result && (
          <div className="mt-4">
            <h3 className="font-medium text-slate-800 mb-2">Upload Result:</h3>
            <pre className="text-xs bg-slate-50 p-3 rounded border overflow-auto max-h-40">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-xs text-slate-500">
          <p>💡 Tips:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check browser console for detailed logs</li>
            <li>Watch the Pending Media table above for status updates</li>
            <li>Try a small MP4 file (under 5MB) for faster testing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
