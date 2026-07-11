"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// A handheld/Bluetooth barcode scanner acts as a keyboard: it types the code then sends
// Enter. This input is built for that — autofocused, submits on Enter, clears and
// refocuses itself right after so the next scan lands immediately with no clicking. The
// manual "Go" button covers typed entry when there's no scanner in hand.
export function ScanInput({
  onScan,
  placeholder = "Scan or type a code...",
  disabled = false,
  autoFocus = true,
}: {
  onScan: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onScan(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <ScanLine className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-8"
          autoComplete="off"
        />
      </div>
      <Button type="button" variant="outline" disabled={disabled || !value.trim()} onClick={submit}>
        Go
      </Button>
    </div>
  );
}
