import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';

interface MenuTile {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  adminOnly?: boolean;
}

const tiles: MenuTile[] = [
  {
    to: '/benefits',
    label: 'מיצוי זכויות',
    description: 'מדיניות תגמולים והטבות 2026',
    color: 'cyan',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-3-9a3 3 0 00-3 3v1H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-2V6a3 3 0 00-3-3z" />
      </svg>
    ),
  },
  {
    to: '/tickets/new',
    label: 'פתח קריאה',
    description: 'יצירת קריאה חדשה',
    color: 'amber',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/personal-area',
    label: 'אזור אישי 360',
    description: 'החיילים שלך',
    color: 'purple',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/battalion/import',
    label: 'יבוא/מחק גדוד',
    description: 'יבוא נתוני גדוד מקובץ או מחיקת גדוד קיים',
    color: 'violet',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    to: '/battalion/soldier',
    label: 'חיפוש חייל',
    description: 'חיפוש חייל לפי פרטים',
    color: 'emerald',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'לוח נתונים',
    description: 'סטטיסטיקות ונתונים',
    color: 'blue',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/mailing',
    label: 'רשימת תפוצה',
    description: 'שליחה לרשימת תפוצה',
    color: 'green',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    to: '/users/new',
    label: 'משתמש חדש',
    description: 'הוספת משתמש למערכת',
    color: 'rose',
    adminOnly: true,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    to: '/logs',
    label: 'לוגי מערכת',
    description: 'צפייה בלוגים של המערכת',
    color: 'orange',
    adminOnly: true,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; hover: string; glow: string }> = {
  amber:   { bg: 'bg-amber-950/50',   border: 'border-amber-800/60',   icon: 'text-amber-400',   hover: 'hover:border-amber-500 hover:shadow-amber-500/20',   glow: 'bg-amber-500' },
  cyan:    { bg: 'bg-cyan-950/50',    border: 'border-cyan-800/60',    icon: 'text-cyan-400',    hover: 'hover:border-cyan-500 hover:shadow-cyan-500/20',    glow: 'bg-cyan-500' },
  violet:  { bg: 'bg-violet-950/50',  border: 'border-violet-800/60',  icon: 'text-violet-400',  hover: 'hover:border-violet-500 hover:shadow-violet-500/20',  glow: 'bg-violet-500' },
  emerald: { bg: 'bg-emerald-950/50', border: 'border-emerald-800/60', icon: 'text-emerald-400', hover: 'hover:border-emerald-500 hover:shadow-emerald-500/20', glow: 'bg-emerald-500' },
  blue:    { bg: 'bg-blue-950/50',    border: 'border-blue-800/60',    icon: 'text-blue-400',    hover: 'hover:border-blue-500 hover:shadow-blue-500/20',    glow: 'bg-blue-500' },
  green:   { bg: 'bg-green-950/50',   border: 'border-green-800/60',   icon: 'text-green-400',   hover: 'hover:border-green-500 hover:shadow-green-500/20',   glow: 'bg-green-500' },
  purple:  { bg: 'bg-purple-950/50',  border: 'border-purple-800/60',  icon: 'text-purple-400',  hover: 'hover:border-purple-500 hover:shadow-purple-500/20',  glow: 'bg-purple-500' },
  rose:    { bg: 'bg-rose-950/50',    border: 'border-rose-800/60',    icon: 'text-rose-400',    hover: 'hover:border-rose-500 hover:shadow-rose-500/20',    glow: 'bg-rose-500' },
  orange:  { bg: 'bg-orange-950/50',  border: 'border-orange-800/60',  icon: 'text-orange-400',  hover: 'hover:border-orange-500 hover:shadow-orange-500/20',  glow: 'bg-orange-500' },
};

interface SliderItem {
  id: string;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

const sliderItems: SliderItem[] = [
  {
    id: 'legal-help',
    title: 'סיוע משפטי למשפחות המילואים',
    badge: 'שת"פ חדש',
    content: (
      <>
        <p className="text-xs text-gray-200 mb-1">
          פרויקט "הפירמה החברתית" במרכז משנה במכללה למנהל מציע סיוע משפטי במגוון תחומים:
        </p>
        <ul className="list-disc pr-4 text-[11px] text-gray-200 space-y-1">
          <li>הוצאה לפועל וחדלות פירעון</li>
          <li>בנקאות</li>
          <li>דיני עבודה</li>
          <li>דיני משפחה</li>
          <li>תביעות קטנות וסוגיות צרכניות</li>
          <li>מיצוי זכויות מול קרן הסיוע, ביטוח לאומי ואגף השיקום במשרד הביטחון</li>
        </ul>
        <p className="text-[11px] text-gray-300 mt-2">
          הסיוע ניתן על-ידי סטודנטים לתואר ראשון במשפטים, בליווי והנחיה של עורכי דין מנוסים, <span className="font-semibold text-emerald-300">ללא עלות.</span>
        </p>
        <a
          href="https://forms.monday.com/forms/10a7ccbfaa4c22dd53ce87f9bb5fec60?r=euc1"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center mt-3 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
        >
          למילוי טופס פנייה
        </a>
      </>
    ),
  },
  {
    id: 'bituach-leumi',
    title: 'דמי ביטוח לאומי על תגמולי מילואים',
    badge: 'מידע חיוני',
    content: (
      <>
        <p className="text-xs text-gray-200 mb-1">
          עצמאים, פרילנסרים וסטודנטים – חשוב להסדיר דמי ביטוח לאומי על תגמולי המילואים כדי למנוע חובות רטרואקטיביים.
        </p>
        <p className="text-[11px] text-gray-300 mb-1">
          תגמולי מילואים שנכנסים ישירות לחשבון נחשבים הכנסה, אבל דמי הביטוח הלאומי לא תמיד מנוכים במקור במלואם.
        </p>
        <p className="text-[11px] text-gray-200 font-semibold mt-1">חלוקה לפי סטטוס תעסוקתי:</p>
        <ul className="list-disc pr-4 text-[11px] text-gray-200 space-y-1">
          <li><span className="text-emerald-300">שכירים:</span> המעסיק מנכה ומדווח עבורכם כחלק מהשכר.</li>
          <li><span className="text-amber-300">עצמאיים / פרילנסרים:</span> חובה לוודא מול רו"ח שהמקדמות מעודכנות והתגמול נלקח בחשבון בדוח השנתי.</li>
          <li><span className="text-rose-300">סטודנטים / מי שאינו עובד:</span> זהו המקרה הנפוץ ליצירת חובות – יש לוודא שהסטטוס מעודכן והחיוב תואם להכנסה.</li>
        </ul>
        <p className="text-[11px] text-gray-200 mt-2 font-semibold">קיבלתם דרישת תשלום או קנס?</p>
        <ul className="list-disc pr-4 text-[11px] text-gray-200 space-y-1">
          <li>ניתן להגיש בקשה <span className="font-semibold">לפריסת תשלומים</span> באזור האישי באתר הביטוח הלאומי.</li>
          <li>ניתן לבקש <span className="font-semibold">ביטול קנסות והצמדות</span> על חובות שנוצרו בתקופת השירות.</li>
        </ul>
        <p className="text-[11px] text-gray-300 mt-2">
          מומלץ להיכנס כבר עכשיו לאזור האישי בביטוח הלאומי, לבדוק את מצב החשבון ולעדכן סטטוס תעסוקתי במידת הצורך.
        </p>
      </>
    ),
  },
];

export const HomePage: React.FC = () => {
  const { user } = useAuthStore();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (sliderItems.length <= 1) return;
    const id = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderItems.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const visibleTiles = tiles.filter((t) => !t.adminOnly || user?.role === 'admin');

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto" dir="rtl">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">חמל העורף</h1>
        <p className="text-gray-400 text-sm">מערכת מידע - בחר פעולה</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {visibleTiles.map((tile) => {
          const c = COLOR_MAP[tile.color];
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className={`group relative ${c.bg} ${c.border} border rounded-2xl p-5 flex flex-col items-center gap-3 text-center
                transition-all duration-300 ${c.hover} hover:shadow-lg hover:-translate-y-1`}
            >
              <div className={`absolute top-3 left-3 w-2 h-2 rounded-full ${c.glow} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <div className={`${c.icon} transition-transform duration-300 group-hover:scale-110`}>
                {tile.icon}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{tile.label}</p>
                <p className="text-gray-500 text-xs mt-1 hidden sm:block">{tile.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Slider - מתחלף כל 5 שניות */}
      {sliderItems.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-4 shadow-lg shadow-gray-900/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {sliderItems[currentSlide].badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-500/60 text-[11px] text-emerald-200">
                  {sliderItems[currentSlide].badge}
                </span>
              )}
              <h2 className="text-sm font-semibold text-white">
                {sliderItems[currentSlide].title}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {sliderItems.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentSlide === idx ? 'bg-cyan-400 w-4' : 'bg-gray-600 hover:bg-gray-400'
                  }`}
                  aria-label={`שקופית ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="mt-1">
            {sliderItems[currentSlide].content}
          </div>
        </div>
      )}
    </div>
  );
};
