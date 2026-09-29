import { useEffect, useRef, useState } from "react";
import { Check, Mic2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Reciter } from "@/lib/site-content";

const CACHE = "reciter-audio-v1";

async function cachedBlobUrl(url: string) {
  if (!("caches" in window)) return null;
  const hit = await (await caches.open(CACHE)).match(url);
  return hit ? URL.createObjectURL(await hit.blob()) : null;
}

/** Downloads the MP3 in the background so the next playback works offline. */
async function cacheInBackground(url: string) {
  try {
    if (!("caches" in window)) return;
    const cache = await caches.open(CACHE);
    if (await cache.match(url)) return;
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) await cache.put(url, res);
  } catch { /* Source does not allow downloads; streaming still works online. */ }
}

const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

export function ReciterPlayer({ reciters }: { reciters: Reciter[] }) {
  const list = reciters.filter((r) => r.name && r.url);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [pickOpen, setPickOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const current = list[idx];

  useEffect(() => () => { audioRef.current?.pause(); if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);
  useEffect(() => { audioRef.current?.pause(); audioRef.current = null; setPlaying(false); setTime(0); setDur(0); }, [idx]);

  if (!current) return null;

  async function toggle() {
    if (!current) return;
    let a = audioRef.current;
    if (a && playing) { a.pause(); return; }
    if (!a) {
      const offline = await cachedBlobUrl(current.url);
      if (offline) blobRef.current = offline;
      a = new Audio(offline ?? current.url);
      a.preload = "auto";
      a.ontimeupdate = () => setTime(a!.currentTime);
      a.onloadedmetadata = () => setDur(a!.duration);
      a.onplay = () => setPlaying(true);
      a.onpause = () => setPlaying(false);
      a.onended = () => setPlaying(false);
      audioRef.current = a;
      if (!offline) void cacheInBackground(current.url);
    }
    try { await a.play(); } catch { window.alert("تعذّر تشغيل الصوت | Audio konnte nicht abgespielt werden"); }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-20 z-30 mx-auto w-full max-w-[420px] border-t border-border bg-card/95 px-4 py-3 text-card-foreground shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3" dir="ltr">
          <Button size="icon" onClick={toggle} aria-label={playing ? "إيقاف | Pause" : "تشغيل | Abspielen"}>{playing ? <Pause /> : <Play />}</Button>
          <div className="min-w-0 flex-1">
            <input type="range" aria-label="تقدم | Fortschritt" min={0} max={dur || 0} step={0.5} value={time} onChange={(e) => { const v = Number(e.target.value); if (audioRef.current) audioRef.current.currentTime = v; setTime(v); }} className="w-full accent-secondary" />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>{fmt(time)}</span><span>{fmt(dur)}</span></div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPickOpen(true)} className="max-w-[40%] gap-1" dir="rtl"><Mic2 className="h-4 w-4" /><span className="truncate">{current.name}</span></Button>
        </div>
      </div>
      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="w-[calc(100%-24px)] max-w-[396px]" dir="rtl">
          <DialogHeader className="text-right"><DialogTitle>اختيار القارئ <span className="text-sm italic text-muted-foreground">| Rezitator wählen</span></DialogTitle><DialogDescription>يتم حفظ التلاوة تلقائياً للاستماع بدون إنترنت <span className="italic">| Wird automatisch für offline gespeichert</span></DialogDescription></DialogHeader>
          <div className="space-y-2">
            {list.map((r, i) => (
              <Button key={`${r.name}-${i}`} variant={i === idx ? "default" : "outline"} className="h-12 w-full justify-between" onClick={() => { setIdx(i); setPickOpen(false); }}>
                <span>{r.name}</span>{i === idx && <Check />}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
