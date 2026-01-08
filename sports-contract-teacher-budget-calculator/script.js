// 스포츠강사 인건비 계산기
// 어휴 씨 좆같은 새끼들


function $(id){ return document.getElementById(id); }

// 숫자 파싱
function num(id){
  const el = $(id); if(!el) return 0;
  const raw = (el.value||"").toString().replace(/,/g,"").trim();
  const n = Number(raw);
  return isNaN(n)?0:n;
}

// 퍼센트 → 소수
function numPercent(id){
  const el = $(id); if(!el) return 0;
  const raw = (el.value||"").toString().replace(/,/g,"").trim();
  const n = Number(raw);
  return isNaN(n)?0:n/100;
}

// 10원 절삭 (1111 → 1110)
function round10(v){
  const n = Number(v)||0;
  return Math.floor(n/10)*10;
}

// 원화 표기
function won(v){
  if(isNaN(v)) return "-";
  return v.toLocaleString("ko-KR")+"원";
}

// ----------------------------------------------------
// 사회보험 부과 기준 보수 행추가 영역
// ----------------------------------------------------
function addInsBaseRow(){
  const tbody = $("insBaseRows");
  if(!tbody) return;
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>
      <select class="ins-name-select">
        <option value="">항목 선택</option>
        <option value="기본급">기본급</option>
        <option value="정액급식비">정액급식비</option>
        <option value="직무수당">직무수당</option>
        <option value="기타수당">기타수당</option>
      </select>
      <input type="text" class="ins-name-input" placeholder="직접 입력" style="margin-top:3px;" />
    </td>
    <td>
      <input type="number" class="ins-base-money" placeholder="금액" />
    </td>
    <td>
      <button type="button" class="btn-lightgrey ins-row-del">삭제</button>
    </td>
  `;
  tbody.appendChild(tr);

  tr.querySelector(".ins-row-del").addEventListener("click", ()=>{
    tr.remove();
    calcInsBaseTotal();
    calc(); // 삭제 후 즉시 반영
  });

  // 값 바뀌면 실시간 반영
  tr.querySelector(".ins-base-money").addEventListener("input", ()=>{
    calcInsBaseTotal(); calc();
  });
  tr.querySelector(".ins-name-select").addEventListener("change", ()=>{
    calcInsBaseTotal(); calc();
  });
  tr.querySelector(".ins-name-input").addEventListener("input", ()=>{
    calcInsBaseTotal(); calc();
  });

  calcInsBaseTotal();
}

// 부과 기준 보수 합계
function calcInsBaseTotal(){
  const rows = document.querySelectorAll("#insBaseRows tr");
  let sum=0;
  rows.forEach(tr=>{
    const moneyEl = tr.querySelector(".ins-base-money");
    const raw = (moneyEl.value||"").replace(/,/g,"");
    const v = Number(raw);
    if(!isNaN(v)) sum+=v;
  });
  $("insBaseTotalDisplay").textContent = won(sum);
  return sum;
}

// ----------------------------------------------------
// 근속수당 월별 테이블 생성
// ----------------------------------------------------
function buildSeniorityByMonth(singleValue, changed, changeN, beforeValue, afterValue){
  const months=[3,4,5,6,7,8,9,10,11,12,1,2];
  const r={};
  if(!changed){
    months.forEach(m=>r[m]=singleValue);
  }else{
    months.forEach(m=>{
      r[m] = (m>=3 && m<=changeN) ? beforeValue : afterValue;
    });
  }
  return r;
}

// 변경 전 가정(연중 동일)
function buildSeniorityBeforeByMonth(singleValue, changed, changeN, beforeValue){
  const months=[3,4,5,6,7,8,9,10,11,12,1,2];
  const r={};
  if(!changed){
    months.forEach(m=>r[m]=singleValue);
  }else{
    months.forEach(m=>r[m]=beforeValue);
  }
  return r;
}

// ----------------------------------------------------
// 메인 계산
// ----------------------------------------------------
function calc(){
  // 1) 월정 보수
  const basic=num("basicPay"), meal=num("mealAllowance"), family=num("familyAllowance"), other=num("otherMonthly");

  const senChanged = $("seniorityChanged").checked;
  let senSingle=0, senBefore=0, senAfter=0;
  let changeN=12;

  if(senChanged){
    changeN = Number($("seniorityChangeMonth").value)||12;
    senBefore=num("seniorityBefore");
    senAfter=num("seniorityAfter");
  }else{
    senSingle=num("senioritySingle");
  }

  const seniorityByMonth=buildSeniorityByMonth(senSingle,senChanged,changeN,senBefore,senAfter);
  const seniorityBeforeByMonth=buildSeniorityBeforeByMonth(senSingle,senChanged,changeN,senBefore);

  const months=[3,4,5,6,7,8,9,10,11,12,1,2];
  let annualFixed=0, annualSen=0;
  const monthlyBase={}, monthlyBaseBefore={};

  months.forEach(m=>{
    const sen=seniorityByMonth[m]||0;
    const senB=seniorityBeforeByMonth[m]||0;
    monthlyBase[m]=basic+meal+family+other+sen;
    monthlyBaseBefore[m]=basic+meal+family+other+senB;
    annualFixed+= monthlyBase[m];
    annualSen+=sen;
  });
  $("monthlyFixedDisplay").textContent=won(annualFixed/12);

  // 2) 연단위 지급
  const holiday1=num("holiday1Amount"), h1m=Number($("holiday1Month").value);
  const holiday2=num("holiday2Amount"), h2m=Number($("holiday2Month").value);
  const bonus=num("bonusAmount"), bM=Number($("bonusMonth").value);
  const welfare=num("welfareAmount"), wM=Number($("welfareMonth").value);
  const useHealth= $("healthUse").checked;
  const healthAmt = useHealth?num("healthAmount"):0;
  const hM2=Number($("healthMonth").value);

  const monthlyExtra={}; for(let i=1;i<=12;i++) monthlyExtra[i]=0;
  function addX(m,v){ if(v>0) monthlyExtra[m]+=v; }

  addX(h1m,holiday1); addX(h2m,holiday2);
  addX(bM,bonus); addX(wM,welfare);
  if(healthAmt>0) addX(hM2,healthAmt);

  let annualExtras=0; for(let i=1;i<=12;i++) annualExtras+=monthlyExtra[i];
  $("annualExtrasDisplay").textContent=won(annualExtras);

  // 3) 사회보험료 (부과 기준 = 행추가 합산값)
  const baseWage = calcInsBaseTotal();

  const rP=numPercent("insRatePension"),
        rH=numPercent("insRateHealth"),
        rL=numPercent("insRateLongterm"), // 건강보험료 × 비율
        rIn=numPercent("insRateIndustrial"),
        rE=numPercent("insRateEmploy");

  // 장기요양 유효율 (건강보험료 * 비율)
  const effectiveLongRate = rH * rL;

  // 표기용 총합
  const totalRate = rP + rH + effectiveLongRate + rIn + rE;
  $("insRateTotalDisplay").textContent=(totalRate*100).toFixed(3)+"%";

  const insMonthly={};
  let insAnnual=0;

  for(let m=1;m<=12;m++){
    const manual=$("insManualM"+m);
    const inEl=$("insM"+m);
    let v=0;
    if(manual && manual.checked){
      v=num("insM"+m);
    }else{
      const pension=round10(baseWage*rP);
      const health=round10(baseWage*rH);
      const longterm=round10(health*rL);
      const indus=round10(baseWage*rIn);
      const employ=round10(baseWage*rE);
      v=pension+health+longterm+indus+employ;
      if(inEl) inEl.value=v;
    }
    insMonthly[m]=v;
    insAnnual+=v;
  }
  $("insAnnualDisplay").textContent=won(insAnnual);

  // 4) 요약
  const annualWageOnly = annualFixed+annualExtras;
  const annualTotalWithIns = annualWageOnly+insAnnual;
  $("annualFixedDisplay").textContent=won(annualFixed);
  $("annualExtrasDisplay2").textContent=won(annualExtras);
  $("annualTotalDisplay").textContent=won(annualWageOnly);
  $("annualTotalWithInsDisplay").textContent=won(annualTotalWithIns);

  // 통상임금(月)
  const ordinaryMonthly = basic+meal+(annualSen/12)+(holiday1+holiday2)/12 + bonus/12;
  const hourly = Math.floor(ordinaryMonthly/209);
  $("ordinaryMonthlyDisplay").textContent=won(ordinaryMonthly);
  $("ordinaryHourlyDisplay").textContent=isNaN(hourly)?"-":hourly.toLocaleString("ko-KR")+"원";
}

// ----------------------------------------------------
// 근속수당 UI 토글 + 초기행 설정
// ----------------------------------------------------
function setupSeniorityToggle(){
  const chk=$("seniorityChanged"),
        box1=$("senioritySingleBox"),
        box2=$("senioritySplitBox");
  function up(){
    if(chk.checked){ box1.style.display="none"; box2.style.display="block";}
    else{ box1.style.display="block"; box2.style.display="none";}
  }
  chk.addEventListener("change",up); up();
}

// ----------------------------------------------------
// 기본행 1개 추가 (기본급)
function initInsBaseRows(){
  addInsBaseRow();
  // 기본급 자동 선택 / 기초값
  setTimeout(()=>{
    const firstSel=document.querySelector(".ins-name-select");
    const firstInp=document.querySelector(".ins-base-money");
    if(firstSel) firstSel.value="기본급";
    if(firstInp) firstInp.value=num("basicPay");
    calcInsBaseTotal(); calc();
  },50);
}

// ----------------------------------------------------
window.addEventListener("DOMContentLoaded",()=>{
  setupSeniorityToggle();
  $("addInsBaseRow").addEventListener("click",addInsBaseRow);

  const steps=["btnCalcStep1","btnCalcStep2","btnCalcStep3","btnCalcStep3b","btnCalcStep4","btnCalcStep5","btnCalc"];
  steps.forEach(id=>{ if($(id)) $(id).addEventListener("click",calc); });

  initInsBaseRows();
  calc();
});
