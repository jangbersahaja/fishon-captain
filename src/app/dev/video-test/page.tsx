"use client";

import { EnhancedVideoUploader } from "@/components/captain/EnhancedVideoUploader";

export default function VideoTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-8">Video Uploader Test</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Enhanced Video Uploader</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload a video file and the trim modal should automatically open for
            single files. You can also manually click the &quot;Trim&quot;
            button in the queue for additional trimming.
          </p>
          <EnhancedVideoUploader
            onUploaded={() => {
              console.log("Upload completed");
            }}
          />
        </div>
      </div>
    </div>
  );
}
