import React, { useState } from 'react';
import { benefitsData } from '../data/benefitsData';

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block bg-gray-800 border border-gray-600 text-gray-200 text-xs px-2 py-1 rounded-lg">
    {children}
  </span>
);

interface BenefitItem {
  id: string;
  title: string;
  summary: string;
  content: React.ReactNode;
}

export const BenefitsPage: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showFund, setShowFund] = useState<string | false>(false);

  const benefits: BenefitItem[] = [
    {
      id: 'camps',
      title: 'השתתפות במימון קייטנות לילדים',
      summary: 'מדרגים א׳+, א׳ ו־ב׳ ששירתו לפחות 20 ימי שירות בשנת 2026',
      content: (
        <>
          <p>
            משרתי מילואים במדרגים א׳+, א׳ ו־ב׳ ששירתו לפחות 20 ימי שירות בכל סוג צו בשנת 2026,
            מתוכם 3 ימים בתקופת קייטנות (חג הפסח/קיץ/תשרי/חנוכה) או 21 ימים בחודשי הקיץ,
            יהיו זכאים להשתתפות במימון קייטנות לילדיהם.
          </p>
          <p>
            הקייטנה עבור ילדו של משרת המילואים שמועד תחילת הקייטנה היה גילו פחות מ-16.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">תקופות הקייטנות המזכות:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>פסח: 24.03.2026 – 08.04.2026</li>
            <li>קיץ: 01.07.2026 – 31.08.2026</li>
            <li>חגי תשרי: 22.09.2026 – 02.10.2026</li>
            <li>חנוכה: 06.12.2026 – 12.12.2026</li>
          </ul>
          <p className="font-semibold text-sm text-gray-100 mt-2">גובה הסיוע עבור כל הקייטנות:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>עד ילד אחד – 500 ש״ח</li>
            <li>כל ילד נוסף – 250 ש״ח</li>
          </ul>
          <p className="font-semibold text-sm text-gray-100 mt-2">תקרת סיוע שנתית לפי מדרג:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>מדרג א+ וא׳ – עד 2,000 ש״ח</li>
            <li>מדרג ב׳ – עד 1,300 ש״ח</li>
          </ul>
          <p className="text-sm mt-2">
            מימוש הזכאות באמצעות קרן הסיוע בהתאם להפצת מדיניות ייעודית בנושא.
            בהתאם להחלטת הממשלה - הטבה זו מותנית באישור חוק התקציב לשנת 2026.
          </p>
        </>
      ),
    },
    {
      id: 'maternity',
      title: 'מענק חופשת לידה',
      summary: 'למשרתי מילואים ששירתו 45 ימים בשנת 2026 ובן/בת הזוג לא חזר/ה לעבודה',
      content: (
        <>
          <p>
            משרת מילואים בכל המדרגים אשר שירת 45 ימי שמ"פ לפחות בשנת 2026,
            ובתנאי שבן/בת זוגתו לא חזר לעבודתו במשך 21 ימים לפחות, מעבר לתקופה המזכה בתשלום דמי לידה
            בהתאם לחוק ביטוח לאומי, יהיה זכאי למענק חופשת לידה.
          </p>
          <p>
            מתוך תקופת אי החזרה לעבודה לפחות 21 ימים היו בתקופה שמשרת המילואים שירת בשירות מזכה.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">
            גובה המענק: עד 10,700 ש״ח עבור כל לידה בשנת 2026.
          </p>
          <p className="text-sm mt-2">
            מימוש באמצעות קרן הסיוע לאחר הפצת מדיניות ייעודית בנושא.
          </p>
        </>
      ),
    },
    {
      id: 'moving',
      title: 'השתתפות בעלויות מעבר דירה',
      summary: 'מדרגים א׳+, א׳ ו־ב׳ שביצעו לפחות 45 ימי שמ״פ בשנת 2026',
      content: (
        <>
          <p>
            משרתי מילואים במדרגים א׳+, א׳ ו־ב׳ שביצעו לפחות 45 ימי שמ״פ בשנת 2026,
            בכל סוג צו במועד בו התקיים מעבר הדירה, יהיו זכאים להשתתפות בעלויות מעבר דירה על סך 2,500 ש"ח.
          </p>
          <p className="text-sm mt-2">
            אם חייל המילואים כבר קיבל סיוע בעלויות מעבר דירה בעבר, יקוזז סכום הסיוע שקיבל מההשתתפות,
            ובמידה וניצל את מלוא סכום ההשתתפות בעבר, לא יקבל מענק נוסף.
          </p>
          <p className="text-sm mt-2">
            מימוש באמצעות קרן הסיוע לאחר הפצת מדיניות ייעודית בנושא.
          </p>
        </>
      ),
    },
    {
      id: 'special-needs',
      title: 'מענק חד פעמי להורים לילד עם צרכים מיוחדים',
      summary: 'משרת מילואים ששירת 45 ימים לפחות בשנת 2026',
      content: (
        <>
          <p>
            מענק חד פעמי בגובה 2,000 ש"ח, שישולם למשרת מילואים ששירת 45 ימים לפחות בכל סוג צו בשנת 2026,
            והוא הורה לתלמיד עם צרכים מיוחדים, לפי חוק חינוך מיוחד התשמ"ח 1988,
            או הורה לילד הזכאי לגמלת ילד נכה, לפי חוק הביטוח הלאומי התשנ"ה 1995 והתקנות מכוחו.
          </p>
          <p className="text-sm mt-2">
            גובה מענק זה הינו חד פעמי לשנת 2026 בלבד, וללא כפל מענקים למשרת מילואים.
          </p>
          <p className="text-sm mt-2">
            מענק זה ישולם על ידי מופת לחשבון הבנק המוזן במערכת צה״ל.
            בהתאם להחלטת הממשלה - הטבה זו מותנית באישור חוק התקציב לשנת 2026.
          </p>
        </>
      ),
    },
    {
      id: 'family-bonus',
      title: 'מענק משפחה מוגדל',
      summary: 'משרתי מילואים שביצעו לפחות 40 ימי שירות בשנת 2026 ולהם ילד עד גיל 14',
      content: (
        <>
          <p>
            משרתי מילואים שביצעו לפחות 40 ימי שירות בשנת 2026 בכל סוג צו ולהם ילד עד גיל 14,
            יהיו זכאים למענק משפחה מוגדל.
          </p>
          <p className="text-sm mt-2">
            למניין 40 הימים לצורך הזכאות יספרו גם ימי מילואים שבוצעו לפי סעיף 8 לחוק שירות מילואים
            מיום 7.10.23 עד 31.12.25. המענק ישולם באופן יומי לאחר צבירת 40 ימי שירות מילואים.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">גובה המענק היומי לאחר 41 ימים לשירות המילואים לפי מדרג:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>מדרג א׳+ – 83 ש״ח</li>
            <li>מדרג א׳ – 71 ש״ח</li>
            <li>מדרג ב׳ – 60 ש״ח</li>
            <li>מדרג ג׳ – 60 ש״ח</li>
            <li>מדרג ד׳ – 33 ש״ח</li>
            <li>מדרג ה׳ – 21 ש״ח</li>
          </ul>
          <p className="text-sm mt-2">
            המענק ישולם על ידי מופת לחשבון הבנק, לאחר הפצת מדיניות ייעודית בנושא.
          </p>
        </>
      ),
    },
    {
      id: 'personal-expenses',
      title: 'מענק הוצאות אישיות',
      summary: 'משרתי מילואים שביצעו 40 ימי שירות ומעלה בשנת 2026',
      content: (
        <>
          <p>
            משרתי מילואים שביצעו 40 ימי שירות ומעלה בשנת 2026 בכל סוג צו יהיו זכאים למענק הוצאות אישיות.
          </p>
          <p className="text-sm mt-2">
            למניין 40 הימים לצורך הזכאות יספרו גם ימי מילואים שבוצעו לפי סעיף 8 לחוק שירות מילואים
            מיום 7.10.23 עד 31.12.25. המענק ישולם באופן יומי לאחר צבירת 40 ימי שירות מילואים.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">גובה המענק מהיום ה-41 לשירות המילואים לפי מדרג:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>מדרג א׳+ – 46 ש״ח</li>
            <li>מדרג א׳ – 39 ש״ח</li>
            <li>מדרג ב׳ – 31 ש״ח</li>
            <li>מדרג ג׳ – 31 ש״ח</li>
            <li>מדרג ד׳ – 18 ש״ח</li>
            <li>מדרג ה׳ – 11 ש״ח</li>
          </ul>
          <p className="text-sm mt-2">
            המענק ישולם על ידי מופת לחשבון הבנק לאחר הפצת מדיניות ייעודית בנושא.
          </p>
        </>
      ),
    },
    {
      id: 'household-bonus',
      title: 'תוספת למענק השנתי עבור הוצאות משק הבית',
      summary: 'מדרגי א׳+, א׳ ו־ב׳ שביצעו 45 ימי שמ״פ לפחות בשנת 2026',
      content: (
        <>
          <p>
            משרת מילואים במדרג פעילות א'+, א' ו-ב' שביצע 45 ימי שמ"פ לפחות בשנת 2026 בכל סוג צו,
            זכאי לתוספת למענק השנתי עבור הוצאות משק הבית בהתאם למדרג הפעילות.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">גובה המענק לפי מדרג:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>מדרג א׳+ – 1,250 ש״ח</li>
            <li>מדרג א׳ – 1,065 ש״ח</li>
            <li>מדרג ב׳ – 815 ש״ח</li>
          </ul>
          <p className="text-sm mt-2">
            מענק זה הינו חד פעמי ולשנת 2026 בלבד. המענק ישולם בספטמבר על ידי מופת לחשבון הבנק
            המוזן במערכת צה״ל, בהתאם להחלטת הממשלה - הטבה זו מותנית באישור חוק התקציב לשנת 2026.
          </p>
        </>
      ),
    },
    {
      id: 'commanders-bonus',
      title: 'מענק שנתי למפקדים במילואים',
      summary: 'מדרגי א׳+, א׳ בתפקיד פיקודי שביצעו 54 ימי שמ״פ (או 40 ימים לסטודנט)',
      content: (
        <>
          <p>
            במהלך שנת 2026 יינתן מענק שנתי חד פעמי למפקדים במילואים, במדרג א'+, א' שביצעו 54 ימי שמ"פ
            בכל סוג צו בשנת 2026 בתפקיד פיקודי. מפקד שהוא סטודנט – זכאי אם ביצע 40 ימי שמ״פ בשנת 2026
            בתפקיד פיקודי בכל סוג צו.
          </p>
          <p className="text-sm mt-2">
            הזכאות מותנית במינוי תקני ומוגדר במערכת, בהכשרה מסמיכה ובשיבוץ לתפקיד פיקודי מאושר.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">גובה המענק:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>מג״ד – 20,000 ש״ח</li>
            <li>סמג״ד, מ״פ – 10,000 ש״ח</li>
            <li>סמ״פ, מ״מ – 5,000 ש״ח</li>
          </ul>
          <p className="text-sm mt-2">
            ככל שמפקד קודם במהלך שירותו, ניתן לסכום את הימים שביצע בשני התפקידים לצורך עמידה בתנאי הזכאות,
            והמענק יחושב באופן יחסי. המענק ישולם על ידי מופת לחשבון הבנק של המפקד,
            בכפוף לאישור חוק התקציב לשנת 2026.
          </p>
        </>
      ),
    },
    {
      id: 'special-remuneration',
      title: 'תגמול מיוחד החל מהיום ה-61',
      summary: 'משרתי מילואים שביצעו שמ״פ בכל סוג צו בשנת 2026',
      content: (
        <>
          <p>
            משרתי מילואים שביצעו שמ"פ בכל סוג צו בשנת 2026, זכאים לתגמול מיוחד החל מהיום ה-61 כולל.
          </p>
          <p className="text-sm mt-2">
            למניין 60 הימים לצורך הזכאות, יספרו גם ימי המילואים שבוצעו לפי סעיף 8 לחוק שירות המילואים
            מיום 7.10.23 עד 31.12.2025.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">גובה התגמול היומי:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>מדרג א׳+ – 133 ש״ח</li>
            <li>מדרג א׳ – 113 ש״ח</li>
            <li>מדרג ב׳ – 86 ש״ח</li>
            <li>מדרג ג׳ – 60 ש״ח</li>
            <li>מדרג ד׳ – 40 ש״ח</li>
            <li>מדרג ה׳ – 30 ש״ח</li>
          </ul>
          <p className="text-sm mt-2">
            המענק ישולם על ידי מופת לחשבון הבנק, בהתאם להחלטת הממשלה ולאישור חוק התקציב לשנת 2026.
          </p>
        </>
      ),
    },
    {
      id: 'digital-wallet',
      title: 'ארנק דיגיטלי (פייטר)',
      summary: 'למי שביצע לפחות 10 ימי שירות בשנת 2026',
      content: (
        <>
          <p>
            משרתי מילואים שביצעו לפחות 10 ימי שירות בשנת 2026 בכל סוג צו, יהיו זכאים להטבות באמצעות הארנק הדיגיטלי.
          </p>
          <p className="text-sm mt-2">
            מימוש בכספים שנצברו בארנק הדיגטלי יתאפשר למטרות תשלום אגרות והטלים למדינה,
            פנאי ורווחה עבור המשרת ומשפחתו.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">פירוט הזכאות לפי מדרגים:</p>
          <p className="text-sm font-semibold mt-1">מדרג א׳+</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>45 ש״ח ליום מהיום ה-1 ועד היום ה-30 כולל.</li>
            <li>120 ש״ח ליום מהיום ה-31 ועד היום ה-45 כולל.</li>
            <li>70 ש"ח עבור כל יום מהיום ה-46 ואילך, עד תקרה של 5,000 ש״ח.</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג א׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>40 ש״ח ליום מהיום ה-1 ועד היום ה-30 כולל.</li>
            <li>100 ש״ח ליום מהיום ה-31 ועד היום ה-45 כולל.</li>
            <li>60 ש"ח עבור כל יום מהיום ה-46 ואילך, עד תקרה של 4,250 ש״ח.</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג ב׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>30 ש״ח ליום מהיום ה-1 ועד היום ה-30 כולל.</li>
            <li>80 ש״ח ליום מהיום ה-31 ועד היום ה-45 כולל.</li>
            <li>45 ש"ח עבור כל יום מהיום ה-46 ואילך, עד תקרה של 3,250 ש״ח.</li>
          </ul>
          <p className="text-sm mt-2">
            בהתאם להחלטת הממשלה - הטבה זו מותנית באישור חוק התקציב לשנת 2026.
          </p>
        </>
      ),
    },
    {
      id: 'vacation-voucher',
      title: 'שובר נופש לשנת 2026',
      summary: 'למשרתי מילואים ששירתו לפחות 45 ימי שירות בשנת 2026',
      content: (
        <>
          <p>
            משרתי מילואים שביצעו לפחות 45 ימי שירות בכל סוג צו, בין ה-01.01.2026 ל־31.12.2026
            יהיו זכאים לשובר נופש חד פעמי. תינתן תוספת בעבור כל יום החל מהיום ה-46 כולל ועד היום ה-60 כולל.
          </p>
          <p className="text-sm mt-2">
            הזכאות הינה חד פעמית ותינתן עד סוף 2028, בכפוף להחלטת הממשלה ואישור חוק התקציב.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">פירוט הזכאות לפי מדרגים (ללא/עם ילדים מתחת לגיל 14):</p>
          <p className="text-sm font-semibold mt-1">מדרג א׳+</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>ללא ילדים: 2,630 ש״ח + כ-58 ש״ח ליום (מהיום ה-46 עד ה-60), עד 3,500 ש״ח.</li>
            <li>עם ילד מתחת לגיל 14: 3,375 ש״ח + כ-75 ש״ח ליום, עד 4,500 ש״ח.</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג א׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>ללא ילדים: 2,200 ש״ח + כ-50 ש״ח ליום, עד 2,950 ש״ח.</li>
            <li>עם ילד מתחת לגיל 14: 2,925 ש״ח + כ-65 ש״ח ליום, עד 3,900 ש״ח.</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג ב׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>ללא ילדים: 1,700 ש״ח + כ-40 ש״ח ליום, עד 2,300 ש״ח.</li>
            <li>עם ילד מתחת לגיל 14: 2,250 ש״ח + כ-50 ש״ח ליום, עד 3,000 ש״ח.</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג ג׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>ללא ילדים: 780 ש״ח + כ-18 ש״ח ליום, עד 1,050 ש״ח.</li>
            <li>עם ילד מתחת לגיל 14: 1,020 ש״ח + כ-22 ש״ח ליום, עד 1,350 ש״ח.</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג ד׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>ללא ילדים: 780 ש״ח + כ-18 ש״ח ליום, עד 1,050 ש״ח.</li>
            <li>עם ילד מתחת לגיל 14: 1,020 ש״ח + כ-22 ש״ח ליום, עד 1,350 ש״ח.</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג ה׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>ללא ילדים: 605 ש״ח + כ-13 ש״ח ליום, עד 800 ש״ח.</li>
            <li>עם ילד מתחת לגיל 14: 760 ש״ח + כ-16 ש״ח ליום, עד 1,000 ש״ח.</li>
          </ul>
          <p className="text-sm mt-2">
            בהתאם להחלטת הממשלה - הטבה זו מותנית באישור חוק התקציב לשנת 2026.
          </p>
        </>
      ),
    },
    {
      id: 'mental-support',
      title: 'סיוע נפשי',
      summary: 'למשרתי מילואים במדרגים א׳+, א׳ ו־ב׳ שביצעו 50 ימי שירות ומעלה',
      content: (
        <>
          <p>
            משרתי מילואים שביצעו 50 ימי שירות ומעלה במדרגים א'+, א' ו-ב' בכל סוג צו החל מ־01.01.2026
            יהיו זכאים להחזר סיוע נפשי.
          </p>
          <p className="text-sm mt-2">
            הסיוע כולל השתתפות בטיפולי פסיכולוג, פסיכיאטר, עובד סוציאלי, מרפא בעיסוק או קלינאי תקשורת,
            וכן השתתפות בטיפול קבוצתי לחיזוק החוסן הנפשי עבור משרת המילואים.
          </p>
          <p className="text-sm mt-2">
            הטיפולים בעבור משרת המילואים ו/או בן/ת זוג ו/או ילדו עד גיל 18.
            גובה ההחזר 80% מעלות טיפול בפועל ועד 240 ש״ח למפגש, כשמימוש הזכאות עד סוף שנת 2027.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">תקרות החזר לפי מדרג והרכב משפחתי:</p>
          <p className="text-sm font-semibold mt-1">מדרג א׳+</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>4 ילדים ומעלה – עד 25 טיפולים, תקרה עד 6,000 ש״ח</li>
            <li>1–3 ילדים – עד 22 טיפולים, תקרה עד 5,280 ש״ח</li>
            <li>ללא ילדים – עד 15 טיפולים, תקרה עד 3,600 ש״ח</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג א׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>4 ילדים ומעלה – עד 21 טיפולים, תקרה עד 5,040 ש״ח</li>
            <li>1–3 ילדים – עד 18 טיפולים, תקרה עד 4,320 ש״ח</li>
            <li>ללא ילדים – עד 13 טיפולים, תקרה עד 3,120 ש״ח</li>
          </ul>
          <p className="text-sm font-semibold mt-2">מדרג ב׳</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>4 ילדים ומעלה – עד 17 טיפולים, תקרה עד 4,080 ש״ח</li>
            <li>1–3 ילדים – עד 14 טיפולים, תקרה עד 3,360 ש״ח</li>
            <li>ללא ילדים – עד 10 טיפולים, תקרה עד 2,400 ש״ח</li>
          </ul>
          <p className="text-sm mt-2">
            מימוש הזכאות לאחר הפצת מדיניות ייעודית בנושא.
          </p>
        </>
      ),
    },
    {
      id: 'students',
      title: 'סטודנטים במילואים ושכר לימוד',
      summary: 'סיוע בשכר לימוד ושוברים להכשרה מקצועית',
      content: (
        <>
          <p>
            סטודנטים ששירתו לפחות 50 ימי שמ״פ בשירות מזכה בכל סוג צו החל מה-23.10.2025 ועד 30.9.2026,
            זכאים לסיוע בתשלום שכר הלימוד בשנת תשפ"ו במוסדות להשכלה גבוהה, במוסדות לאומנות
            או במכללות טכנולוגיות המאושרות ע"י המה"ט.
          </p>
          <p className="font-semibold text-sm text-gray-100 mt-2">שיעור השתתפות על פי מדרגים:</p>
          <ul className="list-disc pr-5 text-sm space-y-1">
            <li>מדרג א'+ – 100%</li>
            <li>מדרג א' – 85%</li>
            <li>מדרג ב' – 65%</li>
            <li>מדרג ג' – 30%</li>
            <li>מדרג ד' – 30%</li>
            <li>מדרג ה' – 22%</li>
          </ul>
          <p className="text-sm mt-2">
            משרת מילואים המקבל מלגת לימודים במימון המדינה יהיה זכאי לסיוע זה רק על יתרת שכר הלימודים
            שאינה מכוסה על ידי המלגה, וללא כפל מימון.
          </p>
          <p className="text-sm mt-2">
            משרתי מילואים במדרג א'+, א' ו-ב' ששירתו בשירות מזכה מעל 50 ימים באותה תקופה ואינם זכאים לסיוע בשכר לימוד,
            יהיו זכאים במהלך שנת 2026 לשוברים להכשרה מקצועית והכוונה תעסוקתית באמצעות משרד העבודה.
          </p>
          <p className="text-sm mt-2">
            משרתי מילואים במדרג א'+ שהינם סטודנטים לתואר ראשון במקצועות שיוגדרו, יהיו זכאים לחניכה פרטנית
            או בקבוצות קטנות לשנת הלימודים תשפ"ו, בכפוף לקריטריונים שייקבעו ואישור חוק התקציב לשנת 2026.
          </p>
        </>
      ),
    },
  ];

  const tiles: { id: string; title: string; icon: string; color: string; content: React.ReactNode }[] = [
    {
      id: 'policy', title: 'מדיניות תגמולים, מענקים והטבות – 2026', icon: '📋', color: 'blue',
      content: (
        <>
          <p className="font-medium text-white">כל השינויים, ההרחבות והזכאויות לשנת 2026 – גם עבור שירות מילואים בצו שגרה</p>
          <p>על רקע הימשכות הלחימה והיקף שירות המילואים המתמשך, בתאריך 25.01.26 אושרה החלטת ממשלה רחבה לשנת 2026, שמטרתה להמשיך ולחזק את מערך ההוקרה, הסיוע והתגמול למשרתי ומשרתות המילואים ולבני משפחותיהם.</p>
          <p>ההחלטה מתבססת על שורת החלטות ממשלה שאושרו במהלך השנים האחרונות (החלטות ממשלה מספר <Badge>2540</Badge> <Badge>1023</Badge> <Badge>1126</Badge> <Badge>3004</Badge>), ומרחיבה ומעדכנת את המענים שנקבעו בהן בהתאם לצרכים שעלו מהשטח.</p>
        </>
      ),
    },
    {
      id: 'changes', title: 'שנת 2026 – התפתחות משמעותית', icon: '🔄', color: 'amber',
      content: (
        <>
          <p>שנת 2026 מסמנת התפתחות משמעותית במעטפת ההוקרה, הסיוע והתגמול למשרתי ומשרתות המילואים.</p>
          <p className="font-medium text-amber-200">לראשונה, מרבית המענים יינתנו במודל מדרגי, בהתאם להיקף השירות בפועל, ויוחלו גם על שירות מילואים בצו שגרה – ולא רק על שירות בצווי חירום.</p>
        </>
      ),
    },
    {
      id: 'routine', title: 'צווי שגרה שווים יותר מבעבר', icon: '✅', color: 'emerald',
      content: (
        <>
          <p>בשנת 2026 הזכאויות למענקים ולסיוע מקרן הסיוע לא תהיה מוגבלת לצווי 8 בלבד. גם שירות מילואים בצו שגרה ייספר לצורך קבלת הזכאויות השונות.</p>
          <p className="font-medium text-emerald-200">כלומר, כל מי שמשרת במילואים בשנת 2026 יכול להיות זכאי להטבות, בהתאם להיקף השירות, למדרג הפעילות ולתנאים של כל סעיף.</p>
        </>
      ),
    },
    {
      id: 'differential', title: 'מודל דיפרנציאלי – מדרגי פעילות', icon: '📊', color: 'purple',
      content: (
        <p>לראשונה, מרבית ההטבות והזכאויות בשנת 2026 יינתנו לפי מדרגי פעילות (יחידות) ולא רק לפי שיוך למערך לוחם או עורפי או לאופי הקריאה לשירות. המדרגים נקבעים בהתאם לאופי ולהיקף השירות בפועל.</p>
      ),
    },
    {
      id: 'fund', title: 'קרן הסיוע למשרתי המילואים', icon: '🤝', color: 'cyan',
      content: (
        <>
          <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50 mb-3">
            <p>קרן הסיוע למשרתי המילואים תמשיך לפעול גם בשנת 2026 ותעניק מגוון מענים כלכליים וחברתיים למשרתי מילואים.</p>
            <p className="font-semibold text-cyan-300 mt-1">חדשות משמחות! מרבית מהמענים מקרן הסיוע יינתנו גם בגין שירות מילואים בצו שגרה.</p>
            <p className="mt-1">תקנון קרן הסיוע המלא והמעודכן לשנת 2026 יפורסם בהמשך באתר המילואים.</p>
          </div>
          <p className="text-sm text-gray-400 mb-3">בחרו נושא כדי לפתוח פירוט מלא:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {benefitsData.map((b) => {
              const open = activeId === b.id;
              return (
                <div
                  key={b.id}
                  className={`bg-gray-900/80 border rounded-xl p-4 text-sm cursor-pointer transition-all duration-200 ${
                    open ? 'border-orange-400 shadow-lg shadow-orange-900/30' : 'border-gray-700 hover:border-orange-500/80 hover:shadow-md hover:shadow-orange-900/20'
                  }`}
                  onClick={(e) => { e.stopPropagation(); setActiveId(open ? null : b.id); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-100 text-sm mb-1">{b.title}</p>
                      <p className="text-sm text-gray-400">{b.summary}</p>
                    </div>
                    <span className={`mt-1 inline-flex items-center justify-center w-6 h-6 rounded-full border text-[11px] transition-transform ${open ? 'border-orange-400 text-orange-300 rotate-90' : 'border-gray-600 text-gray-400'}`}>
                      &gt;
                    </span>
                  </div>
                  {open && <div className="mt-3 text-sm text-gray-200 space-y-1 whitespace-pre-wrap">{b.content}</div>}
                </div>
              );
            })}
          </div>
        </>
      ),
    },
    {
      id: 'tiers', title: 'דוגמאות לחלוקה למדרגים', icon: '🎖️', color: 'orange',
      content: (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge>מדרג א+ – גדודים לוחמים ומקביליהם</Badge>
            <Badge>מדרג א׳ – חטיבות ומקבילותיהן</Badge>
            <Badge>מדרג ב׳ – אוגדות ומקבילותיהן</Badge>
            <Badge>מדרג ג׳ – הגמ״ר</Badge>
            <Badge>מדרג ד׳ – יחידות הדרכה ואבטחה</Badge>
            <Badge>מדרג ה׳ – פיקודים ומטות</Badge>
          </div>
          <p className="text-sm text-gray-400">* החלוקה למדרגים מובאת לצורך המחשה עקרונית בלבד, ואינה מהווה חלוקה מחייבת. השיוך למדרג פעילות (יחידות) נקבע בהתאם לפקודות הצבא, לאופי ולסוג שירות המילואים בפועל, ועל פי קביעת הגורמים המוסמכים.</p>
          <p className="text-sm text-cyan-300 mt-2">לבירור המדרג ניתן לפנות למוקד המילואים בטלפון <span className="font-bold" dir="ltr">1111</span> שלוחה 4 ואז שלוחה 1.</p>
        </>
      ),
    },
    {
      id: 'definitions', title: 'הגדרות', icon: '📖', color: 'rose',
      content: (
        <div className="space-y-3">
          {[
            { term: 'חייל מילואים', def: 'חייל בשירות מילואים שגויס מיום 7.10.2023 לפי חוק שירות מילואים התשס״ח-2008 או חייל שהתנדב לשירות מילואים החל מהמועד האמור.' },
            { term: 'חייל משוחרר', def: 'חייל שסיים את תקופת שירות החובה בה הוא חייב לפי חוק שירות ביטחון [נוסח משולב], התשמ"ו-1986.' },
            { term: 'בן זוג של חייל מילואים', def: 'מי שנשוי לחייל מילואים או שהוא וחייל המילואים הינם ״ידועים בציבור״ כדין.' },
            { term: 'מדרג פעילות (יחידות)', def: 'חייל מילואים ישויך למדרג פעילות מזכה בהטבות, לפי אופי וסוג שירות המילואים, כפי שיקבע רמ"ח מילואים באגף כוח האדם ובהתאם לפקודות הצבא, בסדר יורד: א\'+, א\', ב\', ג\', ד\' ו-ה\'.' },
            { term: 'שירות מזכה', def: 'שירות מילואים שבוצע לפי חוק שירות מילואים לאחר יום 1.1.2026.' },
            { term: 'סטודנט', def: 'כהגדרתו בחוק זכויות הסטודנט, התשס"ז 2007.' },
          ].map((d) => (
            <div key={d.term} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
              <p className="font-semibold text-rose-200 text-sm mb-1">{d.term}</p>
              <p className="text-sm">{d.def}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const TILE_COLORS: Record<string, { bg: string; border: string; borderActive: string; icon: string; glow: string; shadow: string }> = {
    blue:    { bg: 'bg-blue-950/40',    border: 'border-blue-800/50',    borderActive: 'border-blue-400',    icon: 'text-blue-400',    glow: 'bg-blue-500',    shadow: 'shadow-blue-500/30' },
    amber:   { bg: 'bg-amber-950/40',   border: 'border-amber-800/50',   borderActive: 'border-amber-400',   icon: 'text-amber-400',   glow: 'bg-amber-500',   shadow: 'shadow-amber-500/30' },
    emerald: { bg: 'bg-emerald-950/40', border: 'border-emerald-800/50', borderActive: 'border-emerald-400', icon: 'text-emerald-400', glow: 'bg-emerald-500', shadow: 'shadow-emerald-500/30' },
    purple:  { bg: 'bg-purple-950/40',  border: 'border-purple-800/50',  borderActive: 'border-purple-400',  icon: 'text-purple-400',  glow: 'bg-purple-500',  shadow: 'shadow-purple-500/30' },
    cyan:    { bg: 'bg-cyan-950/40',    border: 'border-cyan-800/50',    borderActive: 'border-cyan-400',    icon: 'text-cyan-400',    glow: 'bg-cyan-500',    shadow: 'shadow-cyan-500/30' },
    orange:  { bg: 'bg-orange-950/40',  border: 'border-orange-800/50',  borderActive: 'border-orange-400',  icon: 'text-orange-400',  glow: 'bg-orange-500',  shadow: 'shadow-orange-500/30' },
    rose:    { bg: 'bg-rose-950/40',    border: 'border-rose-800/50',    borderActive: 'border-rose-400',    icon: 'text-rose-400',    glow: 'bg-rose-500',    shadow: 'shadow-rose-500/30' },
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">מיצוי זכויות</h1>
        <p className="text-gray-400 text-sm">מדיניות תגמולים, מענקים והטבות למשרתי המילואים – שנת 2026</p>
      </div>

      {/* Tiles grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 mb-6">
        {tiles.map((tile) => {
          const c = TILE_COLORS[tile.color];
          const isOpen = showFund === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => setShowFund(isOpen ? false : tile.id)}
              className={`group relative ${c.bg} border ${isOpen ? `${c.borderActive} shadow-lg ${c.shadow}` : `${c.border} hover:shadow-lg hover:${c.shadow}`} rounded-2xl p-6 md:p-8 min-h-[140px] md:min-h-[170px] flex flex-col items-center justify-center gap-3 text-center transition-all duration-300 hover:-translate-y-1 ${isOpen ? '-translate-y-1' : ''}`}
            >
              {/* Glow dot */}
              <div className={`absolute top-3 left-3 w-2.5 h-2.5 rounded-full ${c.glow} ${isOpen ? 'opacity-100 animate-pulse' : 'opacity-40 group-hover:opacity-80'} transition-opacity`} />
              {/* Icon */}
              <span className="text-3xl md:text-4xl transition-transform duration-300 group-hover:scale-110">{tile.icon}</span>
              {/* Title */}
              <p className="text-white font-semibold text-sm md:text-base leading-tight">{tile.title}</p>
            </button>
          );
        })}
      </div>

      {/* Expanded content area */}
      {tiles.map((tile) => {
        if (showFund !== tile.id) return null;
        const c = TILE_COLORS[tile.color];
        return (
          <div
            key={tile.id}
            className={`bg-gray-900 rounded-xl border ${c.borderActive} p-5 shadow-xl ${c.shadow} mb-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${c.icon}`}>
                <span className="ml-2">{tile.icon}</span>
                {tile.title}
              </h2>
              <button
                type="button"
                onClick={() => setShowFund(false)}
                className="text-gray-400 hover:text-white p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed space-y-2">
              {tile.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};
