import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Share2, Printer, Check, Copy, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStaffSession } from "@/lib/admin-session";
import logoAsset from "@/assets/ushaq-campaign-logo.png.asset.json";

const DEFAULT_URL = "https://reisegruppe-ushaq-al-hussein.lovable.app";
const STORAGE_KEY = "campaign_custom_qr_url";

export function CampaignQrDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffSession();
  const isAdmin = staff?.role === "admin" || staff?.role === "haj";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [qrUrl, setQrUrl] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_URL;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
  });
  const [editing, setEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(qrUrl);
  const [copied, setCopied] = useState(false);

  const saveUrl = () => {
    const target = tempUrl.trim() || DEFAULT_URL;
    localStorage.setItem(STORAGE_KEY, target);
    setQrUrl(target);
    setEditing(false);
  };

  const resetUrl = () => {
    localStorage.removeItem(STORAGE_KEY);
    setQrUrl(DEFAULT_URL);
    setTempUrl(DEFAULT_URL);
    setEditing(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsapp = () => {
    const text = encodeURIComponent(`تطبيق حملة عشاق الحسين (ع) - ألمانيا\nرابط التطبيق والزيارات:\n${qrUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const printQr = () => {
    const canvas = canvasRef.current || (document.querySelector("canvas") as HTMLCanvasElement | null);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html dir="rtl">
        <head>
          <title>باركود حملة عشاق الحسين</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 95vh; margin: 0; }
            h2 { color: #0f1f38; margin-bottom: 6px; }
            p { color: #666; margin-top: 0; font-size: 14px; }
            img { width: 300px; height: 300px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body onload="window.print()">
          <h2>حملة عشاق الحسين (ع) — ألمانيا</h2>
          <p>Reisegruppe Ushaq al-Hussein</p>
          <img src="${dataUrl}" alt="QR Code" />
          <p style="margin-top: 14px; font-size: 13px; color: #888;">امسح الرمز للدخول إلى التطبيق</p>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-24px)] max-w-[360px] rounded-2xl p-5 text-center" dir="rtl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-base font-extrabold text-primary">
            باركود التطبيق <span className="text-xs font-normal text-muted-foreground">| App QR-Code</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            امسح الباركود بالكاميرا للوصول المباشر للتطبيق
          </DialogDescription>
        </DialogHeader>

        {/* مساحة عرض الباركود الأنيقة مع لوغو الحملة في المنتصف تلقائياً */}
        <div className="my-3 flex flex-col items-center justify-center">
          <div className="rounded-2xl border-2 border-secondary/40 bg-white p-3 shadow-lg">
            <QRCodeCanvas
              ref={canvasRef}
              value={qrUrl}
              size={240}
              level="H"
              fgColor="#0f1f38"
              bgColor="#ffffff"
              imageSettings={{
                src: logoAsset.url,
                height: 52,
                width: 52,
                excavate: true,
              }}
              className="block rounded-lg"
            />
          </div>
        </div>

        {/* أزرار المشاركة والطباعة */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={shareWhatsapp} className="gap-1.5 bg-emerald-600 font-bold text-white hover:bg-emerald-700">
            <Share2 className="h-4 w-4" />
            <span>مشاركة بالواتس</span>
          </Button>

          <Button size="sm" variant="outline" onClick={printQr} className="gap-1.5 border-secondary/50 font-bold text-primary">
            <Printer className="h-4 w-4 text-secondary" />
            <span>طباعة وحفظ</span>
          </Button>
        </div>

        {isAdmin && (
          <Button size="sm" variant="ghost" onClick={copyLink} className="mt-1 w-full gap-1.5 text-xs text-muted-foreground">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "تم نسخ الرابط بنجاح ✓" : "نسخ الرابط المباشر"}</span>
          </Button>
        )}

        {/* قسم تعديل الرابط خاص بالإدارة والحاج فقط */}
        {isAdmin && (
          <div className="mt-3 border-t border-border pt-3 text-start">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>تعديل الرابط الخاص بالباركود (إدارة)</span>
              </button>
            ) : (
              <div className="space-y-2 rounded-lg bg-muted/60 p-2 text-xs">
                <p className="font-bold text-primary">تغيير الرابط المستهدف للباركود:</p>
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  dir="ltr"
                  placeholder="https://..."
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveUrl} className="h-7 text-xs font-bold">
                    حفظ
                  </Button>
                  <Button size="sm" variant="ghost" onClick={resetUrl} className="h-7 text-xs text-muted-foreground">
                    استعادة الافتراضي
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 text-xs">
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
