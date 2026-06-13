import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onDetected: (isbn: string) => void;
  paused?: boolean;
}

export function BarcodeScanner({ onDetected, paused }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastCodeRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (cancelled || !result) return;
            const code = result.getText();
            const now = Date.now();
            if (lastCodeRef.current.code === code && now - lastCodeRef.current.ts < 2000) return;
            lastCodeRef.current = { code, ts: now };
            if (navigator.vibrate) navigator.vibrate(80);
            onDetected(code);
          },
        );
        controlsRef.current = controls;
        setActive(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera unavailable");
        setActive(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setActive(false);
    };
  }, [paused, onDetected]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <CameraOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={() => location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-black aspect-[4/3]">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-1/3 w-4/5 rounded-md border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
        <Camera className="h-3 w-3" />
        {paused ? "Paused" : active ? "Scanning" : "Starting…"}
      </div>
    </div>
  );
}
