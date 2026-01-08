// app.js
// 교육공무직 통상임금 계산기 전용 스크립트
// 코어 모듈에 DOM id들만 넘겨서 초기화

document.addEventListener('DOMContentLoaded', () => {
  OrdinaryWageCore.initCalculator({
    ids: {
      job:       'job',
      calcDate:  'calcDate',
      startDate: 'startDate',
      years:     'years',
      yearsMode: 'yearsMode',
      allowBox:  'allowBox',
      outBase:   'outBase',
      outTenure: 'outTenure',
      outSum:    'outSum',
      outHourly: 'outHourly',
      resetBtn:  'resetBtn',
      note:      'note'
    },
    // 꼭 필요하면 수당 목록 커스터마이징 가능. 기본은 DEFAULT_ALLOWANCE_NAMES 사용.
    // allowanceNames: ["정액급식비","위험수당", ...],

    // 여기에 추가 계산 붙이면, 다른 계산기에서 재활용 가능
    onCalculated(ctx){
      // ctx 안에 들어있는 값들:
      // ctx.job          : 현재 직종 객체
      // ctx.base         : 기본급
      // ctx.tenureAmount : 근속수당
      // ctx.allowMap     : 수당별 월 금액 map
      // ctx.sum          : 통상임금 산정대상 합계
      // ctx.hourly       : 통상임금 시급
      // 필요하면 콘솔 찍어보면서 확인하면 됨.
      // console.log('[통상임금] ctx:', ctx);
    }
  }).catch(e=>{
    console.error('[ordinary-wage-core] 초기화 오류:', e);
    const jobSel = document.getElementById('job');
    if(jobSel) jobSel.innerHTML = '<option>초기화 실패 (F12 Console 확인)</option>';
  });
});
