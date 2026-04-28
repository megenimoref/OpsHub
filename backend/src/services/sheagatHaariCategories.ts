/**
 * Category map for the "שאגת הארי" battalion-statistics dashboard.
 *
 * This is the single source of truth for how free-text soldier records get
 * bucketed into 9 top-level categories with ~80 subcategories. It is
 * intentionally a plain TS file (not a DB table) so the team can iterate on
 * keywords as they see real production data — every change is a pull request,
 * with a clear diff, and roll-forward / roll-back is trivial.
 *
 * How matching works (sheagatHaariService.ts):
 *  1. For each soldier we build a single search blob by concatenating all
 *     SCANNED_FIELDS (lowercased, NFC-normalised).
 *  2. For each subcategory we test the blob against `keywords` — Hebrew
 *     `String.includes` is good enough; people write the same phrases over
 *     and over even when free-form.
 *  3. A subcategory match counts the soldier ONCE for that subcategory and
 *     ONCE for its parent category, regardless of how many keywords inside
 *     the subcategory matched (no double-counting).
 *  4. Soldiers can match multiple categories — the dashboard shows that as
 *     "soldiers tagged with category X", not "soldiers who only need X".
 *
 * Iteration hint: the API also returns `unmatchedSamples` — short snippets
 * from the free-text fields of soldiers who have content but matched nothing.
 * Read those, expand keywords here, redeploy.
 */

/** Free-text fields searched per soldier. Order doesn't matter; missing/null
 *  columns fall back to '' in the service. Add a column here when a new field
 *  becomes meaningful (it doesn't have to exist in every battalion DB — the
 *  service is defensive about old schemas). */
export const SCANNED_FIELDS = [
  'request_status',
  'data_indicators',
  'notes',
  'other_assistance',
  'applications_needed',
  'complex_problems',
  'professional',
  'mobilization_dates',
  'route_6',
  'birth_assistance',
  'divorced_assistance',
  'household_assistance',
  'resilience_treatment',
  'welfare_fund',
  'national_insurance',
  'aid_fund_submission',
  'student_indicator',
  'personal_equipment',
  'employment_status',
  'marital_status',
  'special_family_status',
  'command_role',
  'followup_1',
  'followup_2',
] as const;

export interface Subcategory {
  /** Stable machine key — used in JSON, never shown to users. */
  key: string;
  /** Hebrew label shown in the dashboard. */
  label: string;
  /** Substrings tested against the lowercased search blob with `includes`. */
  keywords: string[];
}

export interface Category {
  key: string;
  label: string;
  /** UI hint — Tailwind colour name (rose/amber/emerald/...). */
  color: string;
  subcategories: Subcategory[];
}

export const CATEGORIES: Category[] = [
  {
    key: 'economic',
    label: 'חוסן כלכלי וכלכלת הבית',
    color: 'emerald',
    subcategories: [
      { key: 'grant_household',  label: 'מענק כלכלת בית',           keywords: ['מענק כלכלת בית', 'כלכלת בית', 'מענק בית'] },
      { key: 'grant_special',    label: 'מענק מיוחד',               keywords: ['מענק מיוחד', 'מענק חד פעמי'] },
      { key: 'aid_general',      label: 'סיוע כלכלי כללי',          keywords: [
          'סיוע כלכלי', 'עזרה כלכלית', 'מצוקה כלכלית',
          'השלמת הכנסה', 'הלוואה', 'הלוואות', 'ייעוץ כלכלי',
          'החזר טלפון', 'טלפון חדש',
          'החזר בגין קורסים', 'קורסים', 'קורס',
        ] },
      { key: 'fighter_card',     label: 'כרטיס דיגיטלי פייטר',      keywords: ['פייטר', 'כרטיס דיגיטלי', 'fighter'] },
      { key: 'vacation_voucher', label: 'שובר חופשה',               keywords: ['שובר חופשה', 'שוברי חופשה'] },
      { key: 'professional_fix', label: 'איש מקצוע ותיקונים',       keywords: ['איש מקצוע', 'תיקון', 'תיקונים', 'בעל מקצוע'] },
      { key: 'moving',           label: 'הובלה',                    keywords: ['הובלה', 'הובלות', 'הובלת'] },
      { key: 'cleaning',         label: 'ניקיון',                   keywords: ['ניקיון', 'נקיון', 'מנקה'] },
      { key: 'damage_property',  label: 'נזק לרכוש / מסלול ירוק',    keywords: [
          'נזק לרכוש', 'נזק לבית', 'נזק רכוש', 'תיקון נזק',
          'המסלול הירוק', 'מסלול ירוק', 'מס רכוש',
          'נזקי רכוש', 'רכושו נפגע', 'רכושם נפגע',
        ] },
      { key: 'damage_vehicle',   label: 'נזק חריג רכבים',           keywords: ['נזק לרכב', 'נזק רכב', 'נזק חריג', 'נזק לרכבים'] },
      { key: 'damage_personal',  label: 'נזק לציוד אישי',           keywords: ['ציוד אישי', 'נזק לציוד', 'אבדן ציוד'] },
      { key: 'route_6',          label: 'כביש 6',                   keywords: ['כביש 6', 'כביש שש', 'route 6'] },
      { key: 'pet_care',         label: 'פנסיון לבעלי חיים / דוגיסיטר', keywords: ['פנסיון', 'בעלי חיים', 'דוגיסיטר', 'דוג סיטר', 'כלב', 'חתול', 'חיות מחמד'] },
      { key: 'flights_vacation', label: 'החזר טיסות / נסיעות',         keywords: ['החזר טיסות', 'טיסה', 'טיסות', 'חופשה בחו', 'חופשה לחו', 'נסיעות', 'כסף לנסיעות', 'החזר נסיעות'] },
    ],
  },
  {
    key: 'employment',
    label: 'תעסוקה וזכויות עובדים (שכירים)',
    color: 'sky',
    subcategories: [
      { key: 'employer_issues',  label: 'בעיות מול המעסיק',          keywords: [
          'מול המעסיק', 'בעיה עם המעסיק', 'מעסיק', 'מעביד',
          'עבודה', 'מקום עבודה', 'שכיר',
        ] },
      { key: 'social_security',  label: 'בעיות מול ביטוח לאומי',      keywords: [
          'ביטוח לאומי', 'בלל', 'בט"ל', 'דמי אבטלה', 'אבטלה',
          'ביטוח לאומי', 'ל"א', 'בטל',
        ] },
      { key: 'reserve_payroll',  label: 'תגמולי מילואים נמוכים מהתלושים', keywords: [
          'תגמולי מילואים', 'תלוש', 'תלושים', 'תשלום מילואים',
          'תגמול נמוך', 'תגמולים',
        ] },
      { key: 'late_payment',     label: 'אי תשלום במועד / עיכוב',     keywords: ['אי תשלום', 'עיכוב תשלום', 'לא שילמו', 'איחור בתשלום'] },
      { key: 'income_loss',      label: 'אובדן הכנסה חייל',           keywords: ['אובדן הכנסה', 'איבוד הכנסה', 'הפסד הכנסה', 'לא עובד', 'לא עובדת', 'אינו עובד'] },
      { key: 'unpaid_leave',     label: 'חל"ת',                      keywords: ['חל"ת', 'חלת', 'חופשה ללא תשלום'] },
      { key: 'dismissal_protection', label: 'הגנה מפני פיטורין',     keywords: ['פיטורין', 'פיטורים', 'הגנה מפני פיטור', 'לא לפטר', 'פוטר בגלל מילואים', 'פוטרה בגלל מילואים', 'פיטורין בגלל מילואים'] },
    ],
  },
  {
    key: 'self_employed',
    label: 'חוסן כלכלי לעצמאיים',
    color: 'amber',
    subcategories: [
      { key: 'accountant',       label: 'רואי חשבון / ייעוץ',         keywords: ['רואה חשבון', 'רו"ח', 'יועץ מס', 'ייעוץ חשבונאי'] },
      { key: 'business_advisory', label: 'ליווי וייעוץ עסקי',         keywords: ['ייעוץ עסקי', 'ליווי עסקי', 'יועץ עסקי'] },
      { key: 'tax_authority',    label: 'מס הכנסה (נזק עקיף)',        keywords: ['מס הכנסה', 'נזק עקיף', 'מע"מ'] },
      { key: 'aid_fund_business',label: 'השלמות לעסקים',              keywords: ['השלמה לעסק', 'השלמות לעסקים'] },
      { key: 'self_employed_ni', label: 'תגמולי מילואים עצמאי',        keywords: [
          'מילואים עצמאי', 'תגמולי עצמאי', 'עצמאי',
          'זכויות עצמאי', 'ירידה בהכנסה בעסק', 'הכנסה בעסק',
          'בעסק העצמאי', 'עסק עצמאי',
        ] },
      { key: 'business_starting',label: 'עסק בהתהוות',                keywords: ['עסק בהתהוות', 'עסק חדש', 'הקמת עסק'] },
    ],
  },
  {
    key: 'family',
    label: 'מעטפת משפחתית',
    color: 'rose',
    subcategories: [
      { key: 'welfare_fund',     label: 'קרן הסיוע / מיצוי זכויות',   keywords: [
          // מיצוי זכויות — הביטוי הכי נפוץ בשטח
          'מיצוי זכויות', 'מיצוי',
          // קרן הסיוע
          'קרן הסיוע', 'קרן סיוע', 'זכאות', 'זכאויות',
          'הגשת בקשה לקרן', 'הגשה לקרן', 'זכאות בקרן',
          'קישורים רלוונטיים', 'קיבל הסבר', 'קיבלה הסבר',
          'הסבר על', 'הוסבר לו', 'הוסבר לה',
          // מענקים — כל אזכור מענק שייך לקרן הסיוע
          'מענק', 'מענקים', 'כלל המענקים', 'מענקים והזכויות',
          'הסבר על כלל המענקים', 'מענק מפקדים',
          'מענק למשרת', 'מענק משרת', 'משרת שאינו עובד',
          'הגשת בקשת מענק', 'הגשת בקשה', 'הגשה לאחר',
          // סוגי מענקים ספציפיים
          'נקודות זכות', 'הוצאות בית', 'מענק לא משרתים',
          'מענק אי שירות', 'הטבות',
        ] },
      { key: 'babysitter',       label: 'בייביסיטר',                  keywords: [
          'בייביסיטר', 'בייבי סיטר', 'baby sitter', 'מטפלת',
          'מטפל ילדים', 'איש בית', 'עוזרת בית',
        ] },
      { key: 'summer_camp',      label: 'קייטנות',                    keywords: ['קייטנה', 'קייטנות'] },
      { key: 'spouse_income_loss', label: 'אובדן הכנסה בת/בן זוג',    keywords: [
          'אובדן הכנסה בת', 'אובדן הכנסה בן', 'הכנסת בן זוג', 'הכנסת בת זוג',
          'הפסד בת זוג', 'הפסד בן זוג', 'הפסד הכנסת',
        ] },
      { key: 'spouse_dismissal', label: 'הגנה מפני פיטורין אשת חייל', keywords: [
          'פיטורין אשת', 'פיטורים אשת', 'הגנה אשת חייל',
          'אשת חייל', 'אשת המילואים',
        ] },
      { key: 'maternity',        label: 'חל"ד / מענק לידה',           keywords: [
          'חל"ד', 'חלד', 'חופשת לידה', 'מענק לידה', 'לאחר לידה', 'הריון', 'לידה',
        ] },
      { key: 'leave_hours',      label: 'ימי ושעות היעדרות',          keywords: [
          'ימי היעדרות', 'שעות היעדרות', 'היעדרות מהעבודה',
        ] },
      { key: 'divorced',         label: 'גרושים/ות (חליף משמורת)',     keywords: [
          'גרוש', 'גרושה', 'משמורת', 'הורות משותפת', 'חליף משמורת',
          'גרושים', 'פרוד', 'פרודה',
        ] },
      { key: 'single_parent',    label: 'הורה יחיד',                   keywords: [
          'הורה יחיד', 'הורה בודד', 'משפחה חד הורית', 'חד הורי', 'חד-הורי',
        ] },
    ],
  },
  {
    key: 'mental',
    label: 'חוסן נפשי ואישי',
    color: 'violet',
    subcategories: [
      { key: 'emotional_therapy',label: 'טיפול רגשי / סיוע נפשי',     keywords: [
          'טיפול רגשי', 'פסיכולוג', 'מטפל רגשי', 'טראומה',
          'מעטפת טיפולים רגשיים', 'מעטפת טיפולים', 'תמיכה נפשית',
          'חוסן נפשי', 'מצוקה נפשית', 'מצב נפשי', 'נפשי', 'פסיכיאטר',
          'פוסט טראומה', 'ptsd', 'חרדה', 'דיכאון',
          'רגשי', 'סיוע רגשי', 'סיוע נפשי', 'תמיכה רגשית',
        ] },
      { key: 'couple_therapy',   label: 'טיפול זוגי',                 keywords: ['טיפול זוגי', 'יעוץ זוגי', 'מטפל זוגי', 'ייעוץ זוגי'] },
      { key: 'family_therapy',   label: 'טיפול משפחתי',                keywords: ['טיפול משפחתי', 'מטפל משפחתי', 'יעוץ משפחתי'] },
      { key: 'therapy_funding',  label: 'מימון / החזר טיפולים',        keywords: [
          'החזר טיפולים', 'עמית', 'מימון טיפול', 'תוכנית עמית',
          'מימון / החזר', 'מחזור טיפולים',
          '1500 כפול 2', '1500x2', '1500כפול', 'כפול 2',
          'מענק נפשי', 'פיצוי נפשי',
        ] },
    ],
  },
  {
    key: 'legal',
    label: 'חוסן משפטי',
    color: 'slate',
    subcategories: [
      { key: 'legal_general',    label: 'ייעוץ משפטי כללי',           keywords: [
          'ייעוץ משפטי', 'עורך דין', 'עו"ד', 'משפטן',
          'ייעוץ משפטי כללי', 'ייצוג משפטי',
        ] },
      { key: 'legal_employer',   label: 'ליווי משפטי מול המעסיק',      keywords: ['משפטי מול המעסיק', 'תביעה מעסיק'] },
      { key: 'legal_govt',       label: 'ליווי מול גופים ממשלתיים',    keywords: [
          'גוף ממשלתי', 'משרד ממשלתי', 'מול הרשויות', 'מול המדינה',
          'רשות', 'עיריה', 'עירייה',
        ] },
    ],
  },
  {
    key: 'students',
    label: 'סטודנטים',
    color: 'cyan',
    subcategories: [
      { key: 'tutoring',         label: 'שיעורים פרטיים',             keywords: ['שיעורים פרטיים', 'מורה פרטי', 'שיעור פרטי'] },
      { key: 'student_id',       label: 'זיהוי סטודנט',               keywords: [
          'סטודנט', 'סטודנטית', 'תלמיד', 'תלמידה',
          'זכויות סטודנטים', 'מענק סטודנטים',
          'תואר ראשון', 'תואר שני', 'תואר שלישי',
          'שנה א', 'שנה ב', 'שנה ג', 'שנה ד',
          'שנה 1', 'שנה 2', 'שנה 3', 'שנה 4',
          'שנה ראשונה', 'שנה שנייה', 'שנה שלישית',
          'הנדסאי', 'הנדסאים', 'טכנאי', 'לימודים',
          'ממדים ללימודים',
        ] },
      { key: 'student_grants',   label: 'מענקים לסטודנטים',           keywords: [
          'מענק לסטודנט', 'מענק סטודנט', 'מימון לימודים',
          'קרן הסיוע לסטודנטים',
        ] },
      { key: 'mimadim',          label: 'ממדים ללימודים',             keywords: ['ממד"ים', 'ממדים'] },
      { key: 'academic_adjust',  label: 'התאמות אקדמיות',             keywords: ['התאמות אקדמיות', 'התאמה אקדמית'] },
      { key: 'institution_contact', label: 'קשר מול מוסד הלימודים',   keywords: [
          'מוסד הלימודים', 'אוניברסיטה', 'מכללה', 'בית ספר גבוה',
          'מוסד אקדמי', 'פקולטה',
        ] },
    ],
  },
  {
    key: 'special_pop',
    label: 'אוכלוסיות מיוחדות',
    color: 'fuchsia',
    subcategories: [
      { key: 'lone_soldier',     label: 'חייל בודד',                   keywords: [
          'חייל בודד', 'בודד', 'חיילת בודדת',
        ] },
      { key: 'abroad',           label: 'מרכז חיים בחו"ל',             keywords: [
          'חו"ל', 'בחול', 'מרכז חיים בחו', 'תושב חוץ', 'גר בחו"ל',
        ] },
      { key: 'new_immigrant',    label: 'עולה חדש',                    keywords: [
          'עולה חדש', 'עולה חדשה', 'עליה', 'עולים חדשים',
        ] },
      { key: 'disability',       label: 'מוגבלות / נכות',              keywords: [
          'מוגבלות', 'נכות', 'נכה', 'מוגבל', 'מגבלה רפואית',
        ] },
    ],
  },
  {
    key: 'extended',
    label: 'מעטפת מורחבת — רפואי, דיור, חינוך',
    color: 'orange',
    subcategories: [
      { key: 'reserve_injury',   label: 'פציעות גוף במילואים',         keywords: [
          'פציעה במילואים', 'פציעת גוף', 'נפצע', 'פצוע', 'אשפוז',
          'מחלה', 'כאב', 'בריאות',
        ] },
      { key: 'rehab_dept',       label: 'אגף השיקום',                   keywords: [
          'אגף השיקום', 'שיקום נכים', 'שיקום צה"ל', 'שיקום',
        ] },
      { key: 'medical_committee',label: 'ועדות רפואיות',                keywords: [
          'ועדה רפואית', 'ועדות רפואיות', 'ועדה רפואית בצה"ל',
        ] },
      { key: 'mortgage',         label: 'הקלות במשכנתא',                keywords: [
          'משכנתא', 'הקלה במשכנתא', 'דחיית משכנתא', 'דחייה במשכנתא',
        ] },
      { key: 'rent_landlord',    label: 'בעיות מול משכירים / מעבר דירה', keywords: ['משכיר', 'בעל הדירה', 'משכירים', 'מעבר דירה', 'עובר דירה', 'עוברת דירה'] },
      { key: 'rent_payment',     label: 'קשיים בתשלום שכ"ד',           keywords: [
          'שכר דירה', 'שכ"ד', 'שכד', 'קושי בשכר דירה',
        ] },
      { key: 'parked_vehicle',   label: 'תחזוקת רכבים בחניה',           keywords: ['רכב בחניה', 'חניית רכב', 'תחזוקת רכב'] },
      { key: 'transport',        label: 'שינוע לחזית/חזרה',             keywords: ['שינוע', 'הסעה לחזית', 'הסעה מהחזית'] },
      { key: 'school_issues',    label: 'בעיות בבתי ספר',                keywords: [
          'בית ספר', 'בית הספר', 'בית"ס', 'בית-ספר', 'גן ילדים',
        ] },
      { key: 'tutoring_kids',    label: 'תגבור לימודי לילדים',           keywords: [
          'תגבור לימודי', 'תגבור לימודים', 'מורה לילד',
        ] },
      { key: 'digital_literacy', label: 'אוריינות דיגיטלית',             keywords: [
          'אוריינות דיגיטלית', 'הגשת טפסים', 'מילוי טפסים', 'מילוי באתר',
          'הגשת בקשה', 'הגשת מסמכים', 'הגשה', 'טפסים',
        ] },
      { key: 'release_workshop', label: 'סדנאות שחרור / קהילה',          keywords: [
          'סדנת שחרור', 'סדנאות שחרור', 'קהילה', 'יום עיבוד',
          'שחרור', 'קליטה בשחרור', 'אחרי השחרור',
        ] },
    ],
  },
];

/** Flat lookup helper — `(blob) => [{categoryKey, subKey, label}]` */
export function classifyBlob(blob: string): Array<{ categoryKey: string; subKey: string; categoryLabel: string; subLabel: string }> {
  const matches: Array<{ categoryKey: string; subKey: string; categoryLabel: string; subLabel: string }> = [];
  if (!blob) return matches;
  const lower = blob.toLowerCase();
  for (const cat of CATEGORIES) {
    for (const sub of cat.subcategories) {
      for (const kw of sub.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          matches.push({
            categoryKey: cat.key,
            subKey: sub.key,
            categoryLabel: cat.label,
            subLabel: sub.label,
          });
          break; // one match per subcategory is enough — don't double count
        }
      }
    }
  }
  return matches;
}
