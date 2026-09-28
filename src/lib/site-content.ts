export type TripEntry = { id: string; ar: string; de: string; date: string; visible: boolean };
export type NewsEntry = { ar: string; de: string; bodyAr: string; bodyDe: string };
export type DuaCategory = "karbala" | "najaf" | "kazimiyya" | "samarra" | "mashhad" | "qom" | "mecca-medina" | "general";
export const duaCategories: Array<{ id: DuaCategory; ar: string; de: string }> = [
  { id: "karbala", ar: "كربلاء المقدسة", de: "Kerbela" },
  { id: "najaf", ar: "النجف الأشرف", de: "Nadschaf" },
  { id: "kazimiyya", ar: "الكاظمية المقدسة", de: "Al-Kazimiyya" },
  { id: "samarra", ar: "سامراء", de: "Samarra" },
  { id: "mashhad", ar: "مشهد المقدسة", de: "Maschhad" },
  { id: "qom", ar: "قم المقدسة", de: "Qom" },
  { id: "mecca-medina", ar: "مكة والمدينة", de: "Mekka & Medina" },
  { id: "general", ar: "الأدعية العامة والتعقيبات", de: "Allgemeine Bittgebete" },
];
export function duaCategoryOf(d: { id: string; category?: DuaCategory }): DuaCategory {
  return d.category ?? (d.id === "ashura" || d.id === "warith" ? "karbala" : "general");
}
export type DuaEntry = { id: string; ar: string; de: string; textAr: string; textDe: string; link: string; category?: DuaCategory };
export type AlertEntry = { ar: string; de: string; active: boolean };
export type PaymentEntry = { visible: boolean; accountName: string; bankName: string; iban: string; bic: string };
export type SiteContent = {
  duas: DuaEntry[];
  alert: AlertEntry;
  trips: TripEntry[];
  hotels: { kadhimiya: string; karbala: string; najaf: string };
  program: { ar: string; de: string };
  visa: { eu: string; nonEu: string };
  payment: PaymentEntry;
  news: NewsEntry[];
};

export const defaultContent: SiteContent = {
  alert: { ar: "", de: "", active: false },
  duas: [
    { id: "ashura", ar: "زيارة عاشوراء", de: "Ziyarat Ashura", textAr: "السَّلامُ عَلَيْكَ يا أبا عَبْدِ اللهِ، السَّلامُ عَلَيْكَ يَا ابْنَ رَسُولِ اللهِ...", textDe: "As-salāmu ʿalayka yā Abā ʿAbdillāh, as-salāmu ʿalayka yabna Rasūlillāh... — Friede sei mit dir, o Abu Abdillah, Friede sei mit dir, o Sohn des Gesandten Gottes.", link: "" },
    { id: "warith", ar: "زيارة وارث", de: "Ziyarat Warith", textAr: "السَّلامُ عَلَيْكَ يا وارِثَ آدَمَ صَفْوَةِ اللهِ...", textDe: "As-salāmu ʿalayka yā wāritha Ādama ṣafwatillāh... — Friede sei mit dir, o Erbe Adams, des Auserwählten Gottes.", link: "" },
    { id: "tawassul", ar: "دعاء التوسل", de: "Bittgebet Tawassul", textAr: "اللّهُمَّ إنِّي أسْألُكَ وَأتَوَجَّهُ إلَيْكَ بِنَبِيِّكَ نَبِيِّ الرَّحْمَةِ مُحَمَّدٍ...", textDe: "Allāhumma innī asʾaluka wa atawajjahu ilayka bi-nabiyyika nabiyyi r-raḥmati Muḥammad... — O Gott, ich bitte Dich und wende mich an Dich durch Deinen Propheten, den Propheten der Barmherzigkeit, Muhammad.", link: "" },
    { id: "kumayl", ar: "دعاء كميل", de: "Bittgebet Kumayl", textAr: "اللّهُمَّ إنِّي أسْألُكَ بِرَحْمَتِكَ الَّتي وَسِعَتْ كُلَّ شَيْءٍ...", textDe: "Allāhumma innī asʾaluka bi-raḥmatika llatī wasiʿat kulla shayʾ... — O Gott, ich bitte Dich bei Deiner Barmherzigkeit, die alles umfasst.", link: "" },
  ],
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
  payment: { visible: false, accountName: "", bankName: "", iban: "", bic: "" },
  news: [
    { ar: "فتح باب التسجيل لزيارة العتبات المقدسة", de: "Anmeldung für den Besuch der heiligen Stätten geöffnet", bodyAr: "يمكنكم الآن التسجيل في الرحلات المعلنة عبر استمارة التسجيل.", bodyDe: "Sie können sich jetzt über das Anmeldeformular für die angekündigten Reisen anmelden." },
    { ar: "تفاصيل السكن والفنادق جاهزة", de: "Unterkunfts- und Hoteldetails stehen fest", bodyAr: "تم إعداد برنامج السكن بين الكاظمية وكربلاء والنجف.", bodyDe: "Das Unterkunftsprogramm für al-Kazimiyya, Kerbela und Nadschaf steht fest." },
    { ar: "انضمام خطيب حسيني للحملة", de: "Ein Khatib Hosseini begleitet die Reisegruppe", bodyAr: "يرافق الحملة خطيب ورادود حسيني لإحياء المجالس خلال الرحلة.", bodyDe: "Ein Khatib und Radud Hosseini begleiten die Majlis während der Reise." },
  ],
};

export function mergeContent(data: unknown): SiteContent {
  const d = (data && typeof data === "object" ? data : {}) as Partial<SiteContent>;
  return {
    duas: Array.isArray(d.duas) ? d.duas : defaultContent.duas,
    alert: { ...defaultContent.alert, ...(d.alert ?? {}) },
    trips: Array.isArray(d.trips) && d.trips.length ? d.trips : defaultContent.trips,
    hotels: { ...defaultContent.hotels, ...(d.hotels ?? {}) },
    program: { ...defaultContent.program, ...(d.program ?? {}) },
    visa: { ...defaultContent.visa, ...(d.visa ?? {}) },
    payment: { ...defaultContent.payment, ...(d.payment ?? {}) },
    news: Array.isArray(d.news) ? d.news : defaultContent.news,
  };
}
