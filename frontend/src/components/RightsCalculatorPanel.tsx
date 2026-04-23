import React, { useState, useMemo } from 'react';

interface SoldierInput {
  first_name: string;
  last_name: string;
  personal_number: string;
  reserve_days_2025: string;
  reserve_days_2026: string;
  children_count: string;
  children_ages: string;
  marital_status: string;
  student_indicator: string;
  command_role: string;
  employment_status?: string;
  spouse?: string;
}

interface Props {
  soldier: SoldierInput;
}

type ActivityLevel = 'א+' | 'א' | 'ב' | 'ג' | 'ד' | 'ה';

// ========== EXACT OFFICIAL RATES FROM miluim.idf.il ==========

// תגמול מיוחד — daily from day 61 onward
const SPECIAL_COMP_RATE: Record<ActivityLevel, number> = {
  'א+': 133, 'א': 113, 'ב': 86, 'ג': 60, 'ד': 40, 'ה': 30,
};

// הוצאות אישיות מוגדל — daily from day 41 onward
const PERSONAL_EXPENSE_RATE: Record<ActivityLevel, number> = {
  'א+': 46, 'א': 38, 'ב': 30, 'ג': 23, 'ד': 15, 'ה': 8,
};

// מענק משפחה מוגדל — daily from day 41 onward, parents with children only
const FAMILY_GRANT_RATE: Record<ActivityLevel, number> = {
  'א+': 83, 'א': 69, 'ב': 55, 'ג': 41, 'ד': 28, 'ה': 14,
};

// מענק קלנדרי — daily
const CALENDAR_GRANT_RATE: Record<ActivityLevel, number> = {
  'א+': 58, 'א': 48, 'ב': 38, 'ג': 29, 'ד': 19, 'ה': 10,
};

// כלכלת הבית — one-time at 20 days
const HOUSEHOLD_GRANT = 1250;
// כלכלת הבית מוגדל — additional one-time at 45 days
const HOUSEHOLD_EXTRA_GRANT = 1250;

// מענק קייטנות — for parents with children under 14, per child
const CAMP_GRANT_PER_CHILD = 1500;

// מענק בייביסיטר — for parents with children, 20+ days
const BABYSITTER_GRANT = 1500;

// תוספת שאגת הארי — combat bonus, levels א+ to ב only
const SHAAGAT_DAILY = 25;

// מענק חד"פ לבן/בת זוג עצמאי — for self-employed soldiers with spouse, based on days through 2025
const SPOUSE_SELF_EMPLOYED_GRANT_120 = 4800;
const SPOUSE_SELF_EMPLOYED_GRANT_240 = 6500;

// ========== קרן הסיוע — Aid Fund ==========

// בעלי מקצוע — 10+ days, annual cap 8,000
const PROFESSIONALS_GRANT: Record<ActivityLevel, number> = {
  'א+': 2000, 'א': 2000, 'ב': 1500, 'ג': 1000, 'ד': 1000, 'ה': 1000,
};
const PROFESSIONALS_ANNUAL_CAP = 8000;

// אובדן הכנסה — 10+ days/month, non-monetary percentage
const INCOME_LOSS_PCT: Record<ActivityLevel, number> = {
  'א+': 100, 'א': 100, 'ב': 75, 'ג': 50, 'ד': 50, 'ה': 50,
};

// מרכז חיובים - ביטול חופשה — up to 50,000₪ + טל"א offset, א+/א only, 10+ days
const VACATION_CANCEL_CEILING: Record<ActivityLevel, number> = {
  'א+': 50000, 'א': 50000, 'ב': 0, 'ג': 0, 'ד': 0, 'ה': 0,
};

// פיצוי — 5,000 flat, 10+ days
const COMPENSATION_GRANT = 5000;

// נזק ציוד — 10+ days, level-dependent
const EQUIPMENT_DAMAGE: Record<ActivityLevel, number> = {
  'א+': 3000, 'א': 3000, 'ב': 2000, 'ג': 2000, 'ד': 2000, 'ה': 2000,
};

// פנסיון כלבים — 1,000 flat, 10+ days
const DOG_BOARDING_GRANT = 1000;

// רכב — 2,000 (annual cap 6,000), א+/א only, 10+ days
const VEHICLE_GRANT: Record<ActivityLevel, number> = {
  'א+': 2000, 'א': 2000, 'ב': 0, 'ג': 0, 'ד': 0, 'ה': 0,
};
const VEHICLE_ANNUAL_CAP = 6000;

// מעבר דירה — 2,500, א+/א/ב only, 60+ days
const MOVING_GRANT: Record<ActivityLevel, number> = {
  'א+': 2500, 'א': 2500, 'ב': 2500, 'ג': 0, 'ד': 0, 'ה': 0,
};

// מענק חופשת לידה — 10,700 flat, 45+ days (לכל המדרגים)
const MATERNITY_EXT_GRANT = 10700;

// אובדן הכנסה בן/ת זוג — 10+ days/month, up to 10,000₪/month (informational)
const SPOUSE_INCOME_LOSS_PCT: Record<ActivityLevel, number> = {
  'א+': 100, 'א': 90, 'ב': 75, 'ג': 50, 'ד': 50, 'ה': 50,
};
const SPOUSE_INCOME_MONTHLY_CAP = 10000;

// פיצוי לעצמאים — days of payment after שמ"פ end, by level (informational)
const SELF_EMPLOYED_COMP_DAYS: Record<ActivityLevel, number> = {
  'א+': 90, 'א': 70, 'ב': 50, 'ג': 30, 'ד': 30, 'ה': 30,
};

// סיוע רגשי זוגי 2540 — 60 days צו 8 + 30 days in 2025 (מערך הלוחם = א+/א)
const COUPLES_2540_COMBAT = 2500;
const COUPLES_2540_OTHER = 1000;

// סיוע רגשי זוגי החלטת ממשלה 1126 — 30 cumulative days
const COUPLES_1126_PERSONAL = 1500;
const COUPLES_1126_COUPLE = 1500;

// סיוע נפשי החלטת ממשלה 2540 — 120 days צו 8, מערך לוחם (א+/א) only
const MENTAL_2540_WITH_CHILD = 5280;   // 22 sessions
const MENTAL_2540_NO_CHILD = 3600;     // 15 sessions

// סיוע רגשי החלטה 3812 — 50+ days from 1/1/2026, by level + child count
// amounts = max ₪ ceiling (80% of cost up to 240₪/session)
const MENTAL_3812: Record<ActivityLevel, { kids4: number; kids3: number; noKids: number }> = {
  'א+': { kids4: 6000, kids3: 5280, noKids: 3600 },
  'א':  { kids4: 4080, kids3: 3360, noKids: 2400 },
  'ב':  { kids4: 5040, kids3: 4320, noKids: 3120 },
  'ג':  { kids4: 0, kids3: 0, noKids: 0 },
  'ד':  { kids4: 0, kids3: 0, noKids: 0 },
  'ה':  { kids4: 0, kids3: 0, noKids: 0 },
};

// מענק מפקדים — by command role, 45+ days
const COMMANDER_GRANT: Record<string, number> = {
  'מג"ד': 20000,
  'סמג"ד': 10000,
  'מ"פ': 10000,
  'סמ"פ': 5000,
  'מ"מ': 5000,
};

// סיוע סטודנטים — tuition assistance % by level, 50+ days
const STUDENT_TUITION_PCT: Record<ActivityLevel, number> = {
  'א+': 100, 'א': 85, 'ב': 65, 'ג': 30, 'ד': 30, 'ה': 22,
};

// שובר נופש — one-time at 45 days, amount by level
const VACATION_VOUCHER: Record<ActivityLevel, number> = {
  'א+': 3000, 'א': 2500, 'ב': 2000, 'ג': 1500, 'ד': 1000, 'ה': 500,
};

// ארנק דיגיטלי (פייטר) — tiered max by level
const DIGITAL_WALLET_MAX: Record<ActivityLevel, number> = {
  'א+': 5000, 'א': 4250, 'ב': 3250, 'ג': 2500, 'ד': 1750, 'ה': 1000,
};

const LEVELS: ActivityLevel[] = ['א+', 'א', 'ב', 'ג', 'ד', 'ה'];

interface BenefitResult {
  name: string;
  amount: number;
  detail: string;
  eligible: boolean;
  isNonMonetary?: boolean;
}

function fmt(n: number): string {
  return n.toLocaleString('he-IL');
}

const Bar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{
        width: `${Math.min(pct, 100)}%`,
        background: pct > 0 ? 'linear-gradient(to left, #818cf8, #5E6AD2)' : 'transparent',
      }}
    />
  </div>
);

const RightsCalculatorPanel: React.FC<Props> = ({ soldier }) => {
  const [level, setLevel] = useState<ActivityLevel>('א+');

  const days2025 = parseInt(soldier.reserve_days_2025) || 0;
  const days2026 = parseInt(soldier.reserve_days_2026) || 0;
  const totalDays = days2025 + days2026;
  const childrenNum = parseInt(soldier.children_count) || 0;
  const hasChildren = childrenNum > 0;
  const isStudent = soldier.student_indicator === 'כן';
  const commandRole = (soldier.command_role || '').trim();
  const isCommander = commandRole && commandRole !== 'ללא' && commandRole in COMMANDER_GRANT;
  const isSelfEmployed = /עצמאי/.test(soldier.employment_status || '');
  const hasSpouse = !!(soldier.spouse || '').trim();

  // Parse children ages to count kids under 14 (for camp grant)
  const childrenUnder14 = useMemo(() => {
    if (!soldier.children_ages || !hasChildren) return childrenNum; // default to all children
    const ages = soldier.children_ages.split(/[,،;/\s]+/).map(a => parseInt(a.trim())).filter(a => !isNaN(a));
    if (ages.length === 0) return childrenNum;
    return ages.filter(a => a < 14).length;
  }, [soldier.children_ages, childrenNum, hasChildren]);

  const benefits = useMemo<BenefitResult[]>(() => {
    const r: BenefitResult[] = [];

    // 1. תגמול מיוחד — daily from day 61 onward
    const specialDays = Math.max(totalDays - 60, 0);
    const specialAmount = specialDays * SPECIAL_COMP_RATE[level];
    r.push({
      name: 'תגמול מיוחד',
      amount: specialAmount,
      detail: totalDays > 60
        ? `${specialDays} ימים (מיום 61) x ${SPECIAL_COMP_RATE[level]}₪`
        : `${totalDays}/61 ימים — סף מיום 61`,
      eligible: totalDays > 60,
    });

    // 2. הוצאות אישיות מוגדל — daily from day 41 onward (2026 days only)
    const personalDays = Math.max(days2026 - 40, 0);
    const personalAmount = personalDays * PERSONAL_EXPENSE_RATE[level];
    r.push({
      name: 'הוצאות אישיות מוגדל',
      amount: personalAmount,
      detail: days2026 > 40
        ? `${personalDays} ימים (מיום 41) x ${PERSONAL_EXPENSE_RATE[level]}₪`
        : `${days2026}/41 ימים — סף מיום 41`,
      eligible: days2026 > 40,
    });

    // 3. מענק משפחה מוגדל — daily from day 41, parents only
    const familyDays = Math.max(days2026 - 40, 0);
    const familyAmount = hasChildren ? familyDays * FAMILY_GRANT_RATE[level] : 0;
    r.push({
      name: 'מענק משפחה מוגדל',
      amount: familyAmount,
      detail: !hasChildren
        ? 'ללא ילדים'
        : days2026 > 40
          ? `${familyDays} ימים (מיום 41) x ${FAMILY_GRANT_RATE[level]}₪`
          : `${days2026}/41 ימים — סף מיום 41`,
      eligible: hasChildren && days2026 > 40,
    });

    // 4. מענק קלנדרי — daily (2026)
    const calendarAmount = days2026 * CALENDAR_GRANT_RATE[level];
    r.push({
      name: 'מענק קלנדרי',
      amount: calendarAmount,
      detail: `${days2026} ימים x ${CALENDAR_GRANT_RATE[level]}₪`,
      eligible: days2026 > 0,
    });

    // 5. כלכלת הבית — 20+ days in 2026
    r.push({
      name: 'כלכלת הבית',
      amount: days2026 >= 20 ? HOUSEHOLD_GRANT : 0,
      detail: days2026 >= 20 ? `סף 20 ימים — ${fmt(HOUSEHOLD_GRANT)}₪` : `${days2026}/20 ימים`,
      eligible: days2026 >= 20,
    });

    // 6. כלכלת הבית מוגדל — 45+ days in 2026
    r.push({
      name: 'כלכלת הבית מוגדל',
      amount: days2026 >= 45 ? HOUSEHOLD_EXTRA_GRANT : 0,
      detail: days2026 >= 45 ? `סף 45 ימים — ${fmt(HOUSEHOLD_EXTRA_GRANT)}₪` : `${days2026}/45 ימים`,
      eligible: days2026 >= 45,
    });

    // 7. מענק קייטנות — parents with children under 14
    const campAmount = hasChildren && days2026 > 0 ? childrenUnder14 * CAMP_GRANT_PER_CHILD : 0;
    r.push({
      name: 'מענק קייטנות',
      amount: campAmount,
      detail: !hasChildren
        ? 'ללא ילדים'
        : `${childrenUnder14} ילדים מתחת ל-14 x ${fmt(CAMP_GRANT_PER_CHILD)}₪`,
      eligible: hasChildren && days2026 > 0 && childrenUnder14 > 0,
    });

    // 8. מענק בייביסיטר — parents, 20+ days in 2026
    r.push({
      name: 'מענק בייביסיטר',
      amount: hasChildren && days2026 >= 20 ? BABYSITTER_GRANT : 0,
      detail: !hasChildren
        ? 'ללא ילדים'
        : days2026 >= 20
          ? `סף 20 ימים, להורים — ${fmt(BABYSITTER_GRANT)}₪`
          : `${days2026}/20 ימים`,
      eligible: hasChildren && days2026 >= 20,
    });

    // 9. תוספת שאגת הארי — combat bonus, levels א+ to ב only
    const shaagatEligible = ['א+', 'א', 'ב'].includes(level);
    const shaagat = shaagatEligible ? days2026 * SHAAGAT_DAILY : 0;
    r.push({
      name: 'תוספת שאגת הארי',
      amount: shaagat,
      detail: shaagatEligible
        ? `${days2026} ימים x ${SHAAGAT_DAILY}₪ (מדרג ${level})`
        : `מדרג ${level} — לא זכאי (א+ עד ב)`,
      eligible: shaagatEligible && days2026 > 0,
    });

    // 10. ארנק דיגיטלי (פייטר) — tiered by level
    const walletAmount = days2026 > 0 ? DIGITAL_WALLET_MAX[level] : 0;
    r.push({
      name: 'ארנק דיגיטלי',
      amount: walletAmount,
      detail: days2026 > 0
        ? `תקרה ${fmt(DIGITAL_WALLET_MAX[level])}₪ (מדרג ${level})`
        : 'נדרשים ימי שירות',
      eligible: days2026 > 0,
    });

    // 11. שובר נופש — 45+ days
    const vacAmount = days2026 >= 45 ? VACATION_VOUCHER[level] : 0;
    r.push({
      name: 'שובר נופש',
      amount: vacAmount,
      detail: days2026 >= 45
        ? `סף 45 ימים — ${fmt(VACATION_VOUCHER[level])}₪`
        : `${days2026}/45 ימים`,
      eligible: days2026 >= 45,
    });

    // 12. מענק מפקדים — by command role, 45+ days
    const cmdAmount = isCommander && days2026 >= 45 ? (COMMANDER_GRANT[commandRole] || 0) : 0;
    r.push({
      name: 'מענק מפקדים',
      amount: cmdAmount,
      detail: !isCommander
        ? 'ללא תפקיד פיקודי'
        : days2026 >= 45
          ? `${commandRole} — ${fmt(COMMANDER_GRANT[commandRole] || 0)}₪`
          : `${days2026}/45 ימים`,
      eligible: isCommander && days2026 >= 45,
    });

    // 13. סיוע סטודנטים — 50+ days, students only
    if (isStudent) {
      const tuitionPct = STUDENT_TUITION_PCT[level];
      r.push({
        name: 'סיוע סטודנטים',
        amount: 0,
        detail: totalDays >= 50
          ? `${tuitionPct}% הנחה בשכ"ל (מדרג ${level})`
          : `${totalDays}/50 ימים`,
        eligible: totalDays >= 50,
        isNonMonetary: true,
      });
    }

    // 15. תוכנית עמית — 50+ days, non-monetary
    r.push({
      name: 'תוכנית עמית',
      amount: 0,
      detail: totalDays >= 50
        ? '12 מפגשי טיפול + סדנאות (ללא עלות)'
        : `${totalDays}/50 ימים`,
      eligible: totalDays >= 50,
      isNonMonetary: true,
    });

    // 16. מענק חד"פ לבן/בת זוג עצמאי — self-employed soldier with spouse, 120+ days through 2025
    {
      const spouseGrantEligible = isSelfEmployed && hasSpouse && days2025 >= 120;
      const spouseGrantAmount = days2025 >= 240
        ? SPOUSE_SELF_EMPLOYED_GRANT_240
        : days2025 >= 120
          ? SPOUSE_SELF_EMPLOYED_GRANT_120
          : 0;
      const detail = !isSelfEmployed
        ? 'לעצמאים בלבד'
        : !hasSpouse
          ? 'לא הוזן בן/בת זוג'
          : days2025 >= 240
            ? `240+ ימים עד 31/12/2025 — ${fmt(SPOUSE_SELF_EMPLOYED_GRANT_240)}₪`
            : days2025 >= 120
              ? `120+ ימים עד 31/12/2025 — ${fmt(SPOUSE_SELF_EMPLOYED_GRANT_120)}₪`
              : `${days2025}/120 ימים (עד 31/12/2025)`;
      r.push({
        name: 'מענק חד"פ לבן/בת זוג עצמאי',
        amount: spouseGrantAmount,
        detail,
        eligible: spouseGrantEligible,
      });
    }

    // ========== קרן הסיוע (Aid Fund) ==========

    // 17. בעלי מקצוע — 10+ days (2026), annual cap 8,000
    {
      const amount = days2026 >= 10 ? Math.min(PROFESSIONALS_GRANT[level], PROFESSIONALS_ANNUAL_CAP) : 0;
      r.push({
        name: 'בעלי מקצוע (קרן הסיוע)',
        amount,
        detail: days2026 >= 10
          ? `${fmt(PROFESSIONALS_GRANT[level])}₪ (תקרה שנתית ${fmt(PROFESSIONALS_ANNUAL_CAP)}₪)`
          : `${days2026}/10 ימים`,
        eligible: days2026 >= 10,
      });
    }

    // 18. אובדן הכנסה — 10+ days/month, non-monetary percentage
    {
      const pct = INCOME_LOSS_PCT[level];
      r.push({
        name: 'אובדן הכנסה',
        amount: 0,
        detail: days2026 >= 10
          ? `${pct}% מהכנסה אבודה (מדרג ${level}, כל 10 ימים בחודש)`
          : `${days2026}/10 ימים`,
        eligible: days2026 >= 10,
        isNonMonetary: true,
      });
    }

    // 19. מרכז חיובים - ביטול חופשה — א+/א, 10+ days, up to 50,000₪
    {
      const ceiling = VACATION_CANCEL_CEILING[level];
      const eligible = ceiling > 0 && days2026 >= 10;
      r.push({
        name: 'ביטול חופשה',
        amount: 0,
        detail: ceiling === 0
          ? `מדרג ${level} — לא זכאי (א+/א בלבד)`
          : days2026 >= 10
            ? `עד ${fmt(ceiling)}₪ + קיזוז בטל"א`
            : `${days2026}/10 ימים`,
        eligible,
        isNonMonetary: true,
      });
    }

    // 20. פיצוי — 10+ days, flat 5,000₪
    r.push({
      name: 'פיצוי (קרן הסיוע)',
      amount: days2026 >= 10 ? COMPENSATION_GRANT : 0,
      detail: days2026 >= 10 ? `סף 10 ימים — ${fmt(COMPENSATION_GRANT)}₪` : `${days2026}/10 ימים`,
      eligible: days2026 >= 10,
    });

    // 21. נזק ציוד — 10+ days, level-dependent
    {
      const amount = days2026 >= 10 ? EQUIPMENT_DAMAGE[level] : 0;
      r.push({
        name: 'נזק ציוד',
        amount,
        detail: days2026 >= 10
          ? `${fmt(EQUIPMENT_DAMAGE[level])}₪ (מדרג ${level})`
          : `${days2026}/10 ימים`,
        eligible: days2026 >= 10,
      });
    }

    // 22. פנסיון כלבים — 10+ days, flat 1,000₪
    r.push({
      name: 'פנסיון כלבים',
      amount: days2026 >= 10 ? DOG_BOARDING_GRANT : 0,
      detail: days2026 >= 10 ? `סף 10 ימים — ${fmt(DOG_BOARDING_GRANT)}₪` : `${days2026}/10 ימים`,
      eligible: days2026 >= 10,
    });

    // 23. רכב — 10+ days, א+/א only, 2,000₪ (annual cap 6,000)
    {
      const amount = days2026 >= 10 ? Math.min(VEHICLE_GRANT[level], VEHICLE_ANNUAL_CAP) : 0;
      const eligible = VEHICLE_GRANT[level] > 0 && days2026 >= 10;
      r.push({
        name: 'רכב',
        amount,
        detail: VEHICLE_GRANT[level] === 0
          ? `מדרג ${level} — לא זכאי (א+/א בלבד)`
          : days2026 >= 10
            ? `${fmt(VEHICLE_GRANT[level])}₪ (תקרה שנתית ${fmt(VEHICLE_ANNUAL_CAP)}₪)`
            : `${days2026}/10 ימים`,
        eligible,
      });
    }

    // 24. מעבר דירה — 60+ days, א+/א/ב only, 2,500₪
    {
      const amount = days2026 >= 60 ? MOVING_GRANT[level] : 0;
      const eligible = MOVING_GRANT[level] > 0 && days2026 >= 60;
      r.push({
        name: 'מעבר דירה',
        amount,
        detail: MOVING_GRANT[level] === 0
          ? `מדרג ${level} — לא זכאי (א+/א/ב בלבד)`
          : days2026 >= 60
            ? `סף 60 ימים — ${fmt(MOVING_GRANT[level])}₪`
            : `${days2026}/60 ימים`,
        eligible,
      });
    }

    // 25. מענק חופשת לידה (הארכת חל"ד) — 45+ days, flat 10,700₪
    r.push({
      name: 'מענק חופשת לידה',
      amount: days2026 >= 45 ? MATERNITY_EXT_GRANT : 0,
      detail: days2026 >= 45 ? `סף 45 ימים — ${fmt(MATERNITY_EXT_GRANT)}₪` : `${days2026}/45 ימים`,
      eligible: days2026 >= 45,
    });

    // 26. אובדן הכנסה בן/ת זוג — informational, 10+ days/month
    {
      const pct = SPOUSE_INCOME_LOSS_PCT[level];
      r.push({
        name: 'אובדן הכנסה בן/ת זוג',
        amount: 0,
        detail: !hasSpouse
          ? 'לא הוזן בן/בת זוג'
          : days2026 >= 10
            ? `${pct}% מהכנסה אבודה • תקרה ${fmt(SPOUSE_INCOME_MONTHLY_CAP)}₪/חודש`
            : `${days2026}/10 ימים`,
        eligible: hasSpouse && days2026 >= 10,
        isNonMonetary: true,
      });
    }

    // 27. פיצוי לעצמאים — informational, days after שמ"פ
    {
      const days = SELF_EMPLOYED_COMP_DAYS[level];
      r.push({
        name: 'פיצוי לעצמאים',
        amount: 0,
        detail: !isSelfEmployed
          ? 'לעצמאים בלבד'
          : `תשלום עד ${days} ימים מסיום שמ"פ (מדרג ${level})`,
        eligible: isSelfEmployed,
        isNonMonetary: true,
      });
    }

    // 28. תשלום והחזרים למשרתים שמרכז חייהם בחו"ל — א+/א, 14+ days
    {
      const eligible = ['א+', 'א'].includes(level) && days2026 >= 14;
      r.push({
        name: 'מרכז חיים בחו"ל',
        amount: 0,
        detail: !['א+', 'א'].includes(level)
          ? `מדרג ${level} — לא זכאי (א+/א, יחידות לוחם)`
          : days2026 >= 14
            ? 'תשלום והחזרים ליחידות לוחם'
            : `${days2026}/14 ימים`,
        eligible,
        isNonMonetary: true,
      });
    }

    // 29. סיוע רגשי זוגי 2540 — 60d צו 8 + 30d in 2025
    {
      const amount = (totalDays >= 60 && days2025 >= 30)
        ? (['א+', 'א'].includes(level) ? COUPLES_2540_COMBAT : COUPLES_2540_OTHER)
        : 0;
      const eligible = totalDays >= 60 && days2025 >= 30;
      r.push({
        name: 'סיוע רגשי זוגי (2540)',
        amount,
        detail: eligible
          ? `${['א+', 'א'].includes(level) ? 'מערך לוחם' : 'יתר המערכים'} — עד ${fmt(amount)}₪`
          : totalDays < 60
            ? `${totalDays}/60 ימים (צו 8)`
            : `${days2025}/30 ימים ב-2025`,
        eligible,
      });
    }

    // 30. סיוע רגשי החלטה 3812 — 50+ days from 1/1/2026, by level + child count
    {
      const row = MENTAL_3812[level];
      const ceiling = childrenNum >= 4 ? row.kids4 : childrenNum >= 3 ? row.kids3 : row.noKids;
      const eligible = ceiling > 0 && days2026 >= 50;
      const childLabel = childrenNum >= 4 ? '4+ ילדים' : childrenNum >= 3 ? '3 ילדים' : 'ללא/פחות מ-3 ילדים';
      r.push({
        name: 'סיוע רגשי (3812)',
        amount: 0,
        detail: ceiling === 0
          ? `מדרג ${level} — לא זכאי (א+/א/ב בלבד)`
          : days2026 >= 50
            ? `80% עד 240₪/מפגש • תקרה ${fmt(ceiling)}₪ (${childLabel})`
            : `${days2026}/50 ימים`,
        eligible,
        isNonMonetary: true,
      });
    }

    // 31. סיוע רגשי זוגי 1126 — 30 cumulative days
    r.push({
      name: 'סיוע רגשי זוגי (1126)',
      amount: 0,
      detail: totalDays >= 30
        ? `עד ${fmt(COUPLES_1126_PERSONAL)}₪ טיפול אישי + עד ${fmt(COUPLES_1126_COUPLE)}₪ זוגי`
        : `${totalDays}/30 ימים מצטבר`,
      eligible: totalDays >= 30,
      isNonMonetary: true,
    });

    // 32. סיוע נפשי 2540 — 120d צו 8, מערך לוחם (א+/א) only
    {
      const isCombat = ['א+', 'א'].includes(level);
      const ceiling = hasChildren ? MENTAL_2540_WITH_CHILD : MENTAL_2540_NO_CHILD;
      const eligible = isCombat && totalDays >= 120;
      r.push({
        name: 'סיוע נפשי (2540)',
        amount: 0,
        detail: !isCombat
          ? `מדרג ${level} — לא זכאי (מערך לוחם בלבד)`
          : totalDays >= 120
            ? `80% עד 240₪/מפגש • תקרה ${fmt(ceiling)}₪ (${hasChildren ? 'עם ילד' : 'ללא ילד'})`
            : `${totalDays}/120 ימים (צו 8)`,
        eligible,
        isNonMonetary: true,
      });
    }

    return r;
  }, [level, days2025, days2026, totalDays, hasChildren, childrenNum, childrenUnder14, isStudent, commandRole, isCommander, isSelfEmployed, hasSpouse]);

  const totalAmount = benefits.reduce((s, b) => s + b.amount, 0);
  const eligibleCount = benefits.filter((b) => b.eligible).length;
  const overallPct = benefits.length > 0 ? Math.round((eligibleCount / benefits.length) * 100) : 0;

  // Max possible amount (rough estimate for bar proportion)
  const maxBenefit = Math.max(...benefits.map((b) => b.amount), 1);

  return (
    <div className="space-y-3" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(94,106,210,0.15)', border: '1px solid rgba(94,106,210,0.3)' }}
        >
          <svg className="w-3 h-3" fill="none" stroke="#818cf8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-base font-bold" style={{ color: '#EDEDEF' }}>מיצוי זכויות</span>
      </div>

      {/* Overall progress */}
      <div
        className="rounded-lg p-3 space-y-1.5"
        style={{ background: 'rgba(94,106,210,0.08)', border: '1px solid rgba(94,106,210,0.2)' }}
      >
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: '#8A8F98' }}>זכאות כוללת</span>
          <span className="text-sm font-bold" style={{ color: '#818cf8' }}>{eligibleCount}/{benefits.length}</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background: 'linear-gradient(to left, #818cf8, #5E6AD2)',
              boxShadow: '0 0 6px rgba(94,106,210,0.5)',
            }}
          />
        </div>
        <div className="flex justify-between items-end">
          <span
            className="text-lg font-bold tabular-nums"
            style={{
              background: 'linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.7))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {fmt(totalAmount)} ₪
          </span>
          <span className="text-xs" style={{ color: '#8A8F98' }}>סה"כ משוער</span>
        </div>
      </div>

      {/* Activity level selector */}
      <div className="space-y-1">
        <label className="text-xs font-semibold" style={{ color: '#8A8F98' }}>מדרג פעילות</label>
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className="flex-1 py-1.5 rounded text-sm font-bold transition-all"
              style={
                level === l
                  ? { background: '#5E6AD2', color: '#fff', boxShadow: '0 2px 8px rgba(94,106,210,0.4)' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#8A8F98' }
              }
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Days summary */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="rounded px-2 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8A8F98' }}>2025: </span>
          <span className="font-bold" style={{ color: '#EDEDEF' }}>{days2025 || '—'} ימים</span>
        </div>
        <div className="rounded px-2 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8A8F98' }}>2026: </span>
          <span className="font-bold" style={{ color: '#EDEDEF' }}>{days2026 || '—'} ימים</span>
        </div>
      </div>

      {/* Soldier info summary */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="rounded px-2 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8A8F98' }}>ילדים: </span>
          <span className="font-bold" style={{ color: '#EDEDEF' }}>{hasChildren ? childrenNum : 'ללא'}</span>
        </div>
        <div className="rounded px-2 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8A8F98' }}>תפקיד: </span>
          <span className="font-bold" style={{ color: '#EDEDEF' }}>{isCommander ? commandRole : 'ללא'}</span>
        </div>
      </div>

      {/* Benefits list */}
      <div className="space-y-1.5">
        {benefits.map((b, i) => (
          <div
            key={i}
            className="rounded-lg px-2.5 py-2 space-y-1 transition-all"
            style={{
              background: b.eligible ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              opacity: b.eligible ? 1 : 0.45,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {b.eligible ? (
                  <span className="text-green-400 text-sm">&#x2713;</span>
                ) : (
                  <span className="text-sm" style={{ color: '#8A8F98' }}>&#x2717;</span>
                )}
                <span className="text-sm font-semibold" style={{ color: b.eligible ? '#EDEDEF' : '#8A8F98' }}>
                  {b.name}
                </span>
              </div>
              {b.amount > 0 && (
                <span className="text-base font-bold tabular-nums" style={{ color: '#818cf8' }}>
                  {fmt(b.amount)} ₪
                </span>
              )}
              {b.isNonMonetary && b.eligible && b.amount === 0 && (
                <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                  זכאי
                </span>
              )}
            </div>
            {b.amount > 0 && <Bar pct={(b.amount / maxBenefit) * 100} />}
            <p className="text-xs font-medium" style={{ color: '#a78bfa' }}>{b.detail}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-center leading-tight" style={{ color: 'rgba(255,255,255,0.3)' }}>
        * אומדן בלבד — יש לבדוק מול הגורמים המוסמכים
      </p>
    </div>
  );
};

export default RightsCalculatorPanel;
