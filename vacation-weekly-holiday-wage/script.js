//개발할 땐 재밌고 졸린 것도 참을만 한데 

const jobTypeEl = document.getElementById('jobType');
const startDateEl = document.getElementById('startDate');
const endDateEl = document.getElementById('endDate');

const holidayDaysPerWeekEl = document.getElementById('holidayDaysPerWeek');

const daysContainer = document.getElementById('daysContainer');
const monthConfigContainer = document.getElementById('monthConfigContainer');

// 결과 출력 요소
const workingDaysText = document.getElementById('workingDaysText');
const weeklyHoursText = document.getElementById('weeklyHoursText');
const weeklyHoursHintText = document.getElementById('weeklyHoursHintText');

const restPerDayText = document.getElementById('restPerDayText');
const restTotalText = document.getElementById('restTotalText');
const restRuleText = document.getElementById('restRuleText');

const holidayDaysText = document.getElementById('holidayDaysText');
const holidayCondText = document.getElementById('holidayCondText');
const holidayPerDayText = document.getElementById('holidayPerDayText');
const holidayTotalText = document.getElementById('holidayTotalText');
const holidayHintText = document.getElementById('holidayHintText');

const prorataText = document.getElementById('prorataText');
const prorataHintText = document.getElementById('prorataHintText');

const grandTotalText = document.getElementById('grandTotalText');

// ===== 유틸 함수들 =====

// 숫자 → "12,345원"
function formatKRW(v) {
  if (v === null || v === undefined || isNaN(v)) return '-';
  return v.toLocaleString('ko-KR') + '원';
}

// yyyy-mm-dd → Date
function parseDate(v) {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Date → yyyy-mm-dd
function ymd(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// Date → "YYYY-MM"
function ymKey(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}`;
}

// 날짜 더하기
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// 월요일 기준 주 키
function weekKeyMonToSun(d) {
  const x = new Date(d);
  const dow = x.getDay(); // 0=일,1=월...
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = addDays(x, diffToMon);
  const z = (n) => String(n).padStart(2, '0');
  return `${mon.getFullYear()}-W${z(mon.getMonth() + 1)}${z(mon.getDate())}`;
}

// 주 키 → 다음주 키
function nextWeekKeyOf(weekKey) {
  const m = weekKey.match(/(\d{4})-W(\d{2})(\d{2})/);
  if (!m) return '';
  const y = +m[1];
  const mm = +m[2];
  const dd = +m[3];
  const mon = new Date(y, mm - 1, dd);
  const nextMon = addDays(mon, 7);
  const z = (n) => String(n).padStart(2, '0');
  return `${nextMon.getFullYear()}-W${z(nextMon.getMonth() + 1)}${z(nextMon.getDate())}`;
}

// 배열 그룹핑
function groupBy(arr, keyFn) {
  const m = {};
  for (const it of arr) {
    const k = keyFn(it);
    (m[k] ||= []).push(it);
  }
  return m;
}

function hasAnyPaidWork(arr) {
  return arr.some((it) => it.paidHours > 0);
}

// ===== 날짜별 근무 테이블 생성 =====

function buildDaysTable() {
  daysContainer.innerHTML = '';

  const start = parseDate(startDateEl.value);
  const end = parseDate(endDateEl.value);

  if (!(start && end && end >= start)) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.style.padding = '10px 12px';
    p.textContent = '방학 시작일자와 종료일자 입력하면 날짜 목록 생성됨.';
    daysContainer.appendChild(p);
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  ['날짜', '요일', '근무 여부', '유급 근로시간(시간)'].forEach((txt) => {
    const th = document.createElement('th');
    th.textContent = txt;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const tr = document.createElement('tr');
    tr.className = 'day-row';

    const dateStr = ymd(d);
    tr.dataset.date = dateStr;
    tr.dataset.weekKey = weekKeyMonToSun(d);
    tr.dataset.isSunday = d.getDay() === 0 ? '1' : '0';
    tr.dataset.ymKey = ymKey(d);

    const tdDate = document.createElement('td');
    tdDate.textContent = dateStr;
    tr.appendChild(tdDate);

    const tdWeekday = document.createElement('td');
    tdWeekday.textContent = weekdayNames[d.getDay()] + '요일';
    tr.appendChild(tdWeekday);

    const tdCheck = document.createElement('td');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'day-check';
    tdCheck.appendChild(chk);
    tr.appendChild(tdCheck);

    const tdHours = document.createElement('td');
    const hours = document.createElement('input');
    hours.type = 'number';
    hours.className = 'day-hours';
    hours.step = '0.5';
    hours.min = '0';
    hours.value = '0';
    hours.disabled = true;
    tdHours.appendChild(hours);
    tr.appendChild(tdHours);

    // 자동 계산 제거: 단순 상태만 변경
    chk.addEventListener('change', () => {
      hours.disabled = !chk.checked;
      if (!chk.checked) hours.value = '0';
    });

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  daysContainer.appendChild(table);
}

// ===== 월별 인건비 설정 테이블 생성 =====

function monthKeysBetween(start, end) {
  const keys = [];
  if (!(start && end && end >= start)) return keys;

  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cur <= lastMonth) {
    keys.push(ymKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

function buildMonthConfigTable() {
  monthConfigContainer.innerHTML = '';

  const start = parseDate(startDateEl.value);
  const end = parseDate(endDateEl.value);

  const keys = monthKeysBetween(start, end);
  if (keys.length === 0) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.style.padding = '10px 12px';
    p.textContent = '방학 시작일자와 종료일자를 입력하면 인건비 항목 생성됨.';
    monthConfigContainer.appendChild(p);
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');

  [
    '월(YYYY-MM)',
    '월별 인건비 (청소원 선택시 입력)',
    '월별 유급 근무일수',
    '기본급',
    '직무관련수당·위험수당',
    '정액급식비',
    '근속수당·가산수당',
    '상여·성과급 월 환산액',
    '명절휴가비 등 기타 수당'
  ].forEach((txt) => {
    const th = document.createElement('th');
    th.textContent = txt;
    trHead.appendChild(th);
  });

  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  keys.forEach((k) => {
    const tr = document.createElement('tr');
    tr.className = 'month-row';
    tr.dataset.monthKey = k;

    const tdYm = document.createElement('td');
    tdYm.textContent = k;
    tr.appendChild(tdYm);

    // 청소원용 월 인건비
    const tdMonthlyPay = document.createElement('td');
    const inpMonthlyPay = document.createElement('input');
    inpMonthlyPay.type = 'number';
    inpMonthlyPay.min = '0';
    inpMonthlyPay.step = '10';
    inpMonthlyPay.className = 'month-monthlyPay';
    tdMonthlyPay.appendChild(inpMonthlyPay);
    tr.appendChild(tdMonthlyPay);

    // 월별 유급 근무일수
    const tdDays = document.createElement('td');
    const inpDays = document.createElement('input');
    inpDays.type = 'number';
    inpDays.min = '1';
    inpDays.max = '31';
    inpDays.step = '1';
    inpDays.className = 'month-monthDays';
    tdDays.appendChild(inpDays);
    tr.appendChild(tdDays);

    // 주휴수당 산입 항목들
    const makeCell = (cls) => {
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.step = '10';
      inp.className = cls;
      td.appendChild(inp);
      tr.appendChild(td);
      return inp;
    };

    makeCell('month-basePay');
    makeCell('month-dutyAllow');
    makeCell('month-mealAllow');
    makeCell('month-longAllow');
    makeCell('month-bonusMonthly');
    makeCell('month-holidayBonus');

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  monthConfigContainer.appendChild(table);
}

// 월별 설정값 읽어서 map으로 전송
function getMonthConfigMap() {
  const map = {};
  const rows = monthConfigContainer.querySelectorAll('.month-row');

  rows.forEach((row) => {
    const key = row.dataset.monthKey;

    const monthlyPayEl = row.querySelector('.month-monthlyPay');
    const monthDaysEl = row.querySelector('.month-monthDays');

    const baseEl = row.querySelector('.month-basePay');
    const dutyEl = row.querySelector('.month-dutyAllow');
    const mealEl = row.querySelector('.month-mealAllow');
    const longEl = row.querySelector('.month-longAllow');
    const bonusEl = row.querySelector('.month-bonusMonthly');
    const holidayEl = row.querySelector('.month-holidayBonus');

    const monthlyPay = parseFloat(monthlyPayEl.value) || 0;
    const monthDays = parseFloat(monthDaysEl.value) || 0;

    const basePay = parseFloat(baseEl.value) || 0;
    const dutyAllow = parseFloat(dutyEl.value) || 0;
    const mealAllow = parseFloat(mealEl.value) || 0;
    const longAllow = parseFloat(longEl.value) || 0;
    const bonusMonthly = parseFloat(bonusEl.value) || 0;
    const holidayBonus = parseFloat(holidayEl.value) || 0;

    // 주휴수당 기준이 되는 통상임금 산입 항목 합계
    const holidayBase = basePay + dutyAllow + mealAllow + longAllow + bonusMonthly + holidayBonus;

    map[key] = { monthlyPay, monthDays, holidayBase };
  });

  return map;
}

// ===== 메인 계산 =====

function recalc() {
  const jobType = jobTypeEl.value;
  const holidayDaysPerWeek = parseInt(holidayDaysPerWeekEl.value, 10) || 1;

  const dayRows = daysContainer.querySelectorAll('.day-row');
  const daysArr = [];

  dayRows.forEach((row) => {
    const date = parseDate(row.dataset.date);
    const weekNoKey = row.dataset.weekKey;
    const isSunday = row.dataset.isSunday === '1';
    const ym = row.dataset.ymKey;

    const chk = row.querySelector('.day-check');
    const hoursInput = row.querySelector('.day-hours');

    const paidHours =
      chk && chk.checked ? Math.max(0, parseFloat(hoursInput.value) || 0) : 0;

    daysArr.push({
      date,
      weekNoKey,
      isSunday,
      ymKey: ym,
      paidHours
    });
  });

  const anyPaid = daysArr.some((d) => d.paidHours > 0);
  const monthsConfig = getMonthConfigMap();

  if (!anyPaid) {
    workingDaysText.textContent = '-';
    weeklyHoursText.textContent = '-';
    weeklyHoursHintText.textContent =
      '근무일 및 근로시간을 입력하면 주휴수당 지급 요건 확인함.';

    restPerDayText.textContent = '-';
    restTotalText.textContent = '-';
    restRuleText.textContent =
      '방학중근무수당 규칙: 4시간 이하 1만원, 4시간 초과 2만원.';

    holidayDaysText.textContent = '-';
    holidayCondText.textContent =
      '근무기록 먼저 입력하쇼';
    holidayPerDayText.textContent = '-';
    holidayTotalText.textContent = '-';
    holidayHintText.textContent =
      '위에 입력부터 하쇼';

    prorataText.textContent = '-';
    prorataHintText.textContent =
      '청소원 선택 시 일요일만 유급주휴일임임';

    grandTotalText.textContent = '-';
    return;
  }

  // ----- 1) 기본 통계 -----
  const workingDays = daysArr.filter((d) => d.paidHours > 0).length;
  workingDaysText.textContent = `${workingDays}일`;

  const weeksMap = groupBy(daysArr, (d) => d.weekNoKey);

  let maxWeeklyHours = 0;
  Object.keys(weeksMap).forEach((key) => {
    const wk = weeksMap[key];
    const sumH = wk.reduce((s, d) => s + d.paidHours, 0);
    if (sumH > maxWeeklyHours) maxWeeklyHours = sumH;
  });

  if (maxWeeklyHours > 0) {
    weeklyHoursText.textContent = `${maxWeeklyHours}시간`;
    if (maxWeeklyHours >= 15) {
      weeklyHoursHintText.textContent =
        '주 15시간 이상 근무';
    } else {
      weeklyHoursHintText.textContent =
        '주휴수당 지급요건 미달';
    }
  } else {
    weeklyHoursText.textContent = '-';
    weeklyHoursHintText.textContent =
      '근무일 및 근로시간 입력하면 주당 실근로시간 산출출';
  }

  let restTotal = 0;
  let holidayTotal = 0;
  let prorataTotal = 0;

  // ----- 2) 방학중근무수당 (조리종사원) -----
  if (jobType === 'cook' || jobType === 'cook-helper') {
    let firstRate = null;
    let sameRate = true;

    daysArr.forEach((d) => {
      if (d.paidHours > 0) {
        const rate = d.paidHours <= 4 ? 10000 : 20000;
        restTotal += rate;

        if (firstRate === null) firstRate = rate;
        else if (firstRate !== rate) sameRate = false;
      }
    });

    if (workingDays === 0) {
      restPerDayText.textContent = '-';
      restTotalText.textContent = '-';
      restRuleText.textContent =
        '방학중근무수당은 4시간 이하 1만원, 4시간 초과 2만원.';
    } else {
      if (sameRate && firstRate !== null) {
        restPerDayText.textContent = formatKRW(firstRate);
      } else {
        restPerDayText.textContent = '근무일마다 상이 (합계 기준)';
      }
      restTotalText.textContent = formatKRW(restTotal);
      restRuleText.textContent =
        '조리종사원 기준';
    }
  } else {
    restPerDayText.textContent = '-';
    restTotalText.textContent = '-';
    restRuleText.textContent =
      '특수운영직군 청소원은 방학중근무수당 없음. 그냥 일할계산임';
  }

  // ----- 3) 주휴수당 / 청소원 일할계산 -----

  if (jobType === 'cleaner') {
    // 청소원: 주휴 X, 달별 일할계산
    holidayDaysText.textContent = '해당 없음';
    holidayCondText.textContent =
      '특수운영직군 청소원은 방학중근무수당 없음. 그냥 일할계산임';
    holidayPerDayText.textContent = '-';
    holidayTotalText.textContent = '-';
    holidayHintText.textContent =
      '청소원 주휴수당 미산정';

    const workDaysByMonth = {};
    daysArr.forEach((d) => {
      if (d.paidHours > 0) {
        workDaysByMonth[d.ymKey] = (workDaysByMonth[d.ymKey] || 0) + 1;
      }
    });

    let total = 0;
    Object.keys(workDaysByMonth).forEach((ym) => {
      const cfg = monthsConfig[ym];
      if (!cfg) return;
      const { monthlyPay, monthDays } = cfg;
      const cnt = workDaysByMonth[ym];

      if (monthlyPay > 0 && monthDays > 0 && cnt > 0) {
        const perDay = monthlyPay / monthDays;
        const subTotal = Math.round(perDay * cnt);
        total += subTotal;
      }
    });

    if (total > 0) {
      prorataTotal = total;
      prorataText.textContent = formatKRW(prorataTotal);
      prorataHintText.textContent =
        '금액*(토요일 제외일수/ 월 총 일수)로 계산함';
    } else {
      prorataText.textContent = '-';
      prorataHintText.textContent =
        '금액, 토요일 제외일수 입력하쇼';
    }
  } else {
    // 조리종사원: 주휴수당 계산
    const holidayDates = [];

    Object.keys(weeksMap).forEach((key) => {
      const wk = weeksMap[key];
      const weeklyHours = wk.reduce((s, d) => s + d.paidHours, 0);
      const weeklyWorkDays = wk.filter((d) => d.paidHours > 0).length;

      const nextKey = nextWeekKeyOf(key);
      const hasNext = Object.prototype.hasOwnProperty.call(weeksMap, nextKey)
        ? hasAnyPaidWork(weeksMap[nextKey])
        : false;

      const sunday = wk.find((d) => d.date.getDay() === 0);
      const saturday = wk.find((d) => d.date.getDay() === 6);

      const sundayInside = !!sunday;

      if (weeklyHours >= 15 && weeklyWorkDays > 0 && hasNext && sundayInside) {
        if (holidayDaysPerWeek === 1) {
          if (sunday) holidayDates.push(sunday.date);
        } else {
          if (saturday) holidayDates.push(saturday.date);
          if (sunday) holidayDates.push(sunday.date);
        }
      }
    });

    const holidayDaysByMonth = {};
    holidayDates.forEach((d) => {
      const key = ymKey(d);
      holidayDaysByMonth[key] = (holidayDaysByMonth[key] || 0) + 1;
    });

    const totalHolidayDays = Object.values(holidayDaysByMonth).reduce(
      (s, n) => s + n,
      0
    );

    if (totalHolidayDays > 0) {
      holidayDaysText.textContent = `${totalHolidayDays}일`;
      holidayCondText.textContent =
        '주휴수당 지급요건 충족';
    } else {
      holidayDaysText.textContent = '-';
      holidayCondText.textContent =
        '주휴수당 지급요건 미충족';
    }

    let totalJhu = 0;
    let singlePerDay = null;
    const monthKeys = Object.keys(holidayDaysByMonth);

    monthKeys.forEach((ym) => {
      const cfg = monthsConfig[ym];
      if (!cfg) return;
      const { monthDays, holidayBase } = cfg;
      const cnt = holidayDaysByMonth[ym];

      if (holidayBase > 0 && monthDays > 0 && cnt > 0) {
        const perDay = holidayBase / monthDays;
        const subTotal = Math.round(perDay * cnt);
        totalJhu += subTotal;

        if (monthKeys.length === 1) {
          singlePerDay = perDay;
        }
      }
    });

    if (totalJhu > 0) {
      holidayTotal = totalJhu;
      holidayTotalText.textContent = formatKRW(holidayTotal);

      if (monthKeys.length === 1 && singlePerDay !== null) {
        holidayPerDayText.textContent = formatKRW(Math.round(singlePerDay));
        holidayHintText.textContent =
          '주휴수당 1일치 계산';
      } else {
        holidayPerDayText.textContent = '월별 상이 (합계 기준)';
        holidayHintText.textContent =
          '토요일 제외 일수에 따라 월별로 다를 수 있음';
      }
    } else {
      holidayTotalText.textContent = '-';
      holidayPerDayText.textContent = '-';
      holidayHintText.textContent =
        '주휴수당 계산해드림';
    }

    prorataText.textContent = '-';
    prorataHintText.textContent =
      '조리종사원은 방학중 근무수당 및 주휴수당 둘 다 지급급';
  }

  // ----- 4) 총 인건비 합산 -----
  let grandTotal = 0;
  if (jobType === 'cleaner') {
    grandTotal = prorataTotal;
  } else {
    grandTotal = restTotal + holidayTotal;
  }

  grandTotalText.textContent =
    grandTotal > 0 ? formatKRW(grandTotal) : '-';
}

// 직종에 따라 결과 블록 노출 분리
function updateResultVisibility() {
  const jobType = jobTypeEl.value;
  const isCleaner = jobType === 'cleaner';

  const cookBlock = document.getElementById('cookResultBlock');
  const cleanerBlock = document.getElementById('cleanerResultBlock');

  if (cookBlock) cookBlock.style.display = isCleaner ? 'none' : '';
  if (cleanerBlock) cleanerBlock.style.display = isCleaner ? '' : 'none';
}

// ===== 이벤트 바인딩 =====

// 방학 기간 변경 시: 테이블만 재생성 (계산은 버튼으로)
[startDateEl, endDateEl].forEach((el) => {
  el.addEventListener('change', () => {
    buildDaysTable();
    buildMonthConfigTable();
  });
});

// 직종/주휴일 수 변경 시: 결과 블록 노출만 조정
[jobTypeEl, holidayDaysPerWeekEl].forEach((el) => {
  el.addEventListener('change', () => {
    updateResultVisibility();
  });
});

// 계산하기 버튼 -> 실제 계산 실행
const calcBtn = document.getElementById('calcBtn');
if (calcBtn) {
  calcBtn.addEventListener('click', () => {
    recalc();
  });
}

// 초기 세팅
buildDaysTable();
buildMonthConfigTable();
updateResultVisibility();
