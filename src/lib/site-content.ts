export type TripEntry = { id: string; ar: string; de: string; date: string; visible: boolean };
export type NewsEntry = { ar: string; de: string; bodyAr: string; bodyDe: string };
export type SiteContent = {
  trips: TripEntry[];
  hotels: { kadhimiya: string; karbala: string; najaf: string };
  program: { ar: string; de: string };
  visa: { eu: string; nonEu: string };
  news: NewsEntry[];
};

export const defaultContent: SiteContent = {
  trips: [
    { id: "iraq", ar: "زيارة الإمام الحسين (ع)", de: "Zyarat Imam Hussein (as)", date: "01.12 – 09.12.2026", visible: true },
    { id: "winter", ar: "زيارة الإمام الحسين (ع) عطلة الشتاء / رأس السنة", de: "Zyarat Imam Hussein (as) Winterferien / Neujahr", date: "23.12.2026 – 01.01.2027", visible: true },
    { id: "umrah", ar: "العمرة", de: "Umrah", date: "13.01 – 22.01.2027", visible: true },
  ],
  hotels: { kadhimiya: "", karbala: "", najaf: "" },
  program: {
    ar: "سيتم نشر تفاصيل البرنامج (مواعيد التجمع والإنطلاق والفنادق) هنا فور تحديدها من قبل الحاج.",
    de: "Die Programmdetails (Treffpunkt, Abflug, Hotels) werden hier veröffentlicht, sobald sie von Hajj Yasser festgelegt werden.",
  },
  visa: { eu: "", nonEu: "" },
  news: [
    { ar: "فتح باب التسجيل لزيارة العتبات المقدسة", de: "Anmeldung für den Besuch der heiligen Stätten geöffnet", bodyAr: "يمكنكم الآن التسجيل في الرحلات المعلنة عبر استمارة التسجيل.", bodyDe: "Sie können sich jetzt über das Anmeldeformular für die angekündigten Reisen anmelden." },
    { ar: "تفاصيل السكن والفنادق جاهزة", de: "Unterkunfts- und Hoteldetails stehen fest", bodyAr: "تم إعداد برنامج السكن بين الكاظمية وكربلاء والنجف.", bodyDe: "Das Unterkunftsprogramm für Kadhimiya, Kerbela und Najaf steht fest." },
    { ar: "انضمام خطيب حسيني للحملة", de: "Ein Khatib Hosseini begleitet die Reisegruppe", bodyAr: "يرافق الحملة خطيب ورادود حسيني لإحياء المجالس خلال الرحلة.", bodyDe: "Ein Khatib und Radud Hosseini begleiten die Majlis während der Reise." },
  ],
};

export function mergeContent(data: unknown): SiteContent {
  const d = (data && typeof data === "object" ? data : {}) as Partial<SiteContent>;
  return {
    trips: Array.isArray(d.trips) && d.trips.length ? d.trips : defaultContent.trips,
    hotels: { ...defaultContent.hotels, ...(d.hotels ?? {}) },
    program: { ...defaultContent.program, ...(d.program ?? {}) },
    visa: { ...defaultContent.visa, ...(d.visa ?? {}) },
    news: Array.isArray(d.news) ? d.news : defaultContent.news,
  };
}
