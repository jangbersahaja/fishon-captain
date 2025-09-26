import { useEffect, useState } from "react";

type VideoThumbnail = {
  videoUrl: string;
  videoKey: string;
  thumbnailUrl: string;
  thumbnailKey: string;
  sortOrder: number;
};

export function useVideoThumbnails(charterId: string | null) {
  const [thumbnails, setThumbnails] = useState<VideoThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!charterId) {
      setThumbnails([]);
      return;
    }

    const fetchThumbnails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/charters/${charterId}/thumbnails`);

        if (!response.ok) {
          if (response.status === 404) {
            // Charter not found or no videos - not an error
            setThumbnails([]);
            return;
          }
          throw new Error(`Failed to fetch thumbnails: ${response.status}`);
        }

        const data = await response.json();
        setThumbnails(data.thumbnails || []);
      } catch (err) {
        console.error("Error fetching video thumbnails:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load thumbnails"
        );
        setThumbnails([]);
      } finally {
        setLoading(false);
      }
    };

    fetchThumbnails();
  }, [charterId]);

  // Helper function to get thumbnail URL for a video URL
  const getThumbnailUrl = (videoUrl: string): string | null => {
    const thumbnail = thumbnails.find((t) => t.videoUrl === videoUrl);
    return thumbnail?.thumbnailUrl || null;
  };

  return {
    thumbnails,
    loading,
    error,
    getThumbnailUrl,
  };
}
