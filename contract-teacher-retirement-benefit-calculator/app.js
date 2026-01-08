// contract-teacher-retirement-benefit-calculator/app.js
// 계약제교원 퇴직금 산정기 (평균임금 기준)
// - 호봉표(TeacherStepCore)를 이용해 기본급 자동 계산
// - 월정액/비월정액 임금에서 최근 3개월분 임금총액(A) 계산
// - 1일 평균임금 → 퇴직금(평균임금 기준)까지 산출

// 숫자 파싱: 콤마 제거 후 숫자로
function parseNumber(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/,/g, "").trim();
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

// 숫자 포맷: 3자리 콤마
function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return Math.round(n).toLocaleString("ko-KR");
}

// 날짜 문자열 -> Date 객체
function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 두 날짜 사이 일수(양 끝 포함)
function diffDaysInclusive(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

// 근속일수를 대략 년/월/일 문자열로
function formatServiceYMD(days) {
  if (!days || days <= 0) return "-";
  const years = Math.floor(days / 365);
  const remDays = days % 365;
  const months = Math.floor(remDays / 30);
  const d = remDays % 30;
  const parts = [];
  if (years > 0) parts.push(`${years}년`);
  if (months > 0) parts.push(`${months}개월`);
  if (d > 0) parts.push(`${d}일`);
  return parts.length ? parts.join(" ") : `${days}일`;
}

// DOM 요소
const startDateEl = document.getElementById("startDate");
const endDateEl = document.getElementById("endDate");
const weeklyHoursEl = document.getElementById("weeklyHours");
const eligibilityMsgEl = document.getElementById("eligibilityMsg");

const monthlyRowsEl = document.getElementById("monthlyRows");
const yearlyRowsEl = document.getElementById("yearlyRows");

const addMonthlyRowBtn = document.getElementById("addMonthlyRow");
const addYearlyRowBtn = document.getElementById("addYearlyRow");

const btnCalc = document.getElementById("btnCalc");
const btnReset = document.getElementById("btnReset");

const resultArea = document.getElementById("resultArea");
const resTotal3m = document.getElementById("resTotal3m");
const resDays3m = document.getElementById("resDays3m");
const resAvgDaily = document.getElementById("resAvgDaily");
const resAvgMonthly = document.getElementById("resAvgMonthly");
const resServiceDays = document.getElementById("resServiceDays");
const resServiceYears = document.getElementById("resServiceYears");
const resSeverance = document.getElementById("resSeverance");

// 호봉표 관련 DOM
const stepSelectEl = document.getElementById("stepSelect");
const hoursPerDayEl = document.getElementById("hoursPerDay");
const btnCalcBasePay = document.getElementById("btnCalcBasePay");
const autoBaseInfoEl = document.getElementById("autoBaseInfo");

// 행 삭제 버튼 (이벤트 위임)
function handleRemoveRowClick(e) {
  const target = e.target;
  if (!target.classList.contains("btn-remove-row")) return;
  const tr = target.closest("tr");
  if (!tr) return;
  const tbody = tr.parentElement;
  // 필요하면 최소 행수 제한 걸 수 있음
  tbody.removeChild(tr);
}

// 월정액 행 추가
function addMonthlyRow() {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" name="monthlyName" placeholder="항목명"></td>
    <td><input type="text" name="monthlyBase" placeholder="월 정액"></td>
    <td><input type="text" name="monthlyOverride" placeholder="3개월 실지급 합계"></td>
    <td class="center">
      <button type="button" class="btn-lightgrey btn-remove-row">–</button>
    </td>
  `;
  monthlyRowsEl.appendChild(tr);
}

// 비월정액 행 추가
function addYearlyRow() {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" name="yearlyName" placeholder="항목명"></td>
    <td><input type="text" name="yearlyAnnual" placeholder="연간 총액"></td>
    <td><input type="text" name="yearlyOverride" placeholder="3개월 실지급 합계"></td>
    <td class="center">
      <button type="button" class="btn-lightgrey btn-remove-row">–</button>
    </td>
  `;
  yearlyRowsEl.appendChild(tr);
}

// 퇴직금 자격 요건 안내 문구
function updateEligibilityMessage() {
  const start = toDate(startDateEl.value);
  const end = toDate(endDateEl.value);
  const weeklyHours = parseNumber(weeklyHoursEl.value);

  let msg = "";
  let cls = "status-text ";

  if (start && end) {
    const serviceDays = diffDaysInclusive(start, end);
    const overYear = serviceDays >= 365;
    const overHours = weeklyHours >= 15;

    if (overYear && overHours) {
      msg = `요건 충족 추정: 계속근로 ${serviceDays}일(약 ${formatServiceYMD(serviceDays)}), 주 ${weeklyHours}시간 근로로 퇴직금 대상에 해당할 가능성이 높습니다.`;
      cls += "ok";
    } else {
      msg = `요건 미충족 가능성: 계속근로 ${serviceDays}일, 주 ${weeklyHours}시간 기준으로 1년 이상·주 15시간 이상 요건 여부를 다시 확인해 주세요.`;
      cls += "warn";
    }
  } else {
    msg = "임용 시작일·종료일, 주 소정근로시간을 입력하면 퇴직금 대상 요건(1년 이상·주 15시간 이상)을 간단히 점검해 줍니다.";
    cls += "hint";
  }

  eligibilityMsgEl.textContent = msg;
  eligibilityMsgEl.className = cls;
}

// 평균임금 및 퇴직금 계산
function calculate() {
  const start = toDate(startDateEl.value);
  const end = toDate(endDateEl.value);

  if (!start || !end) {
    alert("임용 시작일과 임용 종료일(퇴직일)을 모두 입력해 주세요.");
    return;
  }
  if (end < start) {
    alert("퇴직일이 시작일보다 빠를 수는 없습니다. 날짜를 다시 확인해 주세요.");
    return;
  }

  // 평균임금 산정 구간: 퇴직일 직전 3개월 (달력상 3개월)
  // - avgEnd: 퇴직일 전날
  // - avgStart: avgEnd 기준 3개월 전 같은 날짜
  const avgEnd = new Date(end);
  avgEnd.setDate(avgEnd.getDate() - 1);

  const avgStart = new Date(avgEnd);
  const m = avgStart.getMonth();
  avgStart.setMonth(m - 3);

  const days3m = diffDaysInclusive(avgStart, avgEnd);

  // 1) 월정액 3개월분 합계
  let monthlyTotal3 = 0;
  const monthlyRows = monthlyRowsEl.querySelectorAll("tr");
  monthlyRows.forEach(tr => {
    const baseInput = tr.querySelector('input[name="monthlyBase"]');
    const overrideInput = tr.querySelector('input[name="monthlyOverride"]');
    if (!baseInput || !overrideInput) return;

    const base = parseNumber(baseInput.value);
    const override3 = parseNumber(overrideInput.value);

    if (!base && !override3) return;

    if (override3 > 0) {
      monthlyTotal3 += override3;
    } else if (base > 0) {
      monthlyTotal3 += base * 3;
    }
  });

  // 2) 비월정액 3개월분 합계
  let yearlyTotal3 = 0;
  const yearlyRows = yearlyRowsEl.querySelectorAll("tr");
  yearlyRows.forEach(tr => {
    const annualInput = tr.querySelector('input[name="yearlyAnnual"]');
    const overrideInput = tr.querySelector('input[name="yearlyOverride"]');
    if (!annualInput || !overrideInput) return;

    const annual = parseNumber(annualInput.value);
    const override3 = parseNumber(overrideInput.value);

    if (!annual && !override3) return;

    if (override3 > 0) {
      yearlyTotal3 += override3;
    } else if (annual > 0) {
      yearlyTotal3 += (annual * 3) / 12; // 연총액 × 3/12
    }
  });

  const total3m = monthlyTotal3 + yearlyTotal3;

  if (total3m <= 0) {
    alert(
      "3개월간 임금총액이 0원으로 계산되었습니다.\n월정액 또는 비월정액 항목에 지급액을 입력해 주세요."
    );
    return;
  }

  // 평균임금
  const avgDaily = total3m / days3m;
  const avgMonthly = avgDaily * 30;

  // 근속기간
  const serviceDays = diffDaysInclusive(start, end);
  const serviceYears = serviceDays / 365;

  // 퇴직금(평균임금 기준) = 1일 평균임금 × 30일 × 근속연수
  const severance = avgDaily * 30 * serviceYears;

  // 결과 표시
  resTotal3m.textContent = `${formatNumber(total3m)}원`;
  resDays3m.textContent = `${days3m}일 (${avgStart.getFullYear()}.${avgStart.getMonth() + 1}.${avgStart.getDate()} ~ ${avgEnd.getFullYear()}.${avgEnd.getMonth() + 1}.${avgEnd.getDate()})`;
  resAvgDaily.textContent = `${formatNumber(avgDaily)}원`;
  resAvgMonthly.textContent = `${formatNumber(avgMonthly)}원`;

  resServiceDays.textContent = `${serviceDays}일 (약 ${formatServiceYMD(serviceDays)})`;
  resServiceYears.textContent = `${serviceYears.toFixed(3)}년 (참고용)`;
  resSeverance.textContent = `${formatNumber(severance)}원`;

  resultArea.style.display = "block";

  // 요건 메시지도 갱신
  updateEligibilityMessage();
}

// 전체 초기화
function resetAll() {
  if (!confirm("입력값을 모두 초기화할까요?")) return;
  location.reload(); // 가장 깔끔
}

// 호봉 셀렉트 옵션 채우기
function initStepSelect() {
  if (!stepSelectEl) return;
  if (!window.TeacherStepCore || !TeacherStepCore.PAY_TABLE) {
    autoBaseInfoEl.textContent =
      "호봉표 코어(teacher-step-core.js)를 불러오지 못했습니다. 기본급 자동 계산 기능을 사용할 수 없습니다.";
    autoBaseInfoEl.style.color = "#b14545";
    return;
  }

  const table = TeacherStepCore.PAY_TABLE;
  const steps = Object.keys(table)
    .map(n => Number(n))
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);

  steps.forEach(step => {
    const opt = document.createElement("option");
    opt.value = String(step);
    opt.textContent = `${step}호봉 (${formatNumber(table[step])}원/8시간 기준)`;
    stepSelectEl.appendChild(opt);
  });
}

// 호봉+근무시간 → 기본급 계산 후 월정액 테이블에 반영
function handleCalcBasePay() {
  if (!window.TeacherStepCore || !TeacherStepCore.getMonthlyBasePayByHours) {
    alert("teacher-step-core가 로드되지 않았습니다. F12 콘솔을 확인해 주세요.");
    return;
  }

  const step = stepSelectEl.value;
  const hoursPerDay = parseNumber(hoursPerDayEl.value);

  if (!step) {
    alert("호봉을 선택해 주세요.");
    return;
  }
  if (!hoursPerDay || hoursPerDay <= 0) {
    alert("1일 기준 근무시간을 입력해 주세요.");
    return;
  }

  const basePay = TeacherStepCore.getMonthlyBasePayByHours(step, hoursPerDay);
  if (!basePay) {
    alert("봉급표에서 해당 호봉의 금액을 찾지 못했습니다.");
    return;
  }

  // 월정액 테이블에서 '기본급' 행을 찾아서 월 정액 입력값으로 반영
  let applied = false;
  const rows = monthlyRowsEl.querySelectorAll("tr");
  rows.forEach(tr => {
    const nameInput = tr.querySelector('input[name="monthlyName"]');
    const baseInput = tr.querySelector('input[name="monthlyBase"]');
    if (!nameInput || !baseInput) return;

    const name = (nameInput.value || "").trim();
    if (name === "" || name === "기본급") {
      nameInput.value = name || "기본급";
      baseInput.value = formatNumber(basePay);
      applied = true;
      return;
    }
  });

  // 기본급 행을 못 찾으면 새로 추가
  if (!applied) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" name="monthlyName" value="기본급"></td>
      <td><input type="text" name="monthlyBase" value="${formatNumber(basePay)}"></td>
      <td><input type="text" name="monthlyOverride" placeholder="3개월 실지급 합계"></td>
      <td class="center">
        <button type="button" class="btn-lightgrey btn-remove-row">–</button>
      </td>
    `;
    monthlyRowsEl.appendChild(tr);
  }

  autoBaseInfoEl.innerHTML =
    `선택한 ${step}호봉, 1일 ${hoursPerDay}시간 기준 기본급(월 정액)은 <strong>${formatNumber(
      basePay
    )}원</strong>입니다. 아래 월정액 임금 표에 '기본급' 항목으로 반영되었습니다.`;
}

// 이벤트 바인딩
addMonthlyRowBtn.addEventListener("click", addMonthlyRow);
addYearlyRowBtn.addEventListener("click", addYearlyRow);

monthlyRowsEl.addEventListener("click", handleRemoveRowClick);
yearlyRowsEl.addEventListener("click", handleRemoveRowClick);

btnCalc.addEventListener("click", calculate);
btnReset.addEventListener("click", resetAll);

startDateEl.addEventListener("change", updateEligibilityMessage);
endDateEl.addEventListener("change", updateEligibilityMessage);
weeklyHoursEl.addEventListener("input", updateEligibilityMessage);

btnCalcBasePay.addEventListener("click", handleCalcBasePay);

// 초기 셋업
initStepSelect();
updateEligibilityMessage();
