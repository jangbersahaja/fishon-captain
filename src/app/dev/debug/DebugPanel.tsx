"use client";

import { useState } from "react";
import VideoUploadTest from "./VideoUploadTest";

interface PendingMedia {
  id: string;
  userId: string;
  charterId: string | null;
  kind: string;
  originalKey: string;
  originalUrl: string;
  finalKey: string | null;
  finalUrl: string | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  status: string;
  sizeBytes: number | null;
  mimeType: string | null;
  correlationId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  consumedAt: string | null;
  charterMediaId: string | null;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  charter: {
    name: string;
  } | null;
}

interface DebugPanelProps {
  recentPending: PendingMedia[];
  envInfo: Record<string, string>;
}

interface TestResult {
  status?: number;
  ok?: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

export default function DebugPanel({
  recentPending,
  envInfo,
}: DebugPanelProps) {
  const [selectedRecord, setSelectedRecord] = useState<PendingMedia | null>(
    null
  );
  const [testResults, setTestResults] = useState<Record<string, TestResult>>(
    {}
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Test functions
  const testEndpoint = async (
    path: string,
    method: string = "GET",
    body?: unknown
  ) => {
    setLoading((prev) => ({ ...prev, [path]: true }));
    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      setTestResults((prev) => ({
        ...prev,
        [path]: {
          status: response.status,
          ok: response.ok,
          data,
          timestamp: new Date().toISOString(),
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [path]: {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [path]: false }));
    }
  };

  const triggerTranscode = async (pendingId: string) => {
    const record = recentPending.find((r) => r.id === pendingId);
    if (!record) return;

    const payload = {
      pendingMediaId: record.id,
      originalKey: record.originalKey,
      originalUrl: record.originalUrl,
      filename: record.originalKey.split("/").pop(),
      userId: record.userId,
      charterId: record.charterId,
    };

    await testEndpoint("/api/jobs/transcode", "POST", payload);
  };

  const callSimpleWorker = async (pendingId: string) => {
    const record = recentPending.find((r) => r.id === pendingId);
    if (!record) return;

    const payload = {
      pendingMediaId: record.id,
      originalKey: record.originalKey,
      originalUrl: record.originalUrl,
      filename: record.originalKey.split("/").pop(),
      userId: record.userId,
      charterId: record.charterId,
    };

    await testEndpoint("/api/workers/transcode-simple", "POST", payload);
  };

  const refreshPendingStatus = async (pendingId: string) => {
    await testEndpoint(`/api/media/pending?ids=${pendingId}`);
  };

  return (
    <div className="space-y-6">
      {/* Video Upload Test */}
      <VideoUploadTest />

      {/* Environment Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          🌍 Environment
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {Object.entries(envInfo).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="font-medium text-slate-700">{key}</span>
              <span
                className={`font-mono text-xs ${
                  value === "unset"
                    ? "text-red-600"
                    : value === "set"
                    ? "text-green-600"
                    : "text-slate-600"
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Tests */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          🧪 Quick Tests
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => testEndpoint("/api/media/pending?ids=")}
            disabled={loading["/api/media/pending?ids="]}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading["/api/media/pending?ids="]
              ? "Testing..."
              : "Test Pending API"}
          </button>

          <button
            onClick={() =>
              testEndpoint("/api/jobs/transcode", "POST", {
                originalKey: "test-key",
                originalUrl: "test-url",
                filename: "test.mp4",
              })
            }
            disabled={loading["/api/jobs/transcode"]}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            {loading["/api/jobs/transcode"]
              ? "Testing..."
              : "Test Transcode Job"}
          </button>

          <button
            onClick={() =>
              testEndpoint("/api/workers/transcode-simple", "POST", {
                originalKey: "test-key",
                originalUrl: "test-url",
                filename: "test.mp4",
              })
            }
            disabled={loading["/api/workers/transcode-simple"]}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {loading["/api/workers/transcode-simple"]
              ? "Testing..."
              : "Test Simple Worker"}
          </button>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Test Results:</h3>
            {Object.entries(testResults).map(([path, result]) => (
              <div key={path} className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm text-slate-700">
                    {path}
                  </span>
                  {result.status && (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        result.status < 400
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {result.status}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 ml-auto">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Pending Media */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          📋 Recent Pending Media
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Kind</th>
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">Created</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentPending.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        record.status === "READY"
                          ? "bg-green-100 text-green-800"
                          : record.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : record.status === "TRANSCODING"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="p-2">{record.kind}</td>
                  <td className="p-2">
                    {record.user.firstName} {record.user.lastName}
                    <br />
                    <span className="text-xs text-slate-500">
                      {record.user.email}
                    </span>
                  </td>
                  <td className="p-2">
                    {new Date(record.createdAt).toLocaleDateString()}{" "}
                    {new Date(record.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="px-2 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-700"
                      >
                        View
                      </button>
                      {record.kind === "VIDEO" && (
                        <>
                          <button
                            onClick={() => triggerTranscode(record.id)}
                            disabled={loading["/api/jobs/transcode"]}
                            className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-50"
                          >
                            Queue
                          </button>
                          <button
                            onClick={() => callSimpleWorker(record.id)}
                            disabled={loading["/api/workers/transcode-simple"]}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            Direct
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => refreshPendingStatus(record.id)}
                        disabled={
                          loading[`/api/media/pending?ids=${record.id}`]
                        }
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                        Refresh
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Record Details</h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">ID:</span>
                    <div className="font-mono text-xs bg-slate-100 p-2 rounded mt-1">
                      {selectedRecord.id}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Status:</span>
                    <div className="mt-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedRecord.status === "READY"
                            ? "bg-green-100 text-green-800"
                            : selectedRecord.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : selectedRecord.status === "TRANSCODING"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {selectedRecord.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-slate-700">
                    Original URL:
                  </span>
                  <div className="font-mono text-xs bg-slate-100 p-2 rounded mt-1 break-all">
                    <a
                      href={selectedRecord.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedRecord.originalUrl}
                    </a>
                  </div>
                </div>

                {selectedRecord.finalUrl && (
                  <div>
                    <span className="font-medium text-slate-700">
                      Final URL:
                    </span>
                    <div className="font-mono text-xs bg-slate-100 p-2 rounded mt-1 break-all">
                      <a
                        href={selectedRecord.finalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedRecord.finalUrl}
                      </a>
                    </div>
                  </div>
                )}

                {selectedRecord.thumbnailUrl && (
                  <div>
                    <span className="font-medium text-slate-700">
                      Thumbnail URL:
                    </span>
                    <div className="font-mono text-xs bg-slate-100 p-2 rounded mt-1 break-all">
                      <a
                        href={selectedRecord.thumbnailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedRecord.thumbnailUrl}
                      </a>
                    </div>
                  </div>
                )}

                {selectedRecord.error && (
                  <div>
                    <span className="font-medium text-red-700">Error:</span>
                    <div className="text-sm bg-red-50 border border-red-200 p-3 rounded mt-1">
                      {selectedRecord.error}
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium text-slate-800 mb-2">
                    Full Record:
                  </h4>
                  <pre className="text-xs overflow-auto max-h-60 bg-white p-3 rounded border">
                    {JSON.stringify(selectedRecord, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
