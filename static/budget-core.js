// /static/budget-core.js
// 부서별 본예산 계산기 공통 유틸
// - 통화 포맷
// - 카테고리별 합계 → 요약 블록 생성
// 너무 추상화하지 말고, 딱 자주 쓰는 것만 모아둔 정도로 유지

(function (global) {
  const BudgetCore = {};

  // 숫자를 "1,234원" 같은 형태로 포맷
  BudgetCore.fmtMoney = function (v) {
    if (v == null || isNaN(v) || !isFinite(v)) return "-";
    return Number(v).toLocaleString("ko-KR") + "원";
  };

  // 카테고리별 합계를 받아서 요약 HTML 문자열을 만들어주는 헬퍼
  // cats: [{ value, label }]
  // catSum: { [value]: number }
  // total: number
  // options.title: 상단 제목 문구
  // options.totalLabel: 총계 라벨 문구
  BudgetCore.buildCategorySummaryHtml = function (cats, catSum, total, options) {
    const opts = options || {};
    const title = opts.title || "카테고리별 소계";
    const totalLabel = opts.totalLabel || "총 소요 예산";

    const lines = [];
    lines.push(`<p><b>${title}</b></p>`);

    cats.forEach((c) => {
      const sum = catSum[c.value] || 0;
      if (sum > 0) {
        lines.push(`<p>· ${c.label}: <b>${BudgetCore.fmtMoney(sum)}</b></p>`);
      } else {
        lines.push(`<p>· ${c.label}: 0원</p>`);
      }
    });

    lines.push("<hr>");
    lines.push(
      `<p><b>${totalLabel}</b> = <b>${BudgetCore.fmtMoney(total)}</b></p>`
    );

    return lines.join("");
  };

  // 초기화용 공통 confirm 핸들러
  // initFn: 실제 초기화 함수
  BudgetCore.bindClearAll = function (button, initFn, message) {
    if (!button || typeof initFn !== "function") return;
    const msg = message || "모든 행을 삭제하시겠습니까?";
    button.addEventListener("click", () => {
      if (!confirm(msg)) return;
      initFn();
    });
  };

  // 전역 노출
  global.BudgetCore = BudgetCore;
})(window);
