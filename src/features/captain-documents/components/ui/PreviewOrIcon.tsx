"use client";

import {
  FileArchive,
  File as FileGeneric,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import type { Statused } from "../../types";

function isImageFile(name?: string, url?: string) {
  const src = (name || "") + (url || "");
  return /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp)$/i.test(src);
}

function fileExt(name?: string) {
  if (!name) return "";
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

function FileTypeIcon({ ext }: { ext: string }) {
  if (["zip", "gz", "tar", "rar", "7z"].includes(ext))
    return <FileArchive className="w-5 h-5 text-slate-500" />;
  if (["xls", "xlsx", "csv"].includes(ext))
    return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (ext === "pdf") return <FileText className="w-5 h-5 text-rose-600" />;
  if (["doc", "docx", "rtf"].includes(ext))
    return <FileText className="w-5 h-5 text-blue-600" />;
  return <FileGeneric className="w-5 h-5 text-slate-500" />;
}

export function PreviewOrIcon({ file }: { file: Statused }) {
  const e = fileExt(file.name);
  if (isImageFile(file.name, file.url)) {
    return (
      <div className="relative w-10 h-10 overflow-hidden bg-white border rounded-md border-slate-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.url}
          alt={file.name}
          className="object-cover w-full h-full"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  return <FileTypeIcon ext={e} />;
}
