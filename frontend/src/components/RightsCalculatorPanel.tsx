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

// סיוע נפשי — 80% of therapy, up to 240₪/session, ceiling by level, 50+ days
const MENTAL_HEALTH_CEILING: Record<ActivityLevel, number> = {
  'א+': 7200, 'א': 6000, 'ב': 4800, 'ג': 0, 'ד': 0, 'ה': 0,
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

    // 13. סיוע נפשי — levels א+/א/ב, 50+ days
    const mentalEligible = ['א+', 'א', 'ב'].includes(level) && totalDays >= 50;
    const mentalCeiling = MENTAL_HEALTH_CEILING[level];
    r.push({
      name: 'סיוע נפשי',
      amount: 0,
      detail: mentalEligible
        ? `80% מעלות טיפול, עד 240₪/מפגש, תקרה ${fmt(mentalCeiling)}₪`
        : totalDays < 50
          ? `${totalDays}/50 ימים`
          : `מדרג ${level} — לא זכאי (א+ עד ב)`,
      eligible: mentalEligible,
      isNonMonetary: true,
    });

    // 14. סיוע סטודנטים — 50+ days, students only
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

    return r;
  }, [level, days2025, days2026, totalDays, hasChildren, childrenNum, childrenUnder14, isStudent, commandRole, isCommander]);

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
        <span className="text-sm font-semibold" style={{ color: '#EDEDEF' }}>מיצוי זכויות</span>
      </div>

      {/* Overall progress */}
      <div
        className="rounded-lg p-3 space-y-1.5"
        style={{ background: 'rgba(94,106,210,0.08)', border: '1px solid rgba(94,106,210,0.2)' }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: '#8A8F98' }}>זכאות כוללת</span>
          <span className="text-xs font-bold" style={{ color: '#818cf8' }}>{eligibleCount}/{benefits.length}</span>
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
          <span className="text-[10px]" style={{ color: '#8A8F98' }}>סה"כ משוער</span>
        </div>
      </div>

      {/* Activity level selector */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium" style={{ color: '#8A8F98' }}>מדרג פעילות</label>
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className="flex-1 py-1 rounded text-[11px] font-semibold transition-all"
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
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="rounded px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8A8F98' }}>2025: </span>
          <span className="font-semibold" style={{ color: '#EDEDEF' }}>{days2025 || '—'} ימים</span>
        </div>
        <div className="rounded px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8A8F98' }}>2026: </span>
          <span className="font-semibold" style={{ color: '#EDEDEF' }}>{days2026 || '—'} ימים</span>
        </div>
      </div>

      {/* Soldier info summary */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="rounded px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8A8F98' }}>ילדים: </span>
          <span className="font-semibold" style={{ color: '#EDEDEF' }}>{hasChildren ? childrenNum : 'ללא'}</span>
        </div>
        <div className="rounded px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8A8F98' }}>תפקיד: </span>
          <span className="font-semibold" style={{ color: '#EDEDEF' }}>{isCommander ? commandRole : 'ללא'}</span>
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
                  <span className="text-green-400 text-[10px]">&#x2713;</span>
                ) : (
                  <span className="text-[10px]" style={{ color: '#8A8F98' }}>&#x2717;</span>
                )}
                <span className="text-[11px] font-medium" style={{ color: b.eligible ? '#EDEDEF' : '#8A8F98' }}>
                  {b.name}
                </span>
              </div>
              {b.amount > 0 && (
                <span className="text-[11px] font-bold tabular-nums" style={{ color: '#818cf8' }}>
                  {fmt(b.amount)} ₪
                </span>
              )}
              {b.isNonMonetary && b.eligible && b.amount === 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                  זכאי
                </span>
              )}
            </div>
            {b.amount > 0 && <Bar pct={(b.amount / maxBenefit) * 100} />}
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{b.detail}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-center leading-tight" style={{ color: 'rgba(255,255,255,0.2)' }}>
        * אומדן בלבד — יש לבדוק מול הגורמים המוסמכים
      </p>
    </div>
  );
};

export default RightsCalculatorPanel;
