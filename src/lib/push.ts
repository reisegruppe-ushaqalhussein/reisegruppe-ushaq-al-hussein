import { registerPushToken } from "@/lib/site-content.functions";

const env = import.meta.env as Record<string, string | undefined>;
const appId = env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"];
const vapidKey = env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"];
const firebaseConfig = {
  apiKey: env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] ?? "",
  projectId: env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushStatus = "registered" | "not-configured" | "unsupported" | "open-in-new-tab" | "denied";

/** Call from a click handler. Registers this device for urgent alerts. */
export async function enablePush(): Promise<PushStatus> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !appId || !vapidKey || !firebaseConfig.messagingSenderId) return "not-configured";
  const { getMessaging, getToken, isSupported, onMessage } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const query = new URLSearchParams(firebaseConfig).toString();
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`, { scope: "/firebase-cloud-messaging-push-scope" });
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return "denied";
  await registerPushToken({ data: { token } });
  localStorage.setItem("push-enabled", "1");
  onMessage(messaging, (p) => {
    if (p.notification?.title) new Notification(p.notification.title, { body: p.notification.body, icon: "/icons/icon-192.png" });
  });
  return "registered";
}
