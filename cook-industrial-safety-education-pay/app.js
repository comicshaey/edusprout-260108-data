// 251118화 수정: 조리종사원 산안전보건교육


const FALLBACK_DATA = {
  meta: {
    월통상임금산정시간: 209,
    사용스냅샷: "2025.03.01"
  },
"snapshot": {
  "fixedAmounts": {
    "정액급식비": 150000,
    "정기상여금": 83330,
    "명절휴가비": 154160,
    "교무행정사(직무수당)": 30000,
    "급식운영수당": 50000,
    "면허가산수당": 113300,
    "특수업무수당": 20000,
    "특수교육지원수당": 30000,
    "기술정보수당": 20000,
    "위험수당": 50000
  },

    jobs: [
      {
        직종: "영양사",
        기본급: 2266000,
        근속수당등급: "◎",
        적용: {
          정액급식비: "○",
          위험수당: "×",
          급식운영수당: "○",
          기술정보수당: "×",
          특수업무수당: "×",
          특수교육지원수당: "×",
          면허가산수당: "◎",
          가족수당: "○",
          정기상여금: "○",
          명절휴가비: "○",
          맞춤형복지: "○",
          "교무행정사(직무수당)": "×"
        },
        일급: 86730
      },
      {
        직종: "조리사",
        기본급: 2169300,
        근속수당등급: "◎",
        적용: {
          정액급식비: "○",
          위험수당: "○",
          급식운영수당: "×",
          기술정보수당: "×",
          특수업무수당: "×",
          특수교육지원수당: "×",
          면허가산수당: "×",
          가족수당: "○",
          정기상여금: "○",
          명절휴가비: "○",
          맞춤형복지: "○",
          "교무행정사(직무수당)": "×"
        },
        일급: 83030
      },
      {
        직종: "조리실무사",
        기본급: 2066000,
        근속수당등급: "◎",
        적용: {
          정액급식비: "○",
          위험수당: "○",
          급식운영수당: "×",
          기술정보수당: "×",
          특수업무수당: "×",
          특수교육지원수당: "×",
          면허가산수당: "×",
          가족수당: "○",
          정기상여금: "○",
          명절휴가비: "○",
          맞춤형복지: "○",
          "교무행정사(직무수당)": "×"
        },
        일급: 79080
      }
    ]
  }
};

// data.json 로딩
async function loadData(){
  const urls = ['data.json', './data.json', '/ordinary-wage/data.json'];
  let lastErr = null;
  for(const u of urls){
    try{
      const r = await fetch(u + '?v=' + Date.now());
      if(!r.ok) throw new Error('HTTP ' + r.status);
      const txt = await r.text();
      return JSON.parse(txt.replace(/\bNaN\b/g,'0'));
    }catch(e){
      lastErr = e;
    }
  }
  return FALLBACK_DATA;
}

// 돈 표기
function money(n){
  return (Math.round(n)||0).toLocaleString();
}

// 원 단위 절삭
function floor10(v){
  const n = Number(v) || 0;
  return Math.floor(n / 10) * 10;
}

// 수당 입력칸 구성
function rebuildAllowanceInputs(box, job, fixed){
  box.innerHTML='';
  const names=[
    "정액급식비","위험수당","급식운영수당","기술정보수당",
    "특수업무수당","특수교육지원수당","면허가산수당",
    "정기상여금","명절휴가비","교무행정사(직무수당)"
  ];
  for(const name of names){
    const flag = job?.적용?.[name] || '×';
    const row = document.createElement('div');
    row.className='allow-row';

    const lab = document.createElement('label');
    lab.textContent = name + (flag==='×' ? ' (미적용)' : ' (적용)');

    const inp = document.createElement('input');
    inp.type='number';
    inp.min='0';
    inp.step='1';
    inp.value = (fixed?.[name] || 0);
    inp.dataset.name = name;

    if(flag==='×'){
      inp.disabled = true;
      inp.classList.add('disabled');
    }

    row.appendChild(lab);
    row.appendChild(inp);
    box.appendChild(row);
  }
}

// 날짜 파싱
function parseYmd(s){
  if(!s) return null;
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return null;
  return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
}

// 근속연수 계산
function calcYears(startDateStr, calcDateStr){
  const s = parseYmd(startDateStr);
  const b = parseYmd(calcDateStr);
  if(!s || !b) return null;
  let y = b.getFullYear() - s.getFullYear();
  const anniv = new Date(b.getFullYear(), s.getMonth(), s.getDate());
  if(b < anniv) y -= 1;
  return Math.max(0, y);
}

// 근속수당: 연 40,000원, 상한 23년
function computeTenureAmount(years){
  const y = Math.max(0, Math.min(Number(years||0), 23));
  return y * 40000;
}



/* 최종 합계 */

function updateFinalTotal() {
  const vacElm    = document.getElementById('outVacFinal');
  const onlineElm = document.getElementById('outOnlineFinal');
  const totalElm  = document.getElementById('outTotalFinal');

  // 합계 카드가 아예 없으면 그냥 종료 (에러 방지)
  if (!vacElm || !onlineElm || !totalElm) return;

  // 1) 방학 중 집체교육 최종 지급액 읽기
  let vacAmount = 0;
  const vacRes = document.getElementById('vacResult');

  if (vacRes && vacRes.style.display !== 'none') {
    // "최종 지급액 123,456" 이런 식으로 들어가 있으니까 텍스트 기준으로 파싱
    const text = vacRes.innerText.replace(/\s+/g, ' '); // 공백 정리
    const m = text.match(/최종 지급액\s*([\d,]+)/);
    if (m) {
      vacAmount = Number(m[1].replace(/,/g, '')) || 0;
    }
  }

  // 2) 온라인 교육 인건비 최종액 읽기
  let onlineAmount = 0;
  const outEdu = document.getElementById('outEduAmount');
  if (outEdu) {
    const t = outEdu.innerText.trim();
    if (t && t !== '-') {
      onlineAmount = Number(t.replace(/[^\d]/g, '')) || 0;
    }
  }

  // 3) 표시 (값 없으면 '-' 유지, 있으면 "123,456원")
  if (vacAmount > 0) {
    vacElm.textContent = vacAmount.toLocaleString('ko-KR') + '원';
  } else {
    vacElm.textContent = '-';
  }

  if (onlineAmount > 0) {
    onlineElm.textContent = onlineAmount.toLocaleString('ko-KR') + '원';
  } else {
    onlineElm.textContent = '-';
  }

  const total = vacAmount + onlineAmount;
  if (total > 0) {
    totalElm.textContent = total.toLocaleString('ko-KR') + '원';
  } else {
    totalElm.textContent = '-';
  }
}


/* ----------------------------------------------------
   DOMContentLoaded
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async ()=>{

  const note = document.getElementById('note');
  const jobSel = document.getElementById('job');
  const yearsInp = document.getElementById('years');
  const startDateInp = document.getElementById('startDate');
  const calcDateInp = document.getElementById('calcDate');
  const yearsMode = document.getElementById('yearsMode');
  const allowBox = document.getElementById('allowBox');
  const outBase = document.getElementById('outBase');
  const outTenure = document.getElementById('outTenure');
  const outSum = document.getElementById('outSum');
  const outHourly = document.getElementById('outHourly');
  const resetBtn = document.getElementById('resetBtn');

  // 방학 집체교육 DOM
  const vacAuto   = document.getElementById('vacAuto');
  const vacBasic  = document.getElementById('vacBasic');
  const vacMeal   = document.getElementById('vacMeal');
  const vacDays   = document.getElementById('vacDays');
  const vacEduH   = document.getElementById('vacEduHours');
  const vacMinWage= document.getElementById('vacMinWage');
  const vacResult = document.getElementById('vacResult');
  const vacCalcBtn= document.getElementById('vacCalcBtn');
  const vacResetBtn=document.getElementById('vacResetBtn');

  // 학기 중 온라인 교육 DOM
  const eduUseManual     = document.getElementById('eduUseManual');
  const eduManualHourly  = document.getElementById('eduManualHourly');
  const eduMultiplierInp = document.getElementById('eduMultiplier');
  const eduHoursInp      = document.getElementById('eduHours');
  const outEduBaseHourly = document.getElementById('outEduBaseHourly');
  const outEduOverHourly = document.getElementById('outEduOverHourly');
  const outEduAmount     = document.getElementById('outEduAmount');

  let data;
  try{
    data = await loadData();
  }catch(e){
    data = FALLBACK_DATA;
  }

  const snap = data.snapshot || {jobs:[], fixedAmounts:{}};

  note.textContent =
    ' (수당 기준일: ' +
    (data.meta?.사용스냅샷 || '2025.03.01') +
    ', 월 ' +
    (data.meta?.월통상임금산정시간 || 209) +
    '시간 기준)';

  // 직종 목록 (3개)
  jobSel.innerHTML = '';
  const targetJobs = ["영양사", "조리사", "조리실무사"];
  let jobList = Array.isArray(snap.jobs) ? snap.jobs.slice() : [];
  if (!jobList.length && FALLBACK_DATA?.snapshot?.jobs) {
    jobList = FALLBACK_DATA.snapshot.jobs.slice();
  }
  const filtered = jobList.filter(j => j && targetJobs.includes(j.직종));
  if (filtered.length > 0) {
    filtered.forEach(j => {
      const op = document.createElement('option');
      op.value = j.직종;
      op.textContent = j.직종;
      jobSel.appendChild(op);
    });
  } else {
    jobSel.innerHTML = '<option>직종 데이터 없음</option>';
  }

  // 계산 시점 기본값
  const today = new Date();
  const pad = n => String(n).padStart(2,'0');
  calcDateInp.value =
    today.getFullYear() + '-' +
    pad(today.getMonth()+1) + '-' +
    pad(today.getDate());

  function readAllowMap(){
    const m = {};
    allowBox.querySelectorAll('input[type=number]').forEach(i=>{
      if(!i.disabled) m[i.dataset.name] = Number(i.value||0);
    });
    return m;
  }

  function syncYearsMode(){
    if(startDateInp.value){
      yearsInp.disabled = true;
      yearsInp.classList.add('disabled');
      yearsMode.textContent = '최초 임용일 기준 자동 계산 중';
    }else{
      yearsInp.disabled = false;
      yearsInp.classList.remove('disabled');
      yearsMode.textContent = '미입력 시 근속연수 수동 입력 가능';
    }
  }

  let lastHourly = 0;
  let lastJob = null;

  // 방학 집체교육 자동모드
  function applyVacAuto(){
    if(!vacAuto || !lastJob) return;

    if(vacAuto.checked){
      const base = Number(lastJob.기본급 || 0);
      const fixed = snap.fixedAmounts || {};
      const meal = Number(fixed["정액급식비"] || 0);
      vacBasic.value = base ? String(base) : "";
      vacMeal.value  = meal ? String(밥) : "";

      vacBasic.disabled = true;
      vacMeal.disabled  = true;
      vacBasic.classList.add('disabled');
      vacMeal.classList.add('disabled');
    }else{
      vacBasic.disabled = false;
      vacMeal.disabled  = false;
      vacBasic.classList.remove('disabled');
      vacMeal.classList.remove('disabled');
    }
  }

  // 온라인 교육 계산
  function recalcEdu(){
    const useManual = eduUseManual && eduUseManual.checked;

    let baseHourly = 0;
    if (useManual) {
      baseHourly = Number(eduManualHourly.value || 0);
    } else {
      baseHourly = lastHourly;
    }

    const eduH = Number(eduHoursInp.value || 0);
    const mult = Number(eduMultiplierInp.value || 0);

    if (!baseHourly || !eduH || !mult) {
      outEduBaseHourly.textContent = baseHourly ? money(baseHourly) : '-';
      outEduOverHourly.textContent = '-';
      outEduAmount.textContent     = '0';
      updateFinalTotal();
      return;
    }

    const baseAmountRaw = baseHourly * eduH;
    const overAmountRaw = baseAmountRaw * mult;
    const finalAmount   = floor10(overAmountRaw);
    const overHourlyRaw = baseHourly * mult;

    outEduBaseHourly.textContent = money(baseHourly);
    outEduOverHourly.textContent = money(overHourlyRaw);
    outEduAmount.textContent     = money(finalAmount);

    updateFinalTotal();
  }

  // 방학 집체교육 계산
  function calcVacation(){

    if (vacAuto && vacAuto.checked) {
      if ((!vacBasic.value || !vacMeal.value) && jobSel && jobSel.value) {
        const job = (snap.jobs || []).find(j => j.직종 === jobSel.value);
        if (job) {
          lastJob = job;
          const fixed = snap.fixedAmounts || {};
          const base = Number(job.기본급 || 0);
          const meal = Number(fixed["정액급식비"] || 0);
          vacBasic.value = base ? String(base) : "";
          vacMeal.value  = meal ? String(밥) : "";
        }
      }
    }

    const basic   = Number(vacBasic.value)   || 0;
    const meal    = Number(vacMeal.value)    || 0;
    const days    = Number(vacDays.value)    || 0;
    const eduH    = Number(vacEduH.value)    || 0;
    const minWage = Number(vacMinWage.value) || 0;

    if(!basic || !days || !eduH || !minWage){
      vacResult.style.display = 'block';
      vacResult.innerHTML = `
        <p>직종 먼저 선택하쇼</p>
      `;
      updateFinalTotal();
      return;
    }

    const monthlyTotal = basic + meal;
    const dailyRaw = monthlyTotal / days;
    const dailyPay = floor10(dailyRaw);

    const hourlyRaw = dailyPay / 8;
    const hourlyPay = floor10(hourlyRaw);

    const eduRaw = hourlyPay * eduH;
    const eduPay = floor10(eduRaw);

    const minPayRaw = minWage * eduH;
    const minPay = floor10(minPayRaw);

    let extra = 0;
    let finalPay = eduPay;
    if(eduPay < minPay){
      extra = minPay - eduPay;
      finalPay = minPay;
    }

    vacResult.style.display = 'block';
    vacResult.innerHTML = `
      <table>
        <tr><th>항목</th><th>금액</th></tr>
        <tr><td>월임금 (기본급 + 정액급식비)</td><td>${money(monthlyTotal)}</td></tr>
        <tr><td>일급 (월임금 ÷ 월일수, 원단위 절삭)</td><td>${money(dailyPay)}</td></tr>
        <tr><td>통상임금 (일급 ÷ 8시간, 원단위 절삭)</td><td>${money(hourlyPay)}</td></tr>
        <tr><td>교육시간 임금 (통상임금 × ${eduH}시간, 원단위 절삭)</td><td>${money(eduPay)}</td></tr>
        <tr><td>최저임금 기준 (최저시급 × ${eduH}시간, 원단위 절삭)</td><td>${money(minPay)}</td></tr>
        <tr><td>최저임금 보전 추가액</td><td>${money(extra)}</td></tr>
        <tr><td class="result-strong">최종 지급액</td><td class="result-strong">${money(finalPay)}</td></tr>
      </table>
    `;

    updateFinalTotal();
  }

  function recalc(){
    const job = (snap.jobs||[]).find(j=>j.직종===jobSel.value) ||
                (snap.jobs||[]).find(j=>targetJobs.includes(j.직종));
    if(!job){ return; }

    lastJob = job;

    if(startDateInp.value){
      const y = calcYears(startDateInp.value, calcDateInp.value);
      if(y!=null) yearsInp.value = y;
    }
    syncYearsMode();

    const years = Number(yearsInp.value || 0);
    const tAmt  = computeTenureAmount(years);
    const base  = Number(job.기본급 || 0);
    const allowMap = readAllowMap();
    const sum   = base + tAmt + Object.values(allowMap).reduce((a,b)=>a+b,0);
    const hourlyRaw = sum / (data.meta?.월통상임금산정시간 || 209);
    const hourly = Math.round(hourlyRaw);

    lastHourly = hourly;

    outBase.textContent   = money(base);
    outTenure.textContent = money(tAmt) + ' (연 40,000원, 상한 23년)';
    outSum.textContent    = money(sum);
    outHourly.textContent = money(hourly);

    applyVacAuto();
    recalcEdu();
    calcVacation(); 
  }

  function resetVacation(){
    vacAuto.checked = true;
    vacDays.value   = '31';
    vacEduH.value   = '6';
    vacMinWage.value= '10030';
    vacResult.style.display = 'none';
    vacResult.innerHTML = '';
    applyVacAuto();
    calcVacation();
  }

  function resetEdu(){
    eduUseManual.checked = false;
    eduManualHourly.value = '';
    eduManualHourly.disabled = true;
    eduMultiplierInp.value = '1.5';
    eduHoursInp.value = '6';
    recalcEdu();
  }

  // 초기 수당 입력칸
  rebuildAllowanceInputs(
    allowBox,
    (snap.jobs||[]).find(j=>targetJobs.includes(j.직종)) || {},
    snap.fixedAmounts || {}
  );

  // 이벤트 바인딩
  jobSel.addEventListener('change', () => {
    const job = (snap.jobs || []).find(j => j.직종 === jobSel.value);
    rebuildAllowanceInputs(allowBox, job, snap.fixedAmounts || {});
    recalc();
  });

  yearsInp.addEventListener('input', recalc);
  allowBox.addEventListener('input', recalc);
  startDateInp.addEventListener('input', recalc);
  calcDateInp.addEventListener('input', recalc);

  resetBtn.addEventListener('click', ()=>{
    yearsInp.value = 0;
    startDateInp.value = '';
    const now = new Date();
    calcDateInp.value =
      now.getFullYear() + '-' +
      String(now.getMonth()+1).padStart(2,'0') + '-' +
      String(now.getDate()).padStart(2,'0');
    recalc();
  });

  // 방학 집체교육
  if(vacCalcBtn)  vacCalcBtn.addEventListener('click', calcVacation);
  if(vacResetBtn) vacResetBtn.addEventListener('click', resetVacation);
  if(vacAuto){
    vacAuto.addEventListener('change', ()=>{
      applyVacAuto();
      calcVacation();
    });
  }
  if (vacBasic)   vacBasic.addEventListener('input', calcVacation);
  if (vacMeal)    vacMeal.addEventListener('input', calcVacation);
  if (vacDays)    vacDays.addEventListener('input', calcVacation);
  if (vacEduH)    vacEduH.addEventListener('input', calcVacation);
  if (vacMinWage) vacMinWage.addEventListener('input', calcVacation);

  // 온라인 교육
  if(eduUseManual){
    eduUseManual.addEventListener('change', ()=>{
      const useManual = eduUseManual.checked;
      eduManualHourly.disabled = !useManual;
      if(!useManual){
        eduManualHourly.value = '';
      }
      recalcEdu();
    });
  }
  if(eduHoursInp)      eduHoursInp.addEventListener('input', recalcEdu);
  if(eduMultiplierInp) eduMultiplierInp.addEventListener('input', recalcEdu);
  if(eduManualHourly)  eduManualHourly.addEventListener('input', recalcEdu);

  // 초기 계산
  recalc();
  resetVacation();
  resetEdu();
  updateFinalTotal();
});
