"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  getOwnFileSignedUrl,
  listOwnFiles,
  removeOwnFile,
  uploadOwnFile,
} from "@/lib/storage/client";

type FileEntry = { name: string; id: string | null };

export function FileManager({ userId }: { userId: string }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const list = await listOwnFiles(userId);
      setFiles(list.map((f) => ({ name: f.name, id: f.id })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load files");
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    startTransition(async () => {
      try {
        await uploadOwnFile(userId, file);
        toast.success("File uploaded");
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Upload failed");
      }
    });
  };

  const onDownload = async (fileName: string) => {
    try {
      const url = await getOwnFileSignedUrl(userId, fileName);
      window.open(url, "_blank");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open file");
    }
  };

  const onDelete = (fileName: string) => {
    startTransition(async () => {
      try {
        await removeOwnFile(userId, fileName);
        toast.success("File deleted");
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Delete failed");
      }
    });
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div>
        <label htmlFor="file-upload">
          <Button asChild disabled={isPending}>
            <span>
              <Upload />
              Upload file
            </span>
          </Button>
        </label>
        <Input id="file-upload" type="file" className="hidden" onChange={onUpload} />
      </div>

      {files.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            No files yet.
          </CardContent>
        </Card>
      )}

      {files.map((file) => (
        <Card key={file.name}>
          <CardContent className="flex items-center justify-between gap-2">
            <p className="truncate text-sm">{file.name}</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onDownload(file.name)}>
                <Download className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(file.name)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
