"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export type GalleryImage = {
  url: string;
  fileName: string;
  description?: string | null;
};

export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-sm">
        <ImageOff className="size-6" />
        No images attached.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setSelected(image)}
            className="group relative aspect-square overflow-hidden rounded-md border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.fileName}
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <VisuallyHidden>
            <DialogTitle>{selected?.fileName}</DialogTitle>
            <DialogDescription>{selected?.description ?? selected?.fileName}</DialogDescription>
          </VisuallyHidden>
          {selected && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.url} alt={selected.fileName} className="w-full rounded-md object-contain" />
          )}
          {selected?.description && (
            <p className="text-muted-foreground text-sm">{selected.description}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
