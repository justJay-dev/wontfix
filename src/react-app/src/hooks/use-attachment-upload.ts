import { useCallback, useState } from "react";

export interface UploadedAttachment {
    id: string;
    filename: string;
    content_type: string;
    size_bytes: number;
    url: string;
}

export function useAttachmentUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const upload = useCallback(async (file: File): Promise<UploadedAttachment> => {
        setIsUploading(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            const response = await fetch("/api/attachments", {
                method: "POST",
                body: form,
                credentials: "include",
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `upload_failed_${response.status}`);
            }
            return (await response.json()) as UploadedAttachment;
        } catch (err) {
            const message = err instanceof Error ? err.message : "upload_failed";
            setError(message);
            throw err;
        } finally {
            setIsUploading(false);
        }
    }, []);

    return { upload, isUploading, error };
}
