// 간단 셀렉터/포맷
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => Number(n || 0).toLocaleString("ko-KR");

// 날짜 유틸
const ymd = (d) => {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

const parseDate = (v) => {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const isSameOrBefore = (a, b) => a.getTime() <= b.getTime();
const isSameOrAfter = (a, b) => a.getTime() >= b.getTime();

// 십원 단위 절삭
const floor10 = (n) => Math.floor(n / 10) * 10;

// JS Date → 한국식 요일 번호(월=1, …, 일=7)
const dayToKoreaNum = (d) => {
  const w = d.getDay(); // 일=0, …, 토=6
  return w === 0 ? 7 : w;
};

// "주" 구분용 키 (해당 날짜가 속한 주의 월요일 날짜 기반)
const weekKeyMonToSun = (d) => {
  const x = new Date(d);
  const dow = x.getDay(); // 일=0, 월=1, …
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(x, diffToMon);

  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `${monday.getFullYear()}-W${mm}${dd}`;
};

const nextWeekKeyOf = (weekKey) => {
  const m = weekKey.match(/(\d{4})-W(\d{2})(\d{2})/);
  if (!m) return "";
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);

  const mon = new Date(y, mm - 1, dd);
  const nextMon = addDays(mon, 7);

  const nmm = String(nextMon.getMonth() + 1).padStart(2, "0");
  const ndd = String(nextMon.getDate()).padStart(2, "0");
  return `${nextMon.getFullYear()}-W${nmm}${ndd}`;
};

const groupBy = (arr, keyFn) => {
  const m = {};
  for (const it of arr) {
    const k = keyFn(it);
    if (!m[k]) m[k] = [];
    m[k].push(it);
  }
  return m;
};

// "HH:MM" → 분 단위 숫자
const parseTimeToMinutes = (s) => {
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// ---------------- 공휴일 관련 ----------------

// 매년 날짜가 고정된 양력 공휴일 (모든 연도 자동 반영)
const FIXED_SOLAR_HOLIDAYS = [
  "01-01", // 신정
  "03-01", // 삼일절
  "05-05", // 어린이날
  "06-06", // 현충일
  "08-15", // 광복절
  "10-03", // 개천절
  "10-09", // 한글날
  "12-25", // 성탄절
];

// 연도별 개별 공휴일/대체공휴일/임시공휴일/음력휴일
// 필요할 때 여기 연도별로 계속 추가하면 됨.
const EXTRA_YEARLY_HOLIDAYS = {
  2025: [
    // 설 연휴 + 임시공휴일
    "2025-01-27",
    "2025-01-28",
    "2025-01-29",
    "2025-01-30",
    // 삼일절 대체공휴일
    "2025-03-03",
    // 어린이날·부처님오신날 대체공휴일
    "2025-05-06",
    // 대통령선거(임시공휴일)
    "2025-06-03",
    // 추석 연휴 + 대체공휴일
    "2025-10-05",
    "2025-10-06",
    "2025-10-07",
    "2025-10-08",
  ],
  // 예: 2026: ["2026-02-xx", ...] 이런 식으로 추가
};

// 기간 내 자동 공휴일 집합 만들기
// 1) FIXED_SOLAR_HOLIDAYS 는 연도 상관없이 전부 자동
// 2) EXTRA_YEARLY_HOLIDAYS 에 적힌 건 해당 연도에 한해 추가
const getAutoHolidays = (start, end) => {
  const set = new Set();
  if (!(start && end)) return set;

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  for (let y = startYear; y <= endYear; y++) {
    // 양력 고정 공휴일
    for (const md of FIXED_SOLAR_HOLIDAYS) {
      const ds = `${y}-${md}`;
      const dt = parseDate(ds);
      if (!dt) continue;
      if (isSameOrAfter(dt, start) && isSameOrBefore(dt, end)) {
        set.add(ds);
      }
    }

    // 연도별 추가 휴일
    const extra = EXTRA_YEARLY_HOLIDAYS[y];
    if (extra && extra.length > 0) {
      for (const ds of extra) {
        const dt = parseDate(ds);
        if (!dt) continue;
        if (isSameOrAfter(dt, start) && isSameOrBefore(dt, end)) {
          set.add(ds);
        }
      }
    }
  }
  return set;
};

// ---------------- 요일 입력 관련 ----------------

const DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_HOUR_IDS = {
  mon: "#monHours",
  tue: "#tueHours",
  wed: "#wedHours",
  thu: "#thuHours",
  fri: "#friHours",
  sat: "#satHours",
  sun: "#sunHours",
};
const DAY_TIME_IDS = {
  mon: { start: "#monStart", end: "#monEnd" },
  tue: { start: "#tueStart", end: "#tueEnd" },
  wed: { start: "#wedStart", end: "#wedEnd" },
  thu: { start: "#thuStart", end: "#thuEnd" },
  fri: { start: "#friStart", end: "#friEnd" },
  sat: { start: "#satStart", end: "#satEnd" },
  sun: { start: "#sunStart", end: "#sunEnd" },
};

// ---------------- 메인 계산 ----------------

const calc = () => {
  const start = parseDate($("#startDate")?.value);
  const end = parseDate($("#endDate")?.value);
  const hourly = Number($("#hourlyWage")?.value) || 0;

  // 휴게시간
  const breakEnabled = $("#breakEnabled")?.checked || false;
  const breakMinutes = Number($("#breakMinutes")?.value) || 0;
  const breakHours = breakEnabled ? Math.max(0, breakMinutes / 60) : 0;

  // 추가 제외일 입력값 파싱
  const excludeRaw = $("#excludeDates")?.value || "";
  const manualExcludeSet = new Set(
    excludeRaw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  );

  // 공휴일 자동 반영 여부
  const autoHolidayEnabled = $("#autoHoliday")?.checked || false;
  const autoHolidaySet = autoHolidayEnabled ? getAutoHolidays(start, end) : new Set();

  // 입력 방식 (시간 / 시각)
  const mode =
    document.querySelector('input[name="timeInputMode"]:checked')?.value ||
    "hours";

  // 요일별 패턴(소정근로시간) 읽기
  const workPlan = {};
  for (const id of DAY_IDS) {
    const checked = $(`#${id}`)?.checked || false;
    let rawHrs = 0;

    if (checked) {
      if (mode === "hours") {
        // 직접 시간 입력 (예: 4.5시간)
        rawHrs = Number($(DAY_HOUR_IDS[id])?.value) || 0;
      } else {
        // 시각 입력 (예: 09:30 ~ 14:00)
        const tIds = DAY_TIME_IDS[id];
        const startStr = $(tIds.start)?.value || "";
        const endStr = $(tIds.end)?.value || "";
        const sMin = parseTimeToMinutes(startStr);
        const eMin = parseTimeToMinutes(endStr);

        if (sMin != null && eMin != null && eMin > sMin) {
          rawHrs = (eMin - sMin) / 60; // 분 → 시간
        } else {
          rawHrs = 0;
        }
      }
    }

    const paidHrs = checked ? Math.max(0, rawHrs - breakHours) : 0; // 휴게 차감 후 유급시간
    workPlan[id] = { checked, rawHrs, paidHrs };
  }

  // 기본 검증
  if (!(start && end && isSameOrBefore(start, end))) {
    showResult({ msg: "기간을 확인해줘" });
    return;
  }
  if (hourly <= 0) {
    showResult({ msg: "시급을 확인해줘" });
    return;
  }
  const anyChecked = DAY_IDS.some(
    (id) => workPlan[id].checked && workPlan[id].rawHrs > 0
  );
  if (!anyChecked) {
    showResult({ msg: "근무 요일과 시간을 입력해줘" });
    return;
  }

  // "주 소정 근무시간"은 패턴 기준(한 주에 월~일 계획만 합산, 제외일과 무관)
  const weeklyRaw = DAY_IDS.reduce(
    (sum, id) => sum + (workPlan[id].checked ? workPlan[id].rawHrs : 0),
    0
  );
  const weeklyPaidPattern = DAY_IDS.reduce(
    (sum, id) => sum + (workPlan[id].checked ? workPlan[id].paidHrs : 0),
    0
  );

  // 기간 내 실제 날짜별 레코드 구성
  const mapIdxToKey = ["", "mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const daysArr = [];
  let excludedCount = 0;

  for (let d = new Date(start); isSameOrBefore(d, end); d = addDays(d, 1)) {
    const dateStr = ymd(d);

    const isManualExcluded = manualExcludeSet.has(dateStr);
    const isAutoHoliday = autoHolidaySet.has(dateStr);
    const isExcluded = isManualExcluded || isAutoHoliday;

    const kn = dayToKoreaNum(d);
    const key = mapIdxToKey[kn];
    const plan = workPlan[key];

    // 원래 패턴상 소정근로일인지
    const isScheduledBase = !!(plan && plan.checked && plan.rawHrs > 0);
    // 제외일(공휴일 포함)은 소정근로일에서 빼준다
    const scheduledWork = isScheduledBase && !isExcluded;

    let paid = 0;
    if (scheduledWork) {
      paid = plan.paidHrs;
    }

    if (isExcluded) {
      excludedCount += 1;
    }

    daysArr.push({
      date: new Date(d),
      ymd: dateStr,
      weekNoKey: weekKeyMonToSun(d),
      isSunday: kn === 7,
      scheduledWork,   // 해당 날짜가 '그 주의 소정 근로일'인지(제외일 반영 후)
      paidHours: paid, // 유급근로시간
    });
  }

  // 실근로일 수
  const workDayCount = daysArr.filter((it) => it.paidHours > 0).length;

  // 기본급 = 유급시간 합계 × 시급
  const baseHours = daysArr.reduce((sum, it) => sum + it.paidHours, 0);
  const basePay = floor10(baseHours * hourly);

  // 주휴수당 계산 (3요건 자동 적용)
  const weeks = groupBy(daysArr, (it) => it.weekNoKey);
  let jhuRawSum = 0;
  let jhuDaysCount = 0;

  for (const wkKey of Object.keys(weeks)) {
    const wk = weeks[wkKey];

    const weeklyHours = wk.reduce((sum, it) => sum + it.paidHours, 0);
    const weeklyScheduledDays = wk.filter((it) => it.scheduledWork).length;
    const weeklyActualWorkDays = wk.filter((it) => it.paidHours > 0).length;

    // 요건 1: 주당 근무시간 15시간 이상 (실제 유급시간 기준)
    const cond1 = weeklyHours >= 15;

    // 요건 2: 해당 주간 소정 근로일 모두 근무
    const cond2 =
      weeklyScheduledDays > 0 &&
      weeklyScheduledDays === weeklyActualWorkDays;

    // 요건 3: 다음 주에 근무 예정(소정근로일 존재)
    const nextKey = nextWeekKeyOf(wkKey);
    const nextWeek = weeks[nextKey];
    const hasNextScheduled =
      !!nextWeek && nextWeek.some((it) => it.scheduledWork);
    const cond3 = hasNextScheduled;

    // 해당 주에 '일요일'이 달력상 존재하는지 (계약 기간 안에서)
    const sundayInside = wk.some(
      (it) =>
        it.isSunday &&
        isSameOrAfter(it.date, start) &&
        isSameOrBefore(it.date, end)
    );

    if (cond1 && cond2 && cond3 && sundayInside) {
      // 1일 평균 유급시간 × 시급 = 주휴 1일분
      const avgDailyPaidHrs =
        weeklyActualWorkDays > 0
          ? weeklyHours / weeklyActualWorkDays
          : 0;
      jhuRawSum += avgDailyPaidHrs * hourly;
      jhuDaysCount += 1;
    }
  }

  const jhuPay = floor10(jhuRawSum);

  // 총액
  const total = basePay + jhuPay;

  // 예산(기본급 / 주휴수당 분리)
  const budgetBase = Number($("#budgetBase")?.value) || 0;
  const budgetJhu = Number($("#budgetJhu")?.value) || 0;

  const remainBase = budgetBase - basePay;
  const remainJhu = budgetJhu - jhuPay;

  showResult({
    basePay,
    jhuPay,
    total,
    workDays: workDayCount,
    jhuDays: jhuDaysCount,
    weeklyRaw,
    weeklyPaid: weeklyPaidPattern,
    excludedDays: excludedCount,
    remainBase,
    remainJhu,
    msg: "",
  });
};

// ---------------- 결과 표시 ----------------

const showResult = (o) => {
  const {
    basePay = 0,
    jhuPay = 0,
    total = 0,
    workDays = 0,
    jhuDays = 0,
    weeklyRaw = 0,
    weeklyPaid = 0,
    excludedDays = 0,
    remainBase = 0,
    remainJhu = 0,
    msg = "",
  } = o || {};

  const paidDays = workDays + jhuDays;

  const lineEl = $("#outDaysLine");
  if (lineEl) {
    const parts = [];
    parts.push(`실근로일 ${workDays}일`);
    parts.push(`유급주휴일 ${jhuDays}일`);
    if (excludedDays > 0) parts.push(`제외일(공휴일 포함) ${excludedDays}일`);
    lineEl.textContent = parts.join(" · ") + ` → 총 ${paidDays}일 유급`;
  }

  const set = (sel, val) => {
    const el = $(sel);
    if (el) el.textContent = fmt(val);
  };

  set("#outWeeklyRaw", weeklyRaw);
  set("#outWeeklyPaid", weeklyPaid);
  set("#outBase", basePay);
  set("#outJhu", jhuPay);
  set("#outTotal", total);
  set("#outRemainBase", remainBase);
  set("#outRemainJhu", remainJhu);

  const msgEl = $("#outMsg");
  if (msgEl) msgEl.textContent = msg || "";

  // 잔액 마이너스 색상 처리
  const rb = $("#outRemainBase");
  if (rb) {
    rb.style.color = remainBase < 0 ? "red" : "#111";
    rb.style.fontWeight = remainBase < 0 ? "700" : "500";
  }
  const rj = $("#outRemainJhu");
  if (rj) {
    rj.style.color = remainJhu < 0 ? "red" : "#111";
    rj.style.fontWeight = remainJhu < 0 ? "700" : "500";
  }
};

// ---------------- DOM 로드 후 바인딩 ----------------

document.addEventListener("DOMContentLoaded", () => {
  // 기본 모드: 시간
  document.body.classList.add("mode-hours");

  // 모드 토글(시간 / 시각)
  const modeRadios = document.querySelectorAll('input[name="timeInputMode"]');
  modeRadios.forEach((r) => {
    r.addEventListener("change", () => {
      const v =
        document.querySelector('input[name="timeInputMode"]:checked')?.value ||
        "hours";
      document.body.classList.toggle("mode-hours", v === "hours");
      document.body.classList.toggle("mode-range", v === "range");
    });
  });

  const btn = $("#btnCalc");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      calc();
    });
  }

  // 요일 체크 해제 시 시간 0으로 세팅(시간 모드 기준)
  const pairs = [
    ["mon", "#monHours"],
    ["tue", "#tueHours"],
    ["wed", "#wedHours"],
    ["thu", "#thuHours"],
    ["fri", "#friHours"],
    ["sat", "#satHours"],
    ["sun", "#sunHours"],
  ];

  for (const [id, sel] of pairs) {
    const box = $(`#${id}`);
    const inp = $(sel);
    if (box && inp) {
      box.addEventListener("change", () => {
        if (!box.checked) {
          inp.value = 0;
        }
      });
    }
  }
});
