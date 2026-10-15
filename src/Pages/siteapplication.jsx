import React, { useState, useEffect } from 'react';
import {
  Building,
  Globe,
  Download,
  QrCode,
  Info,
  Apple,
  Smartphone,
  SquareArrowUp,
  PlusSquare,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

/**
 * =========================================================================
 * SITE APPLICATION - GUIDE D'INSTALLATION OFFICIEL
 * Application Mobile : "المعماري" (Al-Mi'mari) - Ordre des Architectes (CNOA)
 * 
 * Guide complet d'installation avec détection automatique de l'appareil :
 * 1. iPhone (iOS) -> Sélection automatique de l'onglet iOS
 * 2. Android -> Sélection automatique de l'onglet Android
 * =========================================================================
 */

const translations = {
  fr: {
    brand: "المعماري",
    brandSubtitle: "Conseil National de l'Ordre des Architectes",
    switchLang: "العربية",
    pageTitle: "Installation de l'application mobile",
    pageSubtitle: "Suivez les étapes ci-dessous pour installer facilement l'application sur votre smartphone Android ou iPhone.",

    // SELECTEUR DE PLATEFORME
    tabAndroid: "Android (APK)",
    tabIos: "iPhone (iOS)",
    platformBadgeAndroid: "Installation directe APK",
    platformBadgeIos: "Écran d'accueil",

    // GUIDE ANDROID
    androidHeaderTitle: "Comment installer sur Android :",
    androidHeaderSubtitle: "Suivez ces étapes simples pour télécharger et installer l'application sur votre smartphone Android :",

    step1Number: "1",
    step1Title: "Télécharger l'application mobile",
    option1Label: "Option 1 :",
    option1Desc: "À l'aide de votre smartphone, scannez le QR Code ci-dessous pour télécharger directement l'application mobile المعماري :",
    qrCardTitle: "Télécharger l'appli. المعماري",
    qrCardSub: "Scannez le QR Code pour télécharger l'application mobile المعماري.",
    scanHint: "Pointez votre appareil photo sur le code",

    option2Label: "Option 2 :",
    option2Desc: "Ou bien, ouvrez cette page sur votre smartphone et cliquez sur le bouton ci-dessous pour télécharger le fichier APK :",
    btnDownloadMain: "Télécharger l'application (APK)",
    btnAppStore: "App Store (iOS)",
    btnGooglePlay: "Google Play",
    btnApkDirect: "Fichier APK Direct",

    step2Number: "2",
    step2Title: "Installer le fichier sur votre smartphone",
    step2Desc: "Une fois le téléchargement terminé, ouvrez le fichier téléchargé (.apk) dans vos notifications ou votre gestionnaire de fichiers, puis appuyez sur \"Installer\".",
    step2Tip: "Si Android vous demande d'autoriser l'installation d'applications provenant de cette source, appuyez sur \"Paramètres\" et activez \"Autoriser cette source\".",

    step3Number: "3",
    step3Title: "Ouvrir l'application et vous connecter",
    step3Desc: "Lancez l'application المعماري depuis votre écran d'accueil, connectez-vous avec vos identifiants ou créez votre compte.",

    // GUIDE IPHONE (iOS)
    iosHeaderTitle: "Comment installer sur votre iPhone (iOS) :",
    iosHeaderSubtitle: "Suivez ces étapes simples pour ajouter et utiliser l'application sur votre iPhone :",
    
    iosStep1Number: "1",
    iosStep1Title: "Ouvrir l'application sur votre iPhone",
    
    iosOption1Label: "Option 1 :",
    iosOption1Desc: "À l'aide de votre iPhone, scannez le QR Code ci-dessous pour ouvrir directement l'application :",
    iosQrCardSub: "Scannez le QR Code avec l'appareil photo de votre iPhone.",
    iosScanHint: "Pointez votre appareil photo sur le code",

    iosOption2Label: "Option 2 :",
    iosOption2Desc: "Ou bien, ouvrez cette page sur votre iPhone et cliquez sur le bouton ci-dessous :",
    iosBtnOpen: "Ouvrir l'application",

    iosStep2Number: "2",
    iosStep2Title: "Appuyez sur l'icône Partager ⬆️",
    iosStep2Desc: "(le carré avec la flèche vers le haut en bas).",
    iosStep2Detail: "Dans la barre d'outils en bas de votre écran, touchez le bouton Partager.",

    iosStep3Number: "3",
    iosStep3Title: "Sélectionnez \"Sur l'écran d'accueil\" ➕",
    iosStep3Desc: "Faites défiler les options vers le bas, appuyez sur \"Sur l'écran d'accueil\", puis validez en appuyant sur \"Ajouter\" en haut à droite.",
    iosStep3Badge: "Sur l'écran d'accueil",

    iosStep4Number: "4",
    iosStep4Title: "Ouvrir l'application et vous connecter",
    iosStep4Desc: "Lancez l'application المعماري depuis votre écran d'accueil, connectez-vous avec vos identifiants ou créez votre compte.",

    // SWITCH PROMPTS (LIENS SIMPLES)
    switchPromptToIosTitle: "Vous utilisez un iPhone (iOS) ?",
    switchPromptToIosAction: "Afficher le guide d'installation iPhone",
    switchPromptToAndroidTitle: "Vous utilisez un smartphone Android ?",
    switchPromptToAndroidAction: "Afficher l'installation Android (APK)"
  },
  ar: {
    brand: "المعماري",
    brandSubtitle: "المجلس الوطني لهيئة المهندسين المعماريين",
    switchLang: "Français",
    pageTitle: "تثبيت التطبيق المحمول على الهاتف",
    pageSubtitle: "اتبع الخطوات البسيطة أدناه لتثبيت التطبيق بسهولة على هاتفك الذكي (أندرويد أو آيفون).",

    // SELECTEUR DE PLATEFORME
    tabAndroid: "أندرويد (APK)",
    tabIos: "آيفون (iOS)",
    platformBadgeAndroid: "تثبيت مباشر APK",
    platformBadgeIos: "إضافة إلى الشاشة الرئيسية",

    // GUIDE ANDROID
    androidHeaderTitle: "طريقة التثبيت على هاتف أندرويد :",
    androidHeaderSubtitle: "اتبع هذه الخطوات البسيطة لتنزيل وتثبيت التطبيق على هاتفك الأندرويد :",

    step1Number: "1",
    step1Title: "تحميل التطبيق المحمول",
    option1Label: "الخيار 1 :",
    option1Desc: "باستخدام هاتفك الذكي، امسح رمز QR Code أدناه واضغط على \"فتح الرابط\" لتنزيل تطبيق المعماري مباشرة :",
    qrCardTitle: "تحميل تطبيق المعماري",
    qrCardSub: "امسح رمز QR Code لتنزيل التطبيق المحمول المعماري.",
    scanHint: "وجّه كاميرا الهاتف نحو الرمز",

    option2Label: "الخيار 2 :",
    option2Desc: "أو افتح هذه الصفحة من متصفح هاتفك واضغط على الزر أدناه لتنزيل ملف التثبيت المباشر للتطبيق المحمول :",
    btnDownloadMain: "تحميل التطبيق (ملف APK)",
    btnAppStore: "App Store (آيفون)",
    btnGooglePlay: "Google Play",
    btnApkDirect: "ملف APK المباشر",

    step2Number: "2",
    step2Title: "تثبيت الملف على هاتفك الذكي",
    step2Desc: "بعد اكتمال التنزيل، افتح الملف المُنزل (.apk) من قائمة الإشعارات أو مدير الملفات، ثم اضغط على زر \"تثبيت\".",
    step2Tip: "إذا طلب منك نظام أندرويد السماح بتثبيت التطبيقات من هذا المصدر، اضغط على \"الإعدادات\" ثم فعّل \"السماح من هذا المصدر\".",

    step3Number: "3",
    step3Title: "فتح التطبيق وتسجيل الدخول",
    step3Desc: "افتح تطبيق المعماري من شاشة هاتفك، سجّل الدخول بحسابك أو أنشئ حساباً جديداً.",

    // GUIDE IPHONE (iOS)
    iosHeaderTitle: "طريقة التثبيت على هاتف آيفون (iOS) :",
    iosHeaderSubtitle: "اتبع هذه الخطوات البسيطة لتثبيت واستخدام التطبيق على هاتفك الآيفون :",

    iosStep1Number: "1",
    iosStep1Title: "فتح التطبيق على هاتف الآيفون",

    iosOption1Label: "الخيار 1 :",
    iosOption1Desc: "باستخدام هاتف الآيفون، امسح رمز QR Code أدناه لفتح التطبيق مباشرة :",
    iosQrCardSub: "امسح رمز QR Code بكاميرا الآيفون لفتح التطبيق.",
    iosScanHint: "وجّه كاميرا الهاتف نحو الرمز",

    iosOption2Label: "الخيار 2 :",
    iosOption2Desc: "أو افتح هذه الصفحة من هاتف الآيفون واضغط على الزر أدناه :",
    iosBtnOpen: "فتح التطبيق",

    iosStep2Number: "2",
    iosStep2Title: "اضغط على أيقونة المشاركة ⬆️",
    iosStep2Desc: "(المربع الذي يحتوي على سهم يشير للأعلى في الأسفل).",
    iosStep2Detail: "في شريط الأدوات أسفل شاشة الهاتف، اضغط على زر المشاركة.",

    iosStep3Number: "3",
    iosStep3Title: "اختر \"إضافة إلى الصفحة الرئيسية\" ➕",
    iosStep3Desc: "مرر الخيارات للأسفل، ثم اضغط على \"إضافة إلى الصفحة الرئيسية\" (Sur l'écran d'accueil) واضغط \"إضافة\" في الأعلى.",
    iosStep3Badge: "إضافة إلى الصفحة الرئيسية",

    iosStep4Number: "4",
    iosStep4Title: "فتح التطبيق وتسجيل الدخول",
    iosStep4Desc: "افتح تطبيق المعماري من شاشة هاتفك، سجّل الدخول بحسابك أو أنشئ حساباً جديداً.",

    // SWITCH PROMPTS (LIENS SIMPLES)
    switchPromptToIosTitle: "هل تستخدم هاتف آيفون (iOS)؟",
    switchPromptToIosAction: "عرض دليل تثبيت الآيفون",
    switchPromptToAndroidTitle: "هل تستخدم هاتف أندرويد؟",
    switchPromptToAndroidAction: "عرض تثبيت أندرويد (APK)"
  }
};

// Nom du fichier APK déposé dans public/
export const APK_FILE_NAME = import.meta.env.VITE_APK_FILE_NAME || "cnoa-app.apk";
export const APK_DOWNLOAD_URL = `/${APK_FILE_NAME}`;

/**
 * Fonction de détection automatique de la plateforme (iOS ou Android)
 */
export function detectDevicePlatform() {
  if (typeof window === 'undefined') return 'android';

  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';

  // 1. Détection iPhone / iPad / iPod (y compris Safari iPadOS en mode bureau)
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) return 'ios';

  // 2. Détection Android
  const isAndroid = /Android/i.test(userAgent);
  if (isAndroid) return 'android';

  // 3. Par défaut (ordinateur / autre)
  return 'android';
}

export default function SiteApplication() {
  const [lang, setLang] = useState('fr'); // 'fr' ou 'ar'
  // Initialisation immédiate avec la plateforme détectée (zéro délai / zéro clignotement)
  const [platform, setPlatform] = useState(detectDevicePlatform);
  const [downloadUrl, setDownloadUrl] = useState(APK_DOWNLOAD_URL);
  const [webAppUrl, setWebAppUrl] = useState('');

  const t = translations[lang] || translations.fr;
  const isRtl = lang === 'ar';

  // Gestion autonome des éléments du <head> et confirmation de la détection
  useEffect(() => {
    // 1. Direction et Langue
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // 2. Titre dynamique de l'onglet
    document.title = lang === 'ar' 
      ? 'المعماري - تطبيق إدارة وتصريح المشاريع المعمارية (CNOA)'
      : 'المعماري - Guide Officiel d\'Installation (CNOA)';

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
      ? 'تطبيق المعماري CNOA لتسهيل تصريح ومتابعة المشاريع المعمارية.'
      : 'Application mobile officielle CNOA المعماري pour la gestion de vos projets architecturaux.';

    // 5. URL absolue pour le téléchargement et QR code
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hostOrigin = isLocalhost 
        ? `http://192.168.100.19:${window.location.port || '5174'}`
        : window.location.origin;
        
      setDownloadUrl(`${hostOrigin}/${APK_FILE_NAME}`);
      setWebAppUrl(import.meta.env.VITE_IOS_APP_URL || hostOrigin);

      // Détection automatique au montage
      const detected = detectDevicePlatform();
      setPlatform(detected);
    }
  }, [lang, isRtl]);

  const toggleLanguage = () => {
    setLang(lang === 'fr' ? 'ar' : 'fr');
  };

  // URL des QR Codes (Taille HD 300x300)
  const qrCodeApkUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=020617&data=${encodeURIComponent(
    downloadUrl
  )}`;

  const qrCodeIosUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=020617&data=${encodeURIComponent(
    webAppUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://cnoa.arch.dz')
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

        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 2s ease-in-out infinite;
        }
        
        /* Custom scrollbar & selections */
        ::selection {
          background-color: #206d3e;
          color: #ffffff;
        }
      `}</style>

      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute w-[40rem] h-[40rem] bg-gradient-to-tr from-[#206d3e]/20 via-emerald-500/10 to-teal-500/10 rounded-full blur-3xl -top-24 left-1/2 -translate-x-1/2 pointer-events-none animate-pulse-glow"></div>

      {/* ===================== EN-TETE / HEADER ===================== */}
      <header className="max-w-2xl w-full mb-8 relative z-10 flex items-center justify-between">
        {/* Logo de l'application */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#17522e] via-[#206d3e] to-[#2eb865] p-0.5 shadow-lg shadow-[#206d3e]/25 flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Building className="w-6 h-6 text-[#2eb865]" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-2xl tracking-tight text-white font-cairo leading-none">
              {t.brand}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-1">
              {t.brandSubtitle}
            </span>
          </div>
        </div>

        {/* Sélecteur de langue */}
        <button
          onClick={toggleLanguage}
          aria-label="Changer de langue"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold shadow-md hover:border-[#206d3e]/50 transition-all cursor-pointer active:scale-95"
        >
          <Globe className="w-4 h-4 text-[#2eb865]" />
          <span>{t.switchLang}</span>
        </button>
      </header>

      {/* ===================== CARTE PRINCIPALE ===================== */}
      <main className="max-w-2xl w-full bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 border border-slate-800/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative z-10">

        {/* Titre de la page */}
        <div className="text-center mb-8 pb-6 border-b border-slate-800/80">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
            {t.pageSubtitle}
          </p>

          {/* ===================== SELECTEUR D'ONGLETS (ANDROID / IPHONE) ===================== */}
          <div className="mt-7 inline-flex p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-inner w-full max-w-md mx-auto">
            {/* Onglet Android */}
            <button
              onClick={() => setPlatform('android')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                platform === 'android'
                  ? 'bg-gradient-to-r from-[#17522e] via-[#206d3e] to-[#2eb865] text-white shadow-lg shadow-[#206d3e]/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{t.tabAndroid}</span>
            </button>

            {/* Onglet iPhone (iOS) */}
            <button
              onClick={() => setPlatform('ios')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                platform === 'ios'
                  ? 'bg-gradient-to-r from-[#17522e] via-[#206d3e] to-[#2eb865] text-white shadow-lg shadow-[#206d3e]/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>{t.tabIos}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VUE 1 : GUIDE POUR IPHONE (iOS - ECRAN D'ACCUEIL)                          */}
        {/* ========================================================================= */}
        {platform === 'ios' && (
          <div className="transition-opacity duration-300">
            {/* Box Cadre iOS Stylisé */}
            <div className="rounded-3xl bg-gradient-to-b from-slate-950/90 to-slate-900/90 border-2 border-[#206d3e]/50 p-5 sm:p-8 shadow-2xl relative overflow-hidden">
              
              {/* En-tête de la boîte iOS */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/80 text-left rtl:text-right">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-[#2eb865] flex items-center justify-center text-white shadow-md shadow-emerald-600/30 flex-shrink-0">
                  <Apple className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                    <span>{t.iosHeaderTitle}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.iosHeaderSubtitle}
                  </p>
                </div>
              </div>

              {/* LISTE DES ETAPES iOS */}
              <div className="space-y-8">

                {/* ----------------- ETAPE 1 iOS : QR CODE & BOUTON GRAND FORMAT ----------------- */}
                <section className="text-left rtl:text-right">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#17522e] via-[#206d3e] to-[#2eb865] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-[#206d3e]/30">
                      {t.iosStep1Number}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {t.iosStep1Title}
                    </h3>
                  </div>

                  {/* Option 1 : Grand QR Code comme dans Android */}
                  <div className="mb-8">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                      <strong className="text-[#2eb865] font-bold">{t.iosOption1Label}</strong>{' '}
                      {t.iosOption1Desc}
                    </p>

                    {/* Cadre en pointillés grand format */}
                    <div className="border-2 border-dashed border-[#206d3e]/50 rounded-3xl p-6 sm:p-8 bg-slate-950/70 max-w-sm mx-auto shadow-inner flex flex-col items-center text-center">
                      <p className="text-[11px] text-slate-400 mb-4 max-w-[240px] leading-snug">
                        {t.iosQrCardSub}
                      </p>

                      {/* Grand QR Code 48x48 HD */}
                      <div className="w-48 h-48 bg-white rounded-2xl p-2.5 shadow-2xl border-4 border-[#206d3e]/40 flex items-center justify-center hover:scale-105 transition-transform duration-300 overflow-hidden">
                        <img
                          src={qrCodeIosUrl}
                          alt="QR Code iOS"
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2eb865] mt-3">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{t.iosScanHint}</span>
                      </div>
                    </div>
                  </div>

                  {/* Option 2 : Grand Bouton Principal */}
                  <div className="pt-6 border-t border-slate-800/80">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
                      <strong className="text-[#2eb865] font-bold">{t.iosOption2Label}</strong>{' '}
                      {t.iosOption2Desc}
                    </p>

                    <div className="flex flex-col items-center text-center">
                      <a
                        href={webAppUrl || (typeof window !== 'undefined' ? window.location.origin : '#')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#17522e] via-[#206d3e] to-[#2eb865] hover:brightness-110 text-white font-black text-sm sm:text-base shadow-xl shadow-[#206d3e]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-5 h-5 animate-bounce" />
                        <span>{t.iosBtnOpen}</span>
                      </a>
                    </div>
                  </div>

                </section>

                {/* ----------------- ETAPE 2 iOS ----------------- */}
                <section className="pt-6 border-t border-slate-800/80 text-left rtl:text-right">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-[#2eb865] font-bold text-sm flex items-center justify-center shrink-0 border border-[#206d3e]/40">
                      {t.iosStep2Number}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                      <span>2. {t.iosStep2Title}</span>
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11 rtl:pl-0 rtl:pr-11 mb-3">
                    {t.iosStep2Desc}
                  </p>

                  {/* Mockup visuel du bouton Partager */}
                  <div className="ml-11 rtl:ml-0 rtl:mr-11 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center animate-bounce-subtle shrink-0">
                        <SquareArrowUp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Icône Partager
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {t.iosStep2Detail}
                        </span>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-[10px] font-bold border border-blue-500/20 whitespace-nowrap">
                      ⬆️ Partager
                    </div>
                  </div>
                </section>

                {/* ----------------- ETAPE 3 iOS ----------------- */}
                <section className="pt-6 border-t border-slate-800/80 text-left rtl:text-right">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#206d3e]/20 text-[#2eb865] font-bold text-sm flex items-center justify-center shrink-0 border border-[#206d3e]/50">
                      {t.iosStep3Number}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                      <span>3. {t.iosStep3Title}</span>
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11 rtl:pl-0 rtl:pr-11 mb-3">
                    {t.iosStep3Desc}
                  </p>

                  {/* Mockup visuel de l'option "Sur l'écran d'accueil" */}
                  <div className="ml-11 rtl:ml-0 rtl:mr-11 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <PlusSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {t.iosStep3Badge}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Puis appuyez sur "Ajouter" en haut à droite.
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/20">
                      ➕ Ajouter
                    </span>
                  </div>
                </section>

                {/* ----------------- ETAPE 4 iOS : OUVRIR ET SE CONNECTER ----------------- */}
                <section className="pt-6 border-t border-slate-800/80 text-left rtl:text-right">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#206d3e]/20 text-[#2eb865] font-bold text-sm flex items-center justify-center shrink-0 border border-[#206d3e]/50">
                      {t.iosStep4Number}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {t.iosStep4Title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11 rtl:pl-0 rtl:pr-11">
                    {t.iosStep4Desc}
                  </p>
                </section>

              </div>

            </div>

            {/* ========================================================================= */}
            {/* LIEN SIMPLE VERS ANDROID                                                  */}
            {/* ========================================================================= */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setPlatform('android')}
                className="text-xs sm:text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <span>{t.switchPromptToAndroidTitle}</span>
                <span className="text-[#2eb865] underline font-bold">{t.switchPromptToAndroidAction}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#2eb865] rtl:rotate-180" />
              </button>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 2 : GUIDE POUR ANDROID (APK & QR CODE DIRECT)                         */}
        {/* ========================================================================= */}
        {platform === 'android' && (
          <div className="transition-opacity duration-300">
            {/* Box Cadre Android Stylisé */}
            <div className="rounded-3xl bg-gradient-to-b from-slate-950/90 to-slate-900/90 border-2 border-[#206d3e]/50 p-5 sm:p-8 shadow-2xl relative overflow-hidden">

              {/* En-tête de la boîte Android */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/80 text-left rtl:text-right">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-[#2eb865] flex items-center justify-center text-white shadow-md shadow-emerald-600/30 flex-shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                    <span>{t.androidHeaderTitle}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.androidHeaderSubtitle}
                  </p>
                </div>
              </div>

              {/* LISTE DES 3 ETAPES ANDROID */}
              <div className="space-y-8">

                {/* ----------------- ETAPE 1 ANDROID : TELECHARGER L'APPLICATION ----------------- */}
                <section className="text-left rtl:text-right">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#17522e] via-[#206d3e] to-[#2eb865] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-[#206d3e]/30">
                      {t.step1Number}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {t.step1Title}
                    </h3>
                  </div>

                  {/* Option 1 : Scan QR Code */}
                  <div className="mb-8">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                      <strong className="text-[#2eb865] font-bold">{t.option1Label}</strong>{' '}
                      {t.option1Desc}
                    </p>

                    {/* Cadre en pointillés (Dashed Box) */}
                    <div className="border-2 border-dashed border-[#206d3e]/50 rounded-3xl p-6 sm:p-8 bg-slate-950/70 max-w-sm mx-auto shadow-inner flex flex-col items-center text-center">
                      <p className="text-[11px] text-slate-400 mb-4 max-w-[240px] leading-snug">
                        {t.qrCardSub}
                      </p>

                      {/* QR Code haute visibilité */}
                      <div className="w-48 h-48 bg-white rounded-2xl p-2.5 shadow-2xl border-4 border-[#206d3e]/40 flex items-center justify-center hover:scale-105 transition-transform duration-300 overflow-hidden">
                        <img
                          src={qrCodeApkUrl}
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
                  <div className="pt-6 border-t border-slate-800/80">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
                      <strong className="text-[#2eb865] font-bold">{t.option2Label}</strong>{' '}
                      {t.option2Desc}
                    </p>

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

                {/* ----------------- ETAPE 2 ANDROID : INSTALLER LE FICHIER ----------------- */}
                <section className="pt-6 border-t border-slate-800/80 text-left rtl:text-right">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-[#2eb865] font-bold text-sm flex items-center justify-center shrink-0 border border-[#206d3e]/40">
                      {t.step2Number}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {t.step2Title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11 rtl:pl-0 rtl:pr-11 mb-3">
                    {t.step2Desc}
                  </p>

                  <div className="ml-11 rtl:ml-0 rtl:mr-11 p-3.5 rounded-2xl bg-[#206d3e]/10 border border-[#206d3e]/30 text-xs text-emerald-200/90 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#2eb865] shrink-0 mt-0.5" />
                    <span>{t.step2Tip}</span>
                  </div>
                </section>

                {/* ----------------- ETAPE 3 ANDROID : OUVRIR ET SE CONNECTER ----------------- */}
                <section className="pt-6 border-t border-slate-800/80 text-left rtl:text-right">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#206d3e]/20 text-[#2eb865] font-bold text-sm flex items-center justify-center shrink-0 border border-[#206d3e]/50">
                      {t.step3Number}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {t.step3Title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11 rtl:pl-0 rtl:pr-11">
                    {t.step3Desc}
                  </p>
                </section>

              </div>

            </div>

            {/* ========================================================================= */}
            {/* LIEN SIMPLE VERS IPHONE (iOS)                                             */}
            {/* ========================================================================= */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setPlatform('ios')}
                className="text-xs sm:text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <span>{t.switchPromptToIosTitle}</span>
                <span className="text-[#2eb865] underline font-bold">{t.switchPromptToIosAction}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#2eb865] rtl:rotate-180" />
              </button>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
