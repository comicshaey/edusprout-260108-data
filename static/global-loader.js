// /static/global-loader.js
// 사이트 공통 스크립트 모음 (우클릭 방지)

(function () {
  // -----------------------------
  // 1. 도메인 체크
  //    - 허용한 호스트에서만 보호 기능 켜기
  // -----------------------------
  const host = location.hostname || "";
  const allowed = [
    "edusprouthaey.co.kr",
    "narcolepsyhaeyisking.co.kr",
    "localhost",
    "127.0.0.1"
  ];

  if (!allowed.includes(host)) {
    // 다른 도메인에서는 그냥 바로 종료
    return;
  }

  // -----------------------------
  // 2. 보호 모드 표시 (선택 사항)
  //    - 제목 뒤에 점 하나 찍어서 티만 살짝 내기
  // -----------------------------
  try {
    document.title += " •";
  } catch (_) {}


  // -----------------------------
  // 3. 우클릭 / 선택 / 드래그 막기
  // -----------------------------
  const stop = e => e.preventDefault();

  document.addEventListener("contextmenu", stop, {
    capture: true,
    passive: false
  });

  document.addEventListener("selectstart", stop, {
    capture: true,
    passive: false
  });

  document.addEventListener("dragstart", stop, {
    capture: true,
    passive: false
  });

  // -----------------------------
  // 4. 주요 단축키 막기
  //    - F12, Ctrl+U, Ctrl+S, Ctrl+C, Ctrl+Shift+I 등
  // -----------------------------
  document.addEventListener(
    "keydown",
    e => {
      const k = (e.key || "").toLowerCase();

      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return;
      }

      // Ctrl + (U, S, C, A, P, I, J, K)
      if (e.ctrlKey && ["u", "s", "c", "a", "p", "i", "j", "k"].includes(k)) {
        e.preventDefault();
        return;
      }

      // Ctrl + Shift + (I, J, C, K)
      if (
        e.ctrlKey &&
        e.shiftKey &&
        ["i", "j", "c", "k"].includes(k)
      ) {
        e.preventDefault();
        return;
      }
    },
    true
  );

  // -----------------------------
  // 5. 텍스트 선택 / 복사 방지
  // -----------------------------
  document.documentElement.style.userSelect = "none";

  document.addEventListener(
    "copy",
    e => {
      e.preventDefault();
    },
    true
  );

  // -----------------------------
  // 6. 콘솔(DevTools) 감지해서 새로고침하는 옵션
  //    - 기본은 꺼둠. 필요하면 true로 변경.
  // -----------------------------
  const DEVTOOLS_RELOAD = false;

  if (DEVTOOLS_RELOAD) {
    setInterval(() => {
      const t = Date.now();
      // debugger에서 멈추면 시간 차이가 크게 나므로 감지 가능
      // eslint-disable-next-line no-debugger
      debugger;
      const d = Date.now() - t;
      if (d > 120) {
        location.reload();
      }
    }, 2000);
  }

  // -----------------------------
  // 7. 공통 로딩 관련 훅 (지금은 자리만 잡아둠)
  //    - 나중에 로딩 스피너, 공통 알람 등 넣고 싶으면 여기 활용
  // -----------------------------
  // window.addEventListener("load", () => {
  //   console.log("global-loader.js loaded");
  // });

})();
