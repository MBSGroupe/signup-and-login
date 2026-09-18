import React, { useState, useEffect } from 'react';
import {
  Building,
  Globe,
  Download,
  QrCode,
  Info
} from 'lucide-react';

/**
 * =========================================================================
 * SITE APPLICATION - GUIDE D'INSTALLATION OFFICIEL
 * Application Mobile : "المعماري" (Al-Mi'mari)
 * 
 * Page unique, épurée et intuitive contenant les étapes complètes pour :
 * 1. Télécharger l'application (Scan QR Code ou Téléchargement Direct)
 * 2. Installer et autoriser le fichier sur smartphone
 * 3. Se connecter et démarrer
 * =========================================================================
 */

const translations = {
  fr: {
    brand: "المعماري",
    switchLang: "العربية",
    pageTitle: "Installation de l'application mobile",
    pageSubtitle: "Suivez les étapes ci-dessous pour installer facilement l'application sur votre smartphone.",

    // ETAPE 1
    step1Number: "1",
    step1Title: "Télécharger l'application mobile",
    option1Label: "Option 1 :",
    option1Desc: "À l'aide de votre smartphone, Scannez le QR Code ci-dessous et cliquez sur \"Ouvrir le lien\" pour télécharger l'application mobile المعماري.",
    qrCardTitle: "Télécharger l'appli. المعماري",
    qrCardSub: "Scannez le QR Code pour télécharger l'application mobile المعماري.",
    scanHint: "Pointez votre appareil photo sur le code",

    option2Label: "Option 2 :",
    option2Desc: "Ou bien, ouvrez cette page Web sur votre smartphone et cliquez sur le lien ci-dessous pour télécharger le fichier d'installation de l'application mobile.",
    btnDownloadMain: "Télécharger l'application",
    btnAppStore: "App Store (iOS)",
    btnGooglePlay: "Google Play",
    btnApkDirect: "Fichier APK Direct",

    // ETAPE 2
    step2Number: "2",
    step2Title: "Installer le fichier sur votre smartphone",
    step2Desc: "Une fois le téléchargement terminé, ouvrez le fichier téléchargé (.apk) dans vos notifications ou votre gestionnaire de fichiers, puis appuyez sur \"Installer\".",
    step2Tip: "Si Android vous demande d'autoriser l'installation d'applications provenant de cette source, appuyez sur \"Paramètres\" et activez \"Autoriser cette source\".",

    // ETAPE 3
    step3Number: "3",
    step3Title: "Ouvrir l'application et vous connecter",
    step3Desc: "Lancez l'application المعماري depuis votre écran d'accueil, connectez-vous avec vos identifiants ou créez votre compte.",

    // FOOTER
    securityBadge: "Fichier officiel certifié et sécurisé • Version 2.4",
    supportText: "Besoin d'aide pour l'installation ? Contactez le support :",
    rights: "Tous droits réservés. Développé pour la communauté des architectes et bâtisseurs."
  },
  ar: {
    brand: "المعماري",
    switchLang: "Français",
    pageTitle: "تثبيت التطبيق المحمول على الهاتف",
    pageSubtitle: "اتبع الخطوات البسيطة أدناه لتثبيت التطبيق بسهولة على هاتفك الذكي.",

    // ETAPE 1
    step1Number: "1",
    step1Title: "تحميل التطبيق المحمول",
    option1Label: "الخيار 1 :",
    option1Desc: "باستخدام هاتفك الذكي، امسح رمز QR Code أدناه واضغط على \"فتح الرابط\" لتنزيل تطبيق المعماري مباشرة.",
    qrCardTitle: "تحميل تطبيق المعماري",
    qrCardSub: "امسح رمز QR Code لتنزيل التطبيق المحمول المعماري.",
    scanHint: "وجّه كاميرا الهاتف نحو الرمز",

    option2Label: "الخيار 2 :",
    option2Desc: "أو افتح هذه الصفحة من متصفح هاتفك واضغط على الزر أدناه لتنزيل ملف التثبيت المباشر للتطبيق المحمول.",
    btnDownloadMain: "تحميل التطبيق",
    btnAppStore: "App Store (آيفون)",
    btnGooglePlay: "Google Play",
    btnApkDirect: "ملف APK المباشر",

    // ETAPE 2
    step2Number: "2",
    step2Title: "تثبيت الملف على هاتفك الذكي",
    step2Desc: "بعد اكتمال التنزيل، افتح الملف المُنزل (.apk) من قائمة الإشعارات أو مدير الملفات، ثم اضغط على زر \"تثبيت\".",
    step2Tip: "إذا طلب منك نظام أندرويد السماح بتثبيت التطبيقات من هذا المصدر، اضغط على \"الإعدادات\" ثم فعّل \"السماح من هذا المصدر\".",

    // ETAPE 3
    step3Number: "3",
    step3Title: "فتح التطبيق وتسجيل الدخول",
    step3Desc: "افتح تطبيق المعماري من شاشة هاتفك، سجّل الدخول بحسابك أو أنشئ حساباً جديداً.",

    // FOOTER
    securityBadge: "ملف رسمي موثق وآمن 100% • الإصدار 2.4",
    supportText: "هل تحتاج لمساعدة أثناء التثبيت؟ تواصل مع الدعم الفني :",
    rights: "جميع الحقوق محفوظة. طُوّر لخدمة مجتمع المهندسين والمعماريين."
  }
};

// Nom du fichier APK déposé dans public/
export const APK_FILE_NAME = "application-b73d6f36-9f87-4cfb-a670-296736204fe3.apk";
export const APK_DOWNLOAD_URL = `/${APK_FILE_NAME}`;

export default function SiteApplication() {
  const [lang, setLang] = useState('fr'); // 'fr' ou 'ar'
  const [downloadUrl, setDownloadUrl] = useState(APK_DOWNLOAD_URL);
  const t = translations[lang] || translations.fr;
  const isRtl = lang === 'ar';

  // Gestion autonome complète des éléments du <head> (titre, favicon, meta description, dir, lang)
  useEffect(() => {
    // 1. Direction et Langue
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // 2. Titre dynamique de l'onglet
    document.title = lang === 'ar' 
      ? 'المعماري - تطبيق إدارة وتصريح المشاريع المعمارية'
      : 'المعماري - Guide Officiel d\'Installation';

    // 3. Favicon Vert Dynamique
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(favicon);
    }
    favicon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23206d3e'/><path d='M25 75 L50 25 L75 75 Z' fill='none' stroke='white' stroke-width='8'/><circle cx='50' cy='52' r='8' fill='white'/></svg>";

    // 4. Meta Description pour le référencement
    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.getElementsByTagName('head')[0].appendChild(metaDesc);
    }
    metaDesc.content = lang === 'ar'
      ? 'تطبيق المعماري لتسهيل تصريح ومتابعة المشاريع المعمارية.'
      : 'Application mobile officielle المعماري pour la gestion de vos projets architecturaux.';

    // 5. URL absolue pour le téléchargement et QR code
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hostOrigin = isLocalhost 
        ? `http://192.168.100.19:${window.location.port || '5174'}`
        : window.location.origin;
        
      setDownloadUrl(`${hostOrigin}/${APK_FILE_NAME}`);
    }
  }, [lang, isRtl]);

  const toggleLanguage = () => {
    setLang(lang === 'fr' ? 'ar' : 'fr');
  };

  // URL du QR Code encodant le lien complet du fichier APK
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=020617&data=${encodeURIComponent(
    downloadUrl
  )}`;

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 py-8 sm:py-12 px-4 sm:px-6 flex flex-col justify-between items-center relative overflow-hidden ${isRtl ? 'font-cairo' : 'font-outfit'}`}>

      {/* ===================== DESIGN & STYLES EMBARQUES ===================== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        
        .font-cairo {
          font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
        }
        .font-outfit {
          font-family: 'Outfit', system-ui, -apple-system, sans-serif !important;
        }
        
        /* Animations & effets visuels */
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 4s ease-in-out infinite;
        }
        
        /* Custom scrollbar & selections */
        ::selection {
          background-color: #206d3e;
          color: #ffffff;
        }
      `}</style>

      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute w-[35rem] h-[35rem] bg-gradient-to-tr from-[#206d3e]/20 to-emerald-500/10 rounded-full blur-3xl -top-20 left-1/2 -translate-x-1/2 pointer-events-none animate-pulse-glow"></div>

      {/* ===================== EN-TETE / HEADER ===================== */}
      <div className="max-w-2xl w-full mb-8 relative z-10 flex items-center justify-between">
        {/* Logo de l'application */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#17522e] via-[#206d3e] to-[#2eb865] p-0.5 shadow-lg shadow-[#206d3e]/25">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Building className="w-6 h-6 text-[#2eb865]" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-white font-cairo">
              {t.brand}
            </span>
          </div>
        </div>

        {/* Sélecteur de langue */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold shadow-md hover:border-[#206d3e]/50 transition-all"
        >
          <Globe className="w-4 h-4 text-[#2eb865]" />
          <span>{t.switchLang}</span>
        </button>
      </div>

      {/* ===================== CARTE PRINCIPALE : ETAPES D'INSTALLATION ===================== */}
      <main className="max-w-2xl w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 border border-slate-800/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative z-10">

        {/* Titre de la page */}
        <div className="text-center mb-10 pb-6 border-b border-slate-800/80">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            {t.pageSubtitle}
          </p>
        </div>

        {/* ========================================================= */}
        {/* ETAPE 1 : TELECHARGER L'APPLICATION MOBILE                */}
        {/* ========================================================= */}
        <section className="mb-10">

          {/* Titre Étape 1 avec cercle numéroté */}
          <div className="flex items-center gap-3 mb-6 text-left rtl:text-right">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#17522e] via-[#206d3e] to-[#2eb865] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-[#206d3e]/30">
              {t.step1Number}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {t.step1Title}
            </h2>
          </div>

          {/* Option 1 : Scan QR Code */}
          <div className="mb-8 text-left rtl:text-right">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
              <strong className="text-[#2eb865] font-bold">{t.option1Label}</strong>{' '}
              {t.option1Desc}
            </p>

            {/* Cadre en pointillés (Dashed Box) */}
            <div className="border-2 border-dashed border-[#206d3e]/50 rounded-3xl p-6 sm:p-8 bg-slate-950/70 max-w-sm mx-auto shadow-inner flex flex-col items-center text-center">

              <p className="text-[11px] text-slate-400 mb-4 max-w-[240px] leading-snug">
                {t.qrCardSub}
              </p>

              {/* QR Code haute visibilité scannable */}
              <div className="w-48 h-48 bg-white rounded-2xl p-2.5 shadow-2xl border-4 border-[#206d3e]/40 flex items-center justify-center hover:scale-105 transition-transform duration-300 overflow-hidden">
                <img
                  src={qrCodeImageUrl}
                  alt="QR Code Téléchargement المعماري"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2eb865] mt-3">
                <QrCode className="w-3.5 h-3.5" />
                <span>{t.scanHint}</span>
              </div>
            </div>
          </div>

          {/* Option 2 : Téléchargement Direct */}
          <div className="pt-6 border-t border-slate-800/80 text-left rtl:text-right">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
              <strong className="text-[#2eb865] font-bold">{t.option2Label}</strong>{' '}
              {t.option2Desc}
            </p>

            {/* Bouton de Téléchargement Principal */}
            <div className="flex flex-col items-center text-center">
              <a
                href={APK_DOWNLOAD_URL}
                download="المعماري.apk"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#17522e] via-[#206d3e] to-[#2eb865] hover:brightness-110 text-white font-black text-sm sm:text-base shadow-xl shadow-[#206d3e]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-5 h-5 animate-bounce" />
                <span>{t.btnDownloadMain}</span>
              </a>
            </div>
          </div>

        </section>

        {/* ========================================================= */}
        {/* ETAPE 2 : INSTALLER LE FICHIER SUR LE SMARTPHONE          */}
        {/* ========================================================= */}
        <section className="mb-8 pt-6 border-t border-slate-800/80 text-left rtl:text-right">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-[#2eb865] font-bold text-sm flex items-center justify-center shrink-0 border border-[#206d3e]/40">
              {t.step2Number}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t.step2Title}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3 pl-11 rtl:pl-0 rtl:pr-11">
            {t.step2Desc}
          </p>

          <div className="ml-11 rtl:ml-0 rtl:mr-11 p-3.5 rounded-2xl bg-[#206d3e]/10 border border-[#206d3e]/30 text-xs text-emerald-200/90 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#2eb865] shrink-0 mt-0.5" />
            <span>{t.step2Tip}</span>
          </div>
        </section>

        {/* ========================================================= */}
        {/* ETAPE 3 : OUVRIR ET SE CONNECTER                          */}
        {/* ========================================================= */}
        <section className="pt-6 border-t border-slate-800/80 text-left rtl:text-right">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#206d3e]/20 text-[#2eb865] font-bold text-sm flex items-center justify-center shrink-0 border border-[#206d3e]/50">
              {t.step3Number}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t.step3Title}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11 rtl:pl-0 rtl:pr-11">
            {t.step3Desc}
          </p>
        </section>

      </main>

    </div>
  );
}
