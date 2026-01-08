/* 제외기간 동적 추가, 자동 계산, 통보서용 HTML 다운로드까지 포함 */

function parseDate(idOrEl) {
  var el = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
  var v = el ? (el.value || el.textContent || "") : "";
  if (!v) return null;
  // yyyy-mm-dd 형태만 잘라서 00시로
  return new Date(String(v).slice(0, 10) + "T00:00:00");
}

// 토요일 제외 근무일수 계산
function countDaysExcludingSaturday(start, end) {
  if (!start || !end) return 0;
  var cnt = 0;
  var d = new Date(start);
  while (d <= end) {
    if (d.getDay() !== 6) cnt++;
    d.setDate(d.getDate() + 1);
  }
  return cnt;
}

function yearsBetween(start, end) {
  if (!start || !end) return 0;
  var y = end.getFullYear() - start.getFullYear();
  var tmp = new Date(start);
  tmp.setFullYear(start.getFullYear() + y);
  if (tmp > end) y--;
  return y;
}

// 2자리 0패딩
function z(n) {
  return ("0" + n).slice(-2);
}

/* 제외기간 */

function addEx() {
  var box = document.getElementById("exList");
  if (!box) return;

  var wrap = document.createElement("div");
  wrap.className = "exitem";
  wrap.innerHTML =
    '<div class="row">' +
      '<div>' +
        '<label>사유</label>' +
        '<input type="text" class="exReason" placeholder="예: 육아휴직">' +
      '</div>' +
      '<div>' +
        '<label>시작</label>' +
        '<input type="date" class="exStart">' +
      '</div>' +
    '</div>' +
    '<div class="row">' +
      '<div>' +
        '<label>종료</label>' +
        '<input type="date" class="exEnd">' +
      '</div>' +
      '<div style="display:flex;align-items:flex-end">' +
        '<button class="btn delExBtn" type="button">삭제</button>' +
      '</div>' +
    '</div>';

  box.appendChild(wrap);

  // 삭제 버튼
  var del = wrap.querySelector(".delExBtn");
  if (del) {
    del.addEventListener("click", function () {
      wrap.remove();
      calc();
    });
  }

  // 행추가 시 자동 계산
  wrap.querySelectorAll("input").forEach(function (el) {
    el.addEventListener("input", calc);
    el.addEventListener("change", calc);
  });

  calc();
}



function calc() {
  // 1. 입력값 수집
  var ps = parseDate("periodStart");
  var pe = parseDate("periodEnd");
  var vac1s = parseDate("vac1Start");
  var vac1e = parseDate("vac1End");
  var vac2s = parseDate("vac2Start");
  var vac2e = parseDate("vac2End");
  var absS = parseDate("absStart");
  var absE = parseDate("absEnd");

  var vac1Work = parseInt(document.getElementById("vac1Work").value || "0", 10);
  var vac2Work = parseInt(document.getElementById("vac2Work").value || "0", 10);

  // 2. 기본 일수 계산 (토요일 제외)
  var total = countDaysExcludingSaturday(ps, pe);        // 달력상 총일수(토 제외)
  var vac1  = countDaysExcludingSaturday(vac1s, vac1e);  // 여름방학
  var vac2  = countDaysExcludingSaturday(vac2s, vac2e);  // 겨울방학
  var abs   = countDaysExcludingSaturday(absS, absE);    // 결근(단일 구간)

  // 3. 제외기간 누적
  var excl = (function () {
    var items = document.querySelectorAll("#exList .exitem");
    var t = 0;
    for (var i = 0; i < items.length; i++) {
      var s = items[i].querySelector(".exStart");
      var e = items[i].querySelector(".exEnd");
      if (s && e && s.value && e.value) {
        t += countDaysExcludingSaturday(
          new Date(s.value + "T00:00:00"),
          new Date(e.value + "T00:00:00")
        );
      }
    }
    return t;
  })();

  // 4. 학기 총일수 / 근무일수
  var semester      = total - (vac1 + vac2);              // 학기 총일수
  var daysNoVacWork = semester - excl - abs;              // 방중출근 제외 전
  var worked        = daysNoVacWork + vac1Work + vac2Work; // 실제 근무일수(방중출근 포함)

  // 5. 화면 반영: 일수 관련
  var daysSemesterEl   = document.getElementById("daysSemester");
  var daysNoVacWorkEl  = document.getElementById("daysNoVacWork");
  var daysWorkedEl     = document.getElementById("daysWorked");

  if (daysSemesterEl)  daysSemesterEl.value  = semester      || 0;
  if (daysNoVacWorkEl) daysNoVacWorkEl.value = daysNoVacWork || 0;
  if (daysWorkedEl)    daysWorkedEl.value    = worked        || 0;

  // 6. 근속 / 기본연차 계산
  var type = (document.getElementById("type") || {}).value || "상시근무자";
  var base = (type === "상시근무자") ? 15 : 12; // 방학중비상시는 12일

  // 기준일(연차 부여 기준일): 기간 종료일 + 1일 
  var peNext     = pe ? new Date(pe.getTime() + 24 * 3600 * 1000) : null;
  var targetYear = peNext ? peNext.getFullYear() : (new Date()).getFullYear();
  var grantOrg   = (document.getElementById("grantOrg") || {}).value || "기관";
  var ref        = new Date(targetYear, grantOrg === "기관" ? 0 : 2, 1); // 0=1월, 2=3월

  var firstHire = parseDate("firstHire");
  var years     = yearsBetween(firstHire, ref);
  var extra     = firstHire ? Math.floor(Math.max(years - 1, 0) / 2) : 0;

  // 7. 화면 반영: 기본연차/근속/기준일
  var baseLeaveEl   = document.getElementById("baseLeave");
  var yearsEl       = document.getElementById("years");
  var extraLeaveEl  = document.getElementById("extraLeave");
  var refDateEl     = document.getElementById("refDate");

  if (baseLeaveEl)  baseLeaveEl.value  = base;
  if (yearsEl)      yearsEl.value      = years;
  if (extraLeaveEl) extraLeaveEl.value = extra;
  if (ref && refDateEl) {
    refDateEl.value =
      ref.getFullYear() + "." + z(ref.getMonth() + 1) + "." + z(ref.getDate());
  }

  // 8. 연차 부여 규칙 텍스트 (학기 기준 / 달력상 총일수 기준)
  function ratio(a, b) {
    return (b > 0) ? (a / b) : 0;
  }

  var semText = "-";
  if (type !== "상시근무자") {
    var r1 = ratio(worked, semester);
    var r2 = ratio(worked, semester - excl); // 제외기간 빼고 출근율
    if (r1 >= 0.8) {
      semText = (base + extra) + " 일";
    } else if (r1 < 0.8 && r2 >= 0.8) {
      semText = ((base + extra) * (semester - excl) / semester).toFixed(2)
        + " 일 (비율부여)";
    } else {
      semText = "개근 월수만큼 부여";
    }
  }

  var r3 = ratio(worked, total);
  var r4 = ratio(worked, total - excl);
  var calText = "-";
  if (r3 >= 0.8) {
    calText = (15 + extra) + " 일";
  } else if (r3 < 0.8 && r4 >= 0.8) {
    calText = ((15 + extra) * (total - excl) / total).toFixed(2)
      + " 일 (비율부여)";
  } else {
    calText = "개근 월수만큼 부여";
  }

  var ruleSemesterEl = document.getElementById("ruleSemester");
  var ruleCalendarEl = document.getElementById("ruleCalendar");
  if (ruleSemesterEl) ruleSemesterEl.innerText = semText;
  if (ruleCalendarEl) ruleCalendarEl.innerText = calText;
}

function downloadHwp() {
  // hwp 구현 사실 불가한데 일단 남겨둠
  var jobSel  = document.getElementById("jobSelect");
  var jobVal  = jobSel ? jobSel.value : "";
  var job     = (jobVal === "직접 입력")
    ? ((document.getElementById("jobCustom") || {}).value || "")
    : jobVal;

  var name      = (document.getElementById("empName")    || {}).value || "";
  var firstHire = (document.getElementById("firstHire")  || {}).value || "";
  var orgName   = (document.getElementById("orgName")    || {}).value || "";
  var refDate   = (document.getElementById("refDate")    || {}).value || "";
  var ruleCal   = (document.getElementById("ruleCalendar") || {}).innerText || "";

  var leaveDays = "";
  var m = (ruleCal || "").match(/([0-9]+(\.[0-9]+)?)\s*일/);
  if (m) leaveDays = m[1];

  var ymd = (refDate || new Date().toISOString().slice(0, 10)).replace(/-/g, ".");

  // 출근율 체크용 (학기 기준)
  var ps = parseDate("periodStart");
  var pe = parseDate("periodEnd");
  var vac1s = parseDate("vac1Start");
  var vac1e = parseDate("vac1End");
  var vac2s = parseDate("vac2Start");
  var vac2e = parseDate("vac2End");
  var absS  = parseDate("absStart");
  var absE  = parseDate("absEnd");

  var total = countDaysExcludingSaturday(ps, pe);
  var vac1  = countDaysExcludingSaturday(vac1s, vac1e);
  var vac2  = countDaysExcludingSaturday(vac2s, vac2e);
  var semester = total - (vac1 + vac2);

  var excl = (function () {
    var items = document.querySelectorAll("#exList .exitem");
    var t = 0;
    for (var i = 0; i < items.length; i++) {
      var s = items[i].querySelector(".exStart");
      var e = items[i].querySelector(".exEnd");
      if (s && e && s.value && e.value) {
        t += countDaysExcludingSaturday(
          new Date(s.value + "T00:00:00"),
          new Date(e.value + "T00:00:00")
        );
      }
    }
    return t;
  })();

  var abs   = countDaysExcludingSaturday(absS, absE);
  var daysNoVacWork = semester - excl - abs;
  var vac1Work = parseInt((document.getElementById("vac1Work") || {}).value || "0", 10);
  var vac2Work = parseInt((document.getElementById("vac2Work") || {}).value || "0", 10);
  var worked   = daysNoVacWork + vac1Work + vac2Work;
  var r1       = (semester > 0) ? worked / semester : 0;
  var chk80    = r1 >= 0.8
    ? "80% 이상 ( ○ )<br>80% 미만 (   )"
    : "80% 이상 (   )<br>80% 미만 ( ○ )";

  var html =
    '<html><head><meta charset="utf-8"><title>연차휴가일수 통보서</title></head>' +
    '<body style="font-family:Malgun Gothic,Arial,sans-serif; line-height:1.6">' +
    '<h2 style="text-align:center;margin-top:40px">교육공무직 연차휴가일수 및 보수표 통보서</h2>' +
    '<table border="1" cellspacing="0" cellpadding="8" ' +
    'style="width:100%; border-collapse:collapse; margin-top:24px">' +
    '<tr><th>직 종</th><th>근로자</th><th>최초임용일</th><th>전년도 출근율</th><th>연차휴가일수</th><th>비고</th></tr>' +
    '<tr>' +
    '<td style="text-align:center">' + (job || "")       + '</td>' +
    '<td style="text-align:center">' + (name || "")      + '</td>' +
    '<td style="text-align:center">' + (firstHire || "") + '</td>' +
    '<td style="text-align:center">' + chk80             + '</td>' +
    '<td style="text-align:center">' + (leaveDays ? (leaveDays + "일") : "") + '</td>' +
    '<td></td>' +
    '</tr></table>' +
    '<p style="margin-top:12px">불입 직종별 보수표 사본 1부.</p>' +
    '<p style="margin-top:32px; text-align:right">' + (orgName || "") + '장 &nbsp;&nbsp;&nbsp;&nbsp;</p>' +
    '<p style="margin-top:8px; text-align:right">' + ymd + '</p>' +
    '</body></html>';

  var blob = new Blob([html], { type: "text/html;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "연차휴가일수_통보서.hwp";  // 확장자만 hwp로
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}



document.addEventListener("DOMContentLoaded", function () {
  // 제외기간 추가 버튼
  var btn = document.getElementById("addExBtn");
  if (btn) btn.addEventListener("click", addEx);

  // 모든 input/select에 계산 바인딩
  function bindAll() {
    var fields = document.querySelectorAll("input,select");
    for (var i = 0; i < fields.length; i++) {
      if (fields[i]._boundCalc) continue;
      fields[i].addEventListener("input", calc);
      fields[i].addEventListener("change", calc);
      fields[i]._boundCalc = true;
    }
  }
  bindAll();

  // 동적 노드 감시
  var obs = new MutationObserver(function () {
    bindAll();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // 직종 직접입력 토글
  (function () {
    function toggleJobCustom() {
      var sel    = document.getElementById("jobSelect");
      var custom = document.getElementById("jobCustom");
      if (!sel || !custom) return;
      custom.style.display = (sel.value === "직접 입력") ? "block" : "none";
    }
    document.addEventListener("change", function (e) {
      if (e.target && e.target.id === "jobSelect") toggleJobCustom();
    });
    toggleJobCustom();
  })();

  // 통보서 다운로드 버튼 선택사항 고민중
  var dlBtn = document.getElementById("btnDownloadHwp");
  if (dlBtn) dlBtn.addEventListener("click", downloadHwp);

  // 최초 1회 계산
  calc();
});
