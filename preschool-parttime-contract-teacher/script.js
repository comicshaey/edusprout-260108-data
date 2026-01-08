// 251121 유치원 시간제근무 기간제교원 인건비 계산기 
// 졸리다

function $(id){return document.getElementById(id);}
function toNumber(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function floorTo10(v){const n=Number(v)||0;return Math.floor(n/10)*10;}
function parseDate(str){if(!str)return null;const d=new Date(str+"T00:00:00");return isNaN(d.getTime())?null:d;}
function diffDaysInclusive(s,e){const ms=e-s;return Math.floor(ms/(1000*60*60*24))+1;}
function formatWon(v){return Number(v).toLocaleString("ko-KR")+"원";}

// 상수
const WEEK_HOURS_SEM=20;
const WEEK_HOURS_VAC=40;
const WEEK_TO_MONTH=4.345;

const FAMILY_SPOUSE=40000;
const MEAL_8H=140000, MEAL_4H=70000;
const TEACH_ALLOW_8H=250000, TEACH_ALLOW_4H=125000;

// 경력연수
function getCareerYearsFloat(){
  const y=toNumber($("careerYears")?.value);
  const m=toNumber($("careerMonths")?.value);
  const d=toNumber($("careerDays")?.value);
  return y+m/12+d/365;
}

// 교원연구비(예시 구간)
function calcTeacherResearchFull(yrs){
  if(!yrs||yrs<0)return 0;
  return yrs>=5?60000:75000;
}

// 정근수당 가산금 자동계산은 사용 안 함(수기입력)
function calcLongevityAddonFullMonthly(_yrs){
  return 0;
}

// 가족수당(정상근무 기준 월액)
function calcFamilyFullMonthly(){
  const spouse=document.querySelector('input[name="spouseFlag"]:checked')?.value==="Y";

  const f1=document.querySelector('input[name="firstChildFlag"]:checked')?.value==="Y";
  const f2=document.querySelector('input[name="secondChildFlag"]:checked')?.value==="Y";
  const f3=document.querySelector('input[name="thirdChildFlag"]:checked')?.value==="Y";
  let cnt3=toNumber($("childThirdCount")?.value);
  if(cnt3<0)cnt3=0;

  let childCount=0;
  if(f1)childCount++;
  if(f2)childCount++;
  if(f3&&cnt3>0)childCount+=cnt3;

  let total=0;
  if(spouse)total+=FAMILY_SPOUSE;

  if(childCount===1)total+=50000;
  else if(childCount===2)total+=80000;
  else if(childCount>=3)total+=120000;

  return total;
}

// 월별 수당 자동 반영
function applyAutoAllowances(){
  const rows=document.querySelectorAll(".allowance-row");
  if(!rows.length)return;

  const yrs=getCareerYearsFloat();
  const fullFamily=calcFamilyFullMonthly();
  const fullResearch=calcTeacherResearchFull(yrs);
  // 정근수당 가산금은 자동계산 안 함

  const semFamily=fullFamily*0.5;
  const vacFamily=fullFamily;
  const semResearch=fullResearch*0.5;
  const vacResearch=fullResearch;

  rows.forEach(row=>{
    const name=(row.querySelector(".allow-name")?.value||"").trim();
    const sem=row.querySelector(".allow-semester");
    const vac=row.querySelector(".allow-vacation");
    if(!sem||!vac)return;

    if(name==="정액급식비"){
      sem.value=MEAL_4H;
      vac.value=MEAL_8H;
    }else if(name==="교직수당"){
      sem.value=TEACH_ALLOW_4H;
      vac.value=TEACH_ALLOW_8H;
    }else if(name==="가족수당"){
      if(fullFamily>0){
        sem.value=floorTo10(semFamily);
        vac.value=floorTo10(vacFamily);
      }else{
        sem.value="";
        vac.value="";
      }
    }else if(name==="교원연구비"){
      if(fullResearch>0){
        sem.value=floorTo10(semResearch);
        vac.value=floorTo10(vacResearch);
      }else{
        sem.value="";
        vac.value="";
      }
    }
  });
}

// 기본급·수당 → 시간당 단가 (일할계산은 별도에서 처리)
function buildBasePay(){
  const base8=toNumber($("basePay8")?.value);
  if(!base8)return null;

  const base4Sem=base8/2;
  const base8Vac=base8;

  applyAutoAllowances();

  let allowSem=0,allowVac=0;
  document.querySelectorAll(".allowance-row").forEach(r=>{
    allowSem+=toNumber(r.querySelector(".allow-semester")?.value);
    allowVac+=toNumber(r.querySelector(".allow-vacation")?.value);
  });

  const semMonthHours=WEEK_HOURS_SEM*WEEK_TO_MONTH;
  const vacMonthHours=WEEK_HOURS_VAC*WEEK_TO_MONTH;

  return{
    base8,base4Sem,base8Vac,
    semHour:(base4Sem+allowSem)/semMonthHours,
    vacHour:(base8Vac+allowVac)/vacMonthHours,
    allowSem,allowVac,
    semMonthHours,vacMonthHours
  };
}

// 날짜 구간
const DAY_SEM="SEM",DAY_VAC="VAC",DAY_NOAF="NOAF";

function buildRanges(selector,sClass,eClass){
  const arr=[];
  document.querySelectorAll(selector).forEach(r=>{
    const s=parseDate(r.querySelector("."+sClass)?.value);
    const e=parseDate(r.querySelector("."+eClass)?.value);
    if(s&&e&&e>=s)arr.push({start:s,end:e});
  });
  return arr;
}
function inRange(d,ranges){
  const t=d.getTime();
  return ranges.some(r=>t>=r.start&&t<=r.end);
}

// 2단계: 월별 일수
function buildMonthTable(){
  const s=parseDate($("contractStart")?.value);
  const e=parseDate($("contractEnd")?.value);
  const msg=$("monthError"),wrap=$("monthTableWrap");
  msg.textContent="";wrap.innerHTML="";
  if(!s||!e||e<s){msg.textContent="근로계약 시작·종료일자를 정확히 입력하세요.";return;}

  const vac=buildRanges("#vacationBody tr","vac-start","vac-end");
  const noAf=buildRanges("#noAfBody tr","noaf-start","noaf-end");

  const map=new Map();
  let cur=new Date(s.getTime());
  while(cur<=e){
    const ym=`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}`;
    if(!map.has(ym))map.set(ym,{sem:0,vac:0,noaf:0});
    const cell=map.get(ym);

    // 방과후 미운영(4h) > 방학(8h) > 학기중
    if(inRange(cur,noAf)) cell.noaf++;
    else if(inRange(cur,vac)) cell.vac++;
    else cell.sem++;

    cur.setDate(cur.getDate()+1);
  }

  let html=`<div class="table-wrap"><table><thead><tr>
  <th>월</th><th>학기중(4h)</th><th>방학(8h)</th><th>미운영(4h)</th>
  </tr></thead><tbody>`;
  [...map.keys()].sort().forEach(ym=>{
    const d=map.get(ym);
    html+=`<tr class="month-row" data-month="${ym}">
      <td>${ym}</td>
      <td><input type="number" class="sem-days" value="${d.sem}" /></td>
      <td><input type="number" class="vac-days" value="${d.vac}" /></td>
      <td><input type="number" class="noaf-days" value="${d.noaf}" /></td>
    </tr>`;
  });
  html+="</tbody></table></div>";
  wrap.innerHTML=html;
}

// 정근수당 연 단위 일할계산
function autoFillAnnualLongevityBySchedule(){
  const base=toNumber($("longevityBaseAnnual")?.value);
  if(!base)return;
  const rows=document.querySelectorAll(".month-row");
  if(!rows.length)return;

  let days=0;
  rows.forEach(r=>{
    days+=toNumber(r.querySelector(".sem-days")?.value)
        +toNumber(r.querySelector(".vac-days")?.value)
        +toNumber(r.querySelector(".noaf-days")?.value);
  });
  if(!days)return;

  const amt=floorTo10(base*(days/365));
  document.querySelectorAll(".annual-row").forEach(r=>{
    const nm=(r.querySelector(".annual-name")?.value||"").trim();
    if(nm==="정근수당"){
      const el=r.querySelector(".annual-amount");
      if(el)el.value=amt;
    }
  });
}

// 3단계: 월별 인건비 + 기관부담 + 퇴직금 + 수당별 합계
// → 월별 달력일수 기준 일할계산(주말 포함)
function calcMonthly(){
  const base=buildBasePay();
  const err=$("calcError"),wrap=$("resultWrap");
  err.textContent="";wrap.innerHTML="";
  if(!base){err.textContent="1단계를 먼저 실행하세요.";return;}

  const monthRows=document.querySelectorAll(".month-row");
  if(!monthRows.length){err.textContent="2단계를 먼저 실행하세요.";return;}

  // 정근수당 일할계산 반영
  autoFillAnnualLongevityBySchedule();

  // 기관부담 비율
  const R_PEN=0.045;
  const R_HEAL=0.03545;
  const R_LTC=0.1267*R_HEAL;
  const R_EMP=0.0175;
  const R_IND=0.00966; // 산재보험 0.966%

  // 기본급 월액 (4시간, 8시간)
  const baseMonth4 = base.base4Sem;  // 학기중 4시간 기준 월봉급
  const baseMonth8 = base.base8Vac;  // 방학중 8시간 기준 월봉급

  // 수당별 월액 데이터
  const allowanceDefs=[];
  document.querySelectorAll(".allowance-row").forEach(row=>{
    const name=(row.querySelector(".allow-name")?.value||"").trim();
    if(!name)return;
    const semBase=toNumber(row.querySelector(".allow-semester")?.value);  // 4시간 기준 월액
    const vacBase=toNumber(row.querySelector(".allow-vacation")?.value);  // 8시간 기준 월액
    if(!semBase && !vacBase)return;

    allowanceDefs.push({
      name,
      semBase,
      vacBase,
      total:0
    });
  });

  let totalW=0,totalA=0,totalINS=0,totalDays=0;
  let annualTotal=0;
  document.querySelectorAll(".annual-row").forEach(r=>{
    annualTotal+=toNumber(r.querySelector(".annual-amount")?.value);
  });
  const monthCount=monthRows.length;
  const perMonthAnnual=floorTo10(monthCount?annualTotal/monthCount:0);

  let rowsHtml="";
  monthRows.forEach(r=>{
    const ym=r.getAttribute("data-month")||"";
    const sem=toNumber(r.querySelector(".sem-days")?.value);   // 학기중(4h)
    const vac=toNumber(r.querySelector(".vac-days")?.value);   // 방학(8h)
    const noaf=toNumber(r.querySelector(".noaf-days")?.value); // 방과후 미운영(4h)
    const semDays = sem + noaf;  // 4시간 기준 일수
    const vacDays = vac;         // 8시간 기준 일수

    // 해당 월 달력일수 (주말 포함)
    let monthDays=0;
    if(ym){
      const [yStr,mStr]=ym.split("-");
      const year=Number(yStr);
      const month=Number(mStr); // 1~12
      if(year && month){
        monthDays=new Date(year,month,0).getDate();
      }
    }
    if(!monthDays){
      // 혹시라도 ym 파싱 실패하면 그냥 해당 월 총 일수로 사용
      monthDays = semDays + vacDays;
    }

    const daySum=semDays+vacDays;
    totalDays+=daySum;

    let wage=0;
    const detailLines=[];

    if(daySum>0 && monthDays>0){
      // 기본급 일할계산: (4h 월급 / 월일수) * 4h일수 + (8h 월급 / 월일수) * 8h일수 구조
      const baseDaily4 = baseMonth4 / monthDays;
      const baseDaily8 = baseMonth8 / monthDays;
      const baseAmt = floorTo10(baseDaily4 * semDays + baseDaily8 * vacDays);

      if(baseAmt>0){
        wage += baseAmt;
        detailLines.push(`기본급: ${formatWon(baseAmt)}`);
      }

      // 수당별 일할계산
      allowanceDefs.forEach(a=>{
        const semBaseDaily = a.semBase / monthDays; // 4시간 기준 월액 → 일액
        const vacBaseDaily = a.vacBase / monthDays; // 8시간 기준 월액 → 일액
        const amt = floorTo10(semBaseDaily * semDays + vacBaseDaily * vacDays);
        if(amt>0){
          wage += amt;
          a.total += amt;
          detailLines.push(`${a.name}: ${formatWon(amt)}`);
        }
      });
    }

    totalW+=wage;
    totalA+=perMonthAnnual;

    const orgP=wage*R_PEN;
    const orgH=wage*R_HEAL;
    const orgL=wage*R_LTC;
    const orgE=wage*R_EMP;
    const orgI=wage*R_IND;
    const orgSum=floorTo10(orgP+orgH+orgL+orgE+orgI);
    totalINS+=orgSum;

    const detailHtml = detailLines.length
      ? detailLines.join("<br/>")
      : "지급 없음";

    rowsHtml+=`<tr>
      <td>${ym}</td>
      <td>${sem}</td>
      <td>${vac}</td>
      <td>${noaf}</td>
      <td>${formatWon(wage)}</td>
      <td style="text-align:left;font-size:0.9rem;line-height:1.4;">${detailHtml}</td>
      <td>${formatWon(perMonthAnnual)}</td>
      <td>${formatWon(wage+perMonthAnnual)}</td>
      <td>${formatWon(orgSum)}</td>
    </tr>`;
  });

  const totalIncome=totalW+totalA;

  // 월별 인건비/기관부담 테이블 (기본급·수당 내역 열 포함)
  wrap.innerHTML=`
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>월</th>
          <th>학기중</th>
          <th>방학</th>
          <th>미운영</th>
          <th>월 임금(합계)</th>
          <th>기본급·수당 내역</th>
          <th>연 단위 분배</th>
          <th>월 총 지급</th>
          <th>사회보험료 기관부담금</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <th colspan="4">합계</th>
          <th>${formatWon(totalW)}</th>
          <th>-</th>
          <th>${formatWon(totalA)}</th>
          <th>${formatWon(totalIncome)}</th>
          <th>${formatWon(totalINS)}</th>
        </tr>
      </tfoot>
    </table>
  </div>
  <p class="hint">
    ·기본급·수당 일할계산은 해당 월 달력일수(주말 포함)를 기준으로 함<br/>
    ·기관부담금 산재보험(0.966%)임. 개발자 근무 학교 기준.
  </p>`;

  // ----- 수당별 기준 월액 & 계약기간 총 지급액 요약 -----
  if(allowanceDefs.length){
    let allowanceRows="";
    allowanceDefs.forEach(a=>{
      allowanceRows+=`
        <tr>
          <td>${a.name}</td>
          <td>${a.semBase?formatWon(a.semBase):"-"}</td>
          <td>${a.vacBase?formatWon(a.vacBase):"-"}</td>
          <td>${a.total?formatWon(a.total):"-"}</td>
        </tr>`;
    });

    wrap.innerHTML+=`
    <div class="table-wrap" style="margin-top:16px;">
      <table>
        <thead>
          <tr>
            <th>수당명</th>
            <th>학기중 기준 월액(4시간)</th>
            <th>방학중 기준 월액(8시간)</th>
            <th>계약기간 총 지급액(일할계산)</th>
          </tr>
        </thead>
        <tbody>
          ${allowanceRows}
        </tbody>
      </table>
    </div>
    <p class="hint">
      ·수당별 계약기간 총 지급액은 학기·방학·방과후 미운영 일수를 반영해 일할계산한 금액. 원단위 절삭<br/>
      ·정근수당 가산금은 입력한 보수월액 기준으로 함
    </p>`;
  }

  // 퇴직금 (1년 이상)
  const s=parseDate($("contractStart")?.value);
  const e=parseDate($("contractEnd")?.value);
  if(s&&e){
    const days=diffDaysInclusive(s,e);
    if(days>=365&&totalDays>0){
      const daily=(totalW+totalA)/totalDays;
      const retire=floorTo10(daily*30);
      wrap.innerHTML+=`
      <div class="card">
        <h3 style="margin-top:0;font-size:15px;">퇴직금 대충 산정 (계속근로 1년 이상)</h3>
        <p class="hint">
          ·계약기간 달력일수: ${days}일 기준<br/>
          ·계약기간 전체 임금을 달력일수로 나눈 1일 평균임금 *30일. 원단위 절삭
        </p>
        <p><b>예상 퇴직금(개략): ${formatWon(retire)}</b></p>
      </div>`;
    }else{
      wrap.innerHTML+=`
      <div class="card">
        <h3 style="margin-top:0;font-size:15px;">퇴직금 개략 산정</h3>
        <p>계약기간이 1년 미만(달력일수 ${days}일)으로 퇴직금 지급 대상이 아닐 수 있음</p>
      </div>`;
    }
  }
}

// 행 추가
function addAllowanceRow(){
  $("allowanceBody").insertAdjacentHTML("beforeend",`
<tr class="allowance-row">
  <td><input type="text" class="allow-name" placeholder="수당명" /></td>
  <td><input type="number" class="allow-semester" placeholder="0" /></td>
  <td><input type="number" class="allow-vacation" placeholder="0" /></td>
</tr>`);
}
function addAnnualRow(){
  $("annualBody").insertAdjacentHTML("beforeend",`
<tr class="annual-row">
  <td><input type="text" class="annual-name" placeholder="수당명" /></td>
  <td><input type="number" class="annual-amount" placeholder="0" /></td>
</tr>`);
}
function addVacRow(){
  $("vacationBody").insertAdjacentHTML("beforeend",`
<tr class="vac-row">
  <td><input type="date" class="vac-start" /></td>
  <td><input type="date" class="vac-end" /></td>
  <td><input type="text" class="vac-note" placeholder="예: 여름방학" /></td>
</tr>`);
}
function addNoAfRow(){
  $("noAfBody").insertAdjacentHTML("beforeend",`
<tr class="noaf-row">
  <td><input type="date" class="noaf-start" /></td>
  <td><input type="date" class="noaf-end" /></td>
  <td><input type="text" class="noaf-note" placeholder="예: 여름방학 중 방과후 미운영기간" /></td>
</tr>`);
}

// 구비서류(간략)
const DOC_GUIDES={
  "time-part":[
    "교원자격증 사본 또는 자격인정조서",
    "행정정보공동이용 사전동의서",
    "경력증명서(해당자)",
    "호봉획정을 위한 경력기간 합산신청서(해당자, 본인 작성)",
    "성범죄·아동학대 관련 범죄경력 조회 동의서",
    "장애인학대관련범죄 등 경력 조회 동의서(특수학교·특수학급 해당)",
    "가족 채용 제한 여부 확인서",
    "공무원채용신체검사서 또는 건강검진 결과서",
    "주민등록초본(병적사항 기재, 해당자)",
    "마약류 중독 여부 검사 결과 통보서",
    "최종학력증명서, 사진, 개인정보 이용·제공 동의서 등"
  ],
  "retired":[
    "개인정보 이용·제공 동의서",
    "성범죄·아동학대 관련 범죄경력 조회 동의서",
    "장애인학대관련범죄 등 경력 조회 동의서(특수학교·특수학급 해당)",
    "가족 채용 제한 여부 확인서",
    "일반채용신체검사서 또는 건강검진 결과 통보서",
    "경력증명서(과목 명시)",
    "호봉획정을 위한 경력기간 합산신청서(해당자, 본인 작성)",
    "마약류 중독 여부 검사 결과 통보서"
  ]
};
function renderDocGuide(){
  const key=$("docTypeSelect")?.value||"time-part";
  const arr=DOC_GUIDES[key]||[];
  $("docGuide").innerHTML=arr.length
    ?`<ul>${arr.map(t=>`<li>${t}</li>`).join("")}</ul>`
    :'<p class="hint">구비서류 안내 데이터가 없습니다.</p>';
}

// DOM 로딩 후 이벤트
document.addEventListener("DOMContentLoaded",()=>{
  const base8Input=$("basePay8");
  const stepSelect=$("stepSelect");

  // 호봉 선택
  stepSelect?.addEventListener("change",()=>{
    const step=stepSelect.value;
    if(typeof TeacherStepCore!=="undefined"&&step){
      const pay=TeacherStepCore.getMonthlyBasePay8h(step);
      if(pay)base8Input.value=pay;
    }
    const b=buildBasePay();
    $("basePay4Sem").value=b?Math.round(b.base4Sem):"";
    $("basePay8Vac").value=b?Math.round(b.base8Vac):"";
  });

  // 기본급 직접 수정
  base8Input?.addEventListener("input",()=>{
    const b=buildBasePay();
    $("basePay4Sem").value=b?Math.round(b.base4Sem):"";
    $("basePay8Vac").value=b?Math.round(b.base8Vac):"";
  });

  // 1단계 버튼
  $("stepBaseBtn")?.addEventListener("click",()=>{
    const b=buildBasePay();
    $("basePay4Sem").value=b?Math.round(b.base4Sem):"";
    $("basePay8Vac").value=b?Math.round(b.base8Vac):"";
  });

  // 월별 수당 자동 채우기 버튼
  $("applyAllowBtn")?.addEventListener("click",()=>{
    const b=buildBasePay(); // 내부에서 applyAutoAllowances 호출
    $("basePay4Sem").value=b?Math.round(b.base4Sem):"";
    $("basePay8Vac").value=b?Math.round(b.base8Vac):"";
  });

  // 정근수당 일할계산 버튼
  $("calcLongevityBtn")?.addEventListener("click",()=>{
    autoFillAnnualLongevityBySchedule();
  });

  $("addAllowBtn")?.addEventListener("click",addAllowanceRow);
  $("addAnnualBtn")?.addEventListener("click",addAnnualRow);
  $("addVacBtn")?.addEventListener("click",addVacRow);
  $("addNoAfBtn")?.addEventListener("click",addNoAfRow);

  $("buildMonthBtn")?.addEventListener("click",buildMonthTable);
  $("calcBtn")?.addEventListener("click",calcMonthly);

  // 경력·자녀·배우자 변경 시 기본값 재계산
  ["careerYears","careerMonths","careerDays","childThirdCount"].forEach(id=>{
    $(id)?.addEventListener("input",()=>{
      const b=buildBasePay();
      $("basePay4Sem").value=b?Math.round(b.base4Sem):"";
      $("basePay8Vac").value=b?Math.round(b.base8Vac):"";
    });
  });
  ["spouseFlag","firstChildFlag","secondChildFlag","thirdChildFlag"].forEach(name=>{
    document.querySelectorAll(`input[name="${name}"]`).forEach(el=>{
      el.addEventListener("change",()=>{
        const b=buildBasePay();
        $("basePay4Sem").value=b?Math.round(b.base4Sem):"";
        $("basePay8Vac").value=b?Math.round(b.base8Vac):"";
      });
    });
  });

  // 구비서류
  $("docTypeSelect")?.addEventListener("change",renderDocGuide);
  renderDocGuide();
});
