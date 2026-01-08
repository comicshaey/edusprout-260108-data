// /static/teacher-step-core.js
// 251120 교육공무원 봉급표(호봉) 공통 코어
// - 다른 계산기에서 공통으로 불러 쓰는 용도
// - 8시간 기준 월봉급액을 기준으로 함

(function (global) {
  "use strict";

  // 봉급표 (정상근무 8시간 기준 월봉급액)
  const PAY_TABLE = {
    1: 1915100,
    2: 1973100,
    3: 2031900,
    4: 2090500,
    5: 2149600,
    6: 2208600,
    7: 2267000,
    8: 2325100,
    9: 2365500,
    10: 2387800,
    11: 2408300,
    12: 2455700,
    13: 2567600,
    14: 2679900,
    15: 2792000,
    16: 2904500,
    17: 3015500,
    18: 3131900,
    19: 3247500,
    20: 3363300,
    21: 3478900,
    22: 3607300,
    23: 3734600,
    24: 3862300,
    25: 3989800,
    26: 4117800,
    27: 4251300,
    28: 4384500,
    29: 4523800,
    30: 4663600,
    31: 4803000,
    32: 4942200,
    33: 5083700,
    34: 5224600,
    35: 5365800,
    36: 5506400,
    37: 5628700,
    38: 5751200,
    39: 5873900,
    40: 5995800
  };

  // 내부용 숫자 변환
  function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // 8시간 기준 월봉급액
  function getMonthlyBasePay8h(step) {
    const s = toNumber(step);
    return PAY_TABLE[s] || 0;
  }

  // 하루 기준 근무시간에 맞춰 월봉급액 비례 (예: 4시간이면 1/2)
  function getMonthlyBasePayByHours(step, hoursPerDay) {
    const base8 = getMonthlyBasePay8h(step);
    const h = toNumber(hoursPerDay);
    if (!base8 || !h) return 0;
    return Math.round(base8 * (h / 8));
  }

  // 외부에서 쓸 수 있도록 객체로 묶어서 export
  const TeacherStepCore = {
    PAY_TABLE,
    getMonthlyBasePay8h,
    getMonthlyBasePayByHours
  };

  // 브라우저 전역(window)에 붙이기
  global.TeacherStepCore = TeacherStepCore;

  // 혹시 CommonJS 환경에서 쓸 일 있을 때 대비
  if (typeof module !== "undefined" && module.exports) {
    module.exports = TeacherStepCore;
  }
})(this);
