
let lastDraggedType = null;
let lastDraggedIcon = null;
let lastDraggedFromCell = null;
let lastDraggedName = null;
let currentLevel = null;

let isWireDrawing = false;
let isMouseDown = false;
let wireTrace = [];     // 드래그 경로
let GRID_ROWS = 6;
let GRID_COLS = 6;
let wires = [];  // { path, start, end } 객체를 저장할 배열

// CSS 애니메이션 한 주기(1초) 만큼 녹화하기 위해 사용
const WIRE_ANIM_DURATION = 1000; // ms

// --- 모바일 터치 기반 드래그 지원 폴리필 ---
function enableTouchDrag() {
  let dragEl = null;
  const data = {};
  const dt = {
    setData: (t, v) => data[t] = v,
    getData: t => data[t]
  };

  document.addEventListener('touchstart', e => {
    const target = e.target.closest('[draggable="true"]');
    if (!target) return;
    dragEl = target;
    data.text = '';
    const ev = new Event('dragstart', { bubbles: true });
    ev.dataTransfer = dt;
    target.dispatchEvent(ev);
  });

  document.addEventListener('touchmove', e => {
    if (!dragEl) return;
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el) {
      const over = new Event('dragover', { bubbles: true });
      over.dataTransfer = dt;
      el.dispatchEvent(over);
    }
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (!dragEl) return;
    const t = e.changedTouches[0];
    let dropTarget = document.elementFromPoint(t.clientX, t.clientY);

    // 드롭 가능 요소만 허용
    if (dropTarget) {
      const cell  = dropTarget.closest('.cell');
      const trash = dropTarget.closest('.trash-area');
      if (cell) {
        // ctrl 키가 눌린 상태에서 블록이 없는 셀이라면 취소
        if (!(e.ctrlKey && (!cell.dataset.type || cell.dataset.type === 'WIRE'))) {
          dropTarget = cell;
        } else {
          dropTarget = null;
        }
      } else if (trash) {
        dropTarget = trash;
      } else {
        dropTarget = null;
      }
    }

    if (dropTarget) {
      const dropEv = new Event('drop', { bubbles: true });
      dropEv.dataTransfer = dt;
      dropTarget.dispatchEvent(dropEv);
    }

    const endEv = new Event('dragend', { bubbles: true });
    endEv.dataTransfer = dt;
    dragEl.dispatchEvent(endEv);
    dragEl = null;
  });
}



const levelTitles = {
  1: "NOT gate",
  2: "OR gate",
  3: "AND gate",
  4: "NOR gate",
  5: "NAND gate",
  6: "XOR gate",
  7: "Majority gate",
  8: "Parity checker", 9: "Half Adder",
  10: "Full Adder",
  11: "2-to-4 Decoder",
  12: "4-to-1 MUX"
};

const levelGridSizes = {
  1: [6, 6],
  2: [6, 6],
  3: [6, 6],
  4: [6, 6],
  5: [6, 6],
  6: [6, 6],
  7: [6, 6],
  8: [8, 10],
  9: [8, 10],
  10: [10, 10],
  11: [10, 10],
  12: [12, 12]
};



const levelBlockSets = {
  "1": [  // NOT gate
    { type: "INPUT", name: "IN1" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "NOT" }
  ],
  "2": [  // OR gate
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "OR" }
  ],
  "3": [  // AND gate
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "AND" }
  ],
  "4": [  // NOR = NOT(OR)
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "OR" },
    { type: "NOT" }
  ],
  "5": [  // NAND = NOT(AND)
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "AND" },
    { type: "NOT" }
  ],
  "6": [  // XOR = (A ∧ ¬B) ∨ (¬A ∧ B)
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "AND" },
    { type: "NOT" },
    { type: "OR" }
  ],
  "7": [  // Majority = (A∧B)∨(A∧C)∨(B∧C)
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "INPUT", name: "IN3" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "AND" },
    { type: "OR" },
    { type: "JUNCTION" }
  ],

  "8": [  // Parity = IN1 ⊕ IN2 ⊕ IN3 (XOR XOR)
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "INPUT", name: "IN3" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "AND" },
    { type: "OR" },
    { type: "NOT" },
    { type: "JUNCTION" }
  ],

  "9": [  // Half Adder: Sum = A⊕B, Carry = A∧B
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "OUTPUT", name: "OUT1" },  // Sum
    { type: "OUTPUT", name: "OUT2" },  // Carry
    { type: "AND" },
    { type: "NOT" },
    { type: "OR" },
    { type: "JUNCTION" }
  ],

  "10": [  // Full Adder: Sum = A⊕B⊕Cin, Carry = majority(A,B,Cin)
    { type: "INPUT", name: "IN1" },  // A
    { type: "INPUT", name: "IN2" },  // B
    { type: "INPUT", name: "IN3" },  // Cin
    { type: "OUTPUT", name: "OUT1" },  // Sum
    { type: "OUTPUT", name: "OUT2" },  // Carry
    { type: "AND" },
    { type: "NOT" },
    { type: "OR" },
    { type: "JUNCTION" }
  ],

  "11": [  // 2-to-4 Decoder
    { type: "INPUT", name: "IN1" },
    { type: "INPUT", name: "IN2" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "OUTPUT", name: "OUT2" },
    { type: "OUTPUT", name: "OUT3" },
    { type: "OUTPUT", name: "OUT4" },
    { type: "NOT" },
    { type: "AND" },
    { type: "OR" },
    { type: "JUNCTION" }
  ],

  "12": [  // 4-to-1 MUX: 선택신호 IN5(IN S1), IN6(IN S0)
    { type: "INPUT", name: "IN1" },  // D0
    { type: "INPUT", name: "IN2" },  // D1
    { type: "INPUT", name: "IN3" },  // D2
    { type: "INPUT", name: "IN4" },  // D3
    { type: "INPUT", name: "S1" },  // S1
    { type: "INPUT", name: "S0" },  // S0
    { type: "OUTPUT", name: "OUT1" },
    { type: "NOT" },
    { type: "AND" },
    { type: "OR" },
    { type: "JUNCTION" }
  ]
};

const chapterData = [
  {
    id: "basic",
    name: "기초 논리 게이트",
    desc: "NOT, AND, OR 등 기본 게이트를 연습합니다.",
    stages: [1, 2, 3, 4, 5, 6]
  },
  {
    id: "advanced",
    name: "조합 논리 회로",
    desc: "Half Adder, MUX 등 복합 회로를 학습합니다.",
    stages: [7, 8, 9, 10, 11, 12]
  },
  {
    id: "user",
    name: "사용자 정의 회로",
    desc: "직접 만든 회로를 공유하고 도전해보세요!",
    stages: []
  }
];


const levelAnswers = {
  1: [ // NOT gate: OUT1 = !IN1
    { inputs: { IN1: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1 }, expected: { OUT1: 0 } }
  ],
  2: [ // OR gate
    { inputs: { IN1: 0, IN2: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1 }, expected: { OUT1: 1 } }
  ],
  3: [ // AND gate
    { inputs: { IN1: 0, IN2: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 1 }, expected: { OUT1: 1 } }
  ],
  4: [ // NOR gate
    { inputs: { IN1: 0, IN2: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 1 }, expected: { OUT1: 0 } }
  ],
  5: [ // NAND gate
    { inputs: { IN1: 0, IN2: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1 }, expected: { OUT1: 0 } }
  ],
  6: [ // XOR gate
    { inputs: { IN1: 0, IN2: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1 }, expected: { OUT1: 0 } }
  ],
  7: [
    { inputs: { IN1: 0, IN2: 0, IN3: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1 }, expected: { OUT1: 1 } }
  ],
  8: [
    { inputs: { IN1: 0, IN2: 0, IN3: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1 }, expected: { OUT1: 1 } }
  ],
  9: [
    { inputs: { IN1: 0, IN2: 0 }, expected: { OUT1: 0, OUT2: 0 } },
    { inputs: { IN1: 0, IN2: 1 }, expected: { OUT1: 1, OUT2: 0 } },
    { inputs: { IN1: 1, IN2: 0 }, expected: { OUT1: 1, OUT2: 0 } },
    { inputs: { IN1: 1, IN2: 1 }, expected: { OUT1: 0, OUT2: 1 } }
  ],
  10: [
    { inputs: { IN1: 0, IN2: 0, IN3: 0 }, expected: { OUT1: 0, OUT2: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1 }, expected: { OUT1: 1, OUT2: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0 }, expected: { OUT1: 1, OUT2: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1 }, expected: { OUT1: 0, OUT2: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0 }, expected: { OUT1: 1, OUT2: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1 }, expected: { OUT1: 0, OUT2: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0 }, expected: { OUT1: 0, OUT2: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1 }, expected: { OUT1: 1, OUT2: 1 } }
  ],
  11: [
    { inputs: { IN1: 0, IN2: 0 }, expected: { OUT1: 1, OUT2: 0, OUT3: 0, OUT4: 0 } },
    { inputs: { IN1: 0, IN2: 1 }, expected: { OUT1: 0, OUT2: 1, OUT3: 0, OUT4: 0 } },
    { inputs: { IN1: 1, IN2: 0 }, expected: { OUT1: 0, OUT2: 0, OUT3: 1, OUT4: 0 } },
    { inputs: { IN1: 1, IN2: 1 }, expected: { OUT1: 0, OUT2: 0, OUT3: 0, OUT4: 1 } }
  ],
  12: [
    { inputs: { IN1: 0, IN2: 0, IN3: 0, IN4: 0, S1: 0, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 0, IN4: 0, S1: 0, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 0, IN4: 0, S1: 1, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 0, IN4: 0, S1: 1, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 0, IN4: 1, S1: 0, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 0, IN4: 1, S1: 0, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 0, IN4: 1, S1: 1, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 0, IN4: 1, S1: 1, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1, IN4: 0, S1: 0, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1, IN4: 0, S1: 0, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1, IN4: 0, S1: 1, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1, IN4: 0, S1: 1, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1, IN4: 1, S1: 0, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1, IN4: 1, S1: 0, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1, IN4: 1, S1: 1, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 0, IN3: 1, IN4: 1, S1: 1, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0, IN4: 0, S1: 0, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0, IN4: 0, S1: 0, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0, IN4: 0, S1: 1, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0, IN4: 0, S1: 1, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0, IN4: 1, S1: 0, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0, IN4: 1, S1: 0, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0, IN4: 1, S1: 1, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 0, IN4: 1, S1: 1, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1, IN4: 0, S1: 0, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1, IN4: 0, S1: 0, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1, IN4: 0, S1: 1, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1, IN4: 0, S1: 1, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1, IN4: 1, S1: 0, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1, IN4: 1, S1: 0, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1, IN4: 1, S1: 1, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 0, IN2: 1, IN3: 1, IN4: 1, S1: 1, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0, IN4: 0, S1: 0, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0, IN4: 0, S1: 0, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0, IN4: 0, S1: 1, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0, IN4: 0, S1: 1, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0, IN4: 1, S1: 0, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0, IN4: 1, S1: 0, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0, IN4: 1, S1: 1, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 0, IN4: 1, S1: 1, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1, IN4: 0, S1: 0, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1, IN4: 0, S1: 0, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1, IN4: 0, S1: 1, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1, IN4: 0, S1: 1, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1, IN4: 1, S1: 0, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1, IN4: 1, S1: 0, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1, IN4: 1, S1: 1, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 0, IN3: 1, IN4: 1, S1: 1, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0, IN4: 0, S1: 0, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0, IN4: 0, S1: 0, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0, IN4: 0, S1: 1, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0, IN4: 0, S1: 1, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0, IN4: 1, S1: 0, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0, IN4: 1, S1: 0, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0, IN4: 1, S1: 1, S0: 0 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 0, IN4: 1, S1: 1, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1, IN4: 0, S1: 0, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1, IN4: 0, S1: 0, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1, IN4: 0, S1: 1, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1, IN4: 0, S1: 1, S0: 1 }, expected: { OUT1: 0 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1, IN4: 1, S1: 0, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1, IN4: 1, S1: 0, S0: 1 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1, IN4: 1, S1: 1, S0: 0 }, expected: { OUT1: 1 } },
    { inputs: { IN1: 1, IN2: 1, IN3: 1, IN4: 1, S1: 1, S0: 1 }, expected: { OUT1: 1 } },
  ],
};

const levelDescriptions = {
  1: {
    title: "Stage 1: NOT 게이트",
    desc: "NOT 게이트는 입력이 1이면 출력이 0, 입력이 0이면 출력이 1이 됩니다.",
    table: [
      { IN1: 0, OUT1: 1 },
      { IN1: 1, OUT1: 0 }
    ]
  },
  2: {
    title: "Stage 2: OR 게이트",
    desc: "OR 게이트는 두 입력 중 하나라도 1이면 출력이 1이 됩니다.",
    table: [
      { IN1: 0, IN2: 0, OUT1: 0 },
      { IN1: 0, IN2: 1, OUT1: 1 },
      { IN1: 1, IN2: 0, OUT1: 1 },
      { IN1: 1, IN2: 1, OUT1: 1 }
    ]
  },
  3: {
    title: "Stage 3: AND 게이트",
    desc: "AND 게이트는 두 입력이 모두 1일 때만 출력이 1이 됩니다.",
    table: [
      { IN1: 0, IN2: 0, OUT1: 0 },
      { IN1: 0, IN2: 1, OUT1: 0 },
      { IN1: 1, IN2: 0, OUT1: 0 },
      { IN1: 1, IN2: 1, OUT1: 1 }
    ]
  },
  4: {
    title: "Stage 4: NOR 게이트",
    desc: "NOR 게이트는 OR 게이트의 출력을 NOT한 결과입니다.",
    table: [
      { IN1: 0, IN2: 0, OUT1: 1 },
      { IN1: 0, IN2: 1, OUT1: 0 },
      { IN1: 1, IN2: 0, OUT1: 0 },
      { IN1: 1, IN2: 1, OUT1: 0 }
    ]
  },
  5: {
    title: "Stage 5: NAND 게이트",
    desc: "NAND 게이트는 AND 게이트의 출력을 NOT한 결과입니다.",
    table: [
      { IN1: 0, IN2: 0, OUT1: 1 },
      { IN1: 0, IN2: 1, OUT1: 1 },
      { IN1: 1, IN2: 0, OUT1: 1 },
      { IN1: 1, IN2: 1, OUT1: 0 }
    ]
  },
  6: {
    title: "Stage 6: XOR 게이트",
    desc: "XOR 게이트는 두 입력이 서로 다를 때만 출력이 1이 됩니다.",
    table: [
      { IN1: 0, IN2: 0, OUT1: 0 },
      { IN1: 0, IN2: 1, OUT1: 1 },
      { IN1: 1, IN2: 0, OUT1: 1 },
      { IN1: 1, IN2: 1, OUT1: 0 }
    ]
  },
  7: {
    title: "Stage 7: Majority 게이트",
    desc: "세 입력 중 2개 이상이 1이면 출력이 1이 됩니다.",
    table: [
      { IN1: 0, IN2: 0, IN3: 0, OUT1: 0 },
      { IN1: 0, IN2: 0, IN3: 1, OUT1: 0 },
      { IN1: 0, IN2: 1, IN3: 0, OUT1: 0 },
      { IN1: 0, IN2: 1, IN3: 1, OUT1: 1 },
      { IN1: 1, IN2: 0, IN3: 0, OUT1: 0 },
      { IN1: 1, IN2: 0, IN3: 1, OUT1: 1 },
      { IN1: 1, IN2: 1, IN3: 0, OUT1: 1 },
      { IN1: 1, IN2: 1, IN3: 1, OUT1: 1 },
    ]
  },

  8: {
    title: "Stage 8: 패리티 검사기",
    desc: "세 입력의 홀수 개가 1이면 출력이 1이 됩니다 (XOR).",
    table: [
      { IN1: 0, IN2: 0, IN3: 0, OUT1: 0 },
      { IN1: 0, IN2: 0, IN3: 1, OUT1: 1 },
      { IN1: 0, IN2: 1, IN3: 0, OUT1: 1 },
      { IN1: 0, IN2: 1, IN3: 1, OUT1: 0 },
      { IN1: 1, IN2: 0, IN3: 0, OUT1: 1 },
      { IN1: 1, IN2: 0, IN3: 1, OUT1: 0 },
      { IN1: 1, IN2: 1, IN3: 0, OUT1: 0 },
      { IN1: 1, IN2: 1, IN3: 1, OUT1: 1 },
    ]
  },

  9: {
    title: "Stage 9: Half Adder",
    desc: "두 입력의 덧셈 결과를 합과 자리올림으로 나눠 출력합니다.",
    table: [
      { IN1: 0, IN2: 0, OUT1: 0, OUT2: 0 },
      { IN1: 0, IN2: 1, OUT1: 1, OUT2: 0 },
      { IN1: 1, IN2: 0, OUT1: 1, OUT2: 0 },
      { IN1: 1, IN2: 1, OUT1: 0, OUT2: 1 },
    ]
  },

  10: {
    title: "Stage 10: Full Adder",
    desc: "세 입력(A, B, 자리올림 입력)을 더한 결과를 출력합니다.",
    table: [
      { IN1: 0, IN2: 0, IN3: 0, OUT1: 0, OUT2: 0 },
      { IN1: 0, IN2: 0, IN3: 1, OUT1: 1, OUT2: 0 },
      { IN1: 0, IN2: 1, IN3: 0, OUT1: 1, OUT2: 0 },
      { IN1: 0, IN2: 1, IN3: 1, OUT1: 0, OUT2: 1 },
      { IN1: 1, IN2: 0, IN3: 0, OUT1: 1, OUT2: 0 },
      { IN1: 1, IN2: 0, IN3: 1, OUT1: 0, OUT2: 1 },
      { IN1: 1, IN2: 1, IN3: 0, OUT1: 0, OUT2: 1 },
      { IN1: 1, IN2: 1, IN3: 1, OUT1: 1, OUT2: 1 },
    ]
  },

  11: {
    title: "Stage 11: 2-to-4 디코더",
    desc: "두 입력으로 4개의 출력 중 하나만 1이 됩니다.",
    table: [
      { IN1: 0, IN2: 0, OUT1: 1, OUT2: 0, OUT3: 0, OUT4: 0 },
      { IN1: 0, IN2: 1, OUT1: 0, OUT2: 1, OUT3: 0, OUT4: 0 },
      { IN1: 1, IN2: 0, OUT1: 0, OUT2: 0, OUT3: 1, OUT4: 0 },
      { IN1: 1, IN2: 1, OUT1: 0, OUT2: 0, OUT3: 0, OUT4: 1 },
    ]
  },

  12: {
    title: "Stage 12: 4-to-1 MUX",
    desc: "선택신호(S1, S0)에 따라 입력 신호 하나를 선택하여 그대로 출력합니다.",
    table: [
      { IN1: 0, IN2: 0, IN3: 0, IN4: 0, S1: 0, S0: 0, OUT1: 0 },
      { IN1: 1, IN2: 0, IN3: 0, IN4: 0, S1: 0, S0: 0, OUT1: 1 },
      { IN1: 0, IN2: 1, IN3: 0, IN4: 0, S1: 0, S0: 1, OUT1: 1 },
      { IN1: 0, IN2: 0, IN3: 1, IN4: 0, S1: 1, S0: 0, OUT1: 1 },
      { IN1: 0, IN2: 0, IN3: 0, IN4: 1, S1: 1, S0: 1, OUT1: 1 },
    ]
  }
};



const validWireShapes = [
  ["wire-up", "wire-down"],
  ["wire-left", "wire-right"],
  ["wire-up", "wire-right"],
  ["wire-right", "wire-down"],
  ["wire-down", "wire-left"],
  ["wire-left", "wire-up"]
];

/***** UI 요소 *****/

const statusToggle  = document.getElementById("wireStatusInfo");
const deleteToggle  = document.getElementById("wireDeleteInfo");
const resetToggle   = document.getElementById("DeleteAllInfo");
const moduleStatusToggle = document.getElementById('moduleWireStatusInfo');
const moduleDeleteToggle = document.getElementById('moduleWireDeleteInfo');
const moduleResetToggle  = document.getElementById('moduleDeleteAllInfo');
let grid;

function simulateKey(key, type = 'keydown') {
  const ev = new KeyboardEvent(type, { key, bubbles: true });
  document.dispatchEvent(ev);
}

function setupKeyToggles() {
  const bindings = [
    [statusToggle, 'Control'],
    [deleteToggle, 'Shift'],
    [resetToggle, 'r'],
    [moduleStatusToggle, 'Control'],
    [moduleDeleteToggle, 'Shift'],
    [moduleResetToggle, 'r']
  ];

  bindings.forEach(([btn, key]) => {
    if (!btn) return;
    if (key.toLowerCase() === 'r') {
      btn.addEventListener('click', () => {
        btn.classList.add('active');
        simulateKey(key, 'keydown');
        simulateKey(key, 'keyup');
        setTimeout(() => btn.classList.remove('active'), 150);
      });
    } else {
      btn.addEventListener('click', () => {
        const active = !btn.classList.contains('active');
        btn.classList.toggle('active', active);
        simulateKey(key, active ? 'keydown' : 'keyup');
      });
    }
  });

  document.addEventListener('keydown', e => {
    bindings.forEach(([btn, key]) => {
      if (e.key === key) {
        btn.classList.add('active');
        if (key.toLowerCase() === 'r') {
          setTimeout(() => btn.classList.remove('active'), 150);
        }
      }
    });
  });

  document.addEventListener('keyup', e => {
    bindings.forEach(([btn, key]) => {
      if (e.key === key && key.toLowerCase() !== 'r') {
        btn.classList.remove('active');
      }
    });
  });
}

// (2) 페이지 로드 시 INPUT 블록 클릭으로 0↔1 토글 준비
//setupInputToggles();

/*--------------------------------------------------
  3.  Grid 셀 생성 + 기본 Drag&Drop
--------------------------------------------------*/


/*--------------------------------------------------
  4.  Wire 드래그 트래킹
--------------------------------------------------*/

// ——— wire 미리보기 완전 삭제 함수 ———
function clearWirePreview() {
  document.querySelectorAll('.cell.wire-preview').forEach(cell => {
    cell.classList.remove('wire-preview');
  });
}

// ——— wire 그리기 취소 헬퍼 함수 ———
function cancelWireDrawing() {
  if (!isWireDrawing) return;
  isWireDrawing = false;
  wireTrace = [];
  clearWirePreview();          // ① 미리보기 클래스 제거
}




function track(ev) {
  const el = document.elementFromPoint(ev.clientX, ev.clientY);
  if (!el || !el.classList.contains("cell")) return;

  const last = wireTrace.at(-1);
  if (el === last) return;

  const elIdx = +el.dataset.index;

  // ▶ 되돌아가는 경우 막기 (이전 셀로 역방향 이동 시 무시)
  if (wireTrace.length >= 2) {
    const prev = wireTrace[wireTrace.length - 2];
    if (+prev.dataset.index === elIdx) return;
  }

  fillLShapeGap(last, el).forEach(mid => {
    if (!mid || wireTrace.includes(mid) || mid.dataset.type === "WIRE") return;
    mid.classList.add("wire-preview");
    wireTrace.push(mid);
  });

  el.classList.add("wire-preview");
  if (!wireTrace.includes(el)) {
    el.classList.add("wire-preview");
    wireTrace.push(el);
  }
  el.classList.add("wire-preview");
}

function trackTouch(e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  track({ clientX: t.clientX, clientY: t.clientY });
  e.preventDefault();
}

function finishTouch(e) {
  document.removeEventListener("touchmove", trackTouch);
  document.removeEventListener("touchend", finishTouch);
  const t = e.changedTouches && e.changedTouches[0];
  if (!t) return;
  const target = document.elementFromPoint(t.clientX, t.clientY);
  finish({ clientX: t.clientX, clientY: t.clientY, target });
  e.preventDefault();
}

function gridTouchMove(e) {
  if (!isWireDrawing) return;
  if (wireTrace.length === 0) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  const el = document.elementFromPoint(t.clientX, t.clientY);
  const cell = el?.closest(".cell");
  if (!cell) return;

  const idx = parseInt(cell.dataset.index, 10);
  const lastIdx = Number(wireTrace.at(-1).dataset.index);
  if (idx === lastIdx) return;

  const path = getInterpolatedIndices(lastIdx, idx);
  path.forEach(i => {
    const cellEl = grid.children[i];
    if (!wireTrace.includes(cellEl)) {
      cellEl.classList.add("wire-preview");
      wireTrace.push(cellEl);
    }
  });
  e.preventDefault();
}

// 셀 인덱스(문자열) → [row, col] 좌표
function indexToCoord1(idx) {
  const i = +idx;
  return [Math.floor(i / GRID_COLS), i % GRID_COLS];
}

// 두 셀이 그리드 상에서 인접한지 확인 (맨해튼 거리 1)
function areAdjacent(cellA, cellB) {
  const [r1, c1] = indexToCoord1(cellA.dataset.index);
  const [r2, c2] = indexToCoord1(cellB.dataset.index);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function finish(e) {
  // 1) 리스너 해제
  document.removeEventListener("mousemove", track);
  document.removeEventListener("mouseup", finish);
  document.removeEventListener("touchmove", trackTouch);
  document.removeEventListener("touchend", finishTouch);
  isMouseDown = false;
  const middle = wireTrace.slice(1, -1);
  if (middle.some(c => c.dataset.type)) {
    // 미리보기 지우고 원상복구
    wireTrace.forEach(c => c.classList.remove("wire-preview"));
    wireTrace = [];
    isWireDrawing = false;
    statusToggle.classList.remove("active");
    return;
  }
  // 2) 드롭한 셀 확인 & 마지막에 추가
  let dropCell = e.target.closest(".cell");
  if (!dropCell || !grid.contains(dropCell)) dropCell = null;
  if (dropCell && dropCell !== wireTrace.at(-1)) {
    dropCell.classList.add("wire-preview");
    wireTrace.push(dropCell);
  }

  // 3) 인접성 검사: wireTrace 상의 모든 인접 쌍이 실제 그리드에서 옆 칸인지 확인
  for (let i = 1; i < wireTrace.length; i++) {
    if (!areAdjacent(wireTrace[i - 1], wireTrace[i])) {
      // 비인접 이동이 있으면 전부 취소
      wireTrace.forEach(c => c.classList.remove("wire-preview"));
      wireTrace = [];
      isWireDrawing = false;
      statusToggle.classList.remove("active");
      return;
    }
  }

  // 4) 기존 조건 검사
  const start = wireTrace[0];
  const end = wireTrace.at(-1);
  const startIsBlock = start.dataset.type && start.dataset.type !== "WIRE";
  const endIsBlock = end.dataset.type && end.dataset.type !== "WIRE";
  const hasOldWire = wireTrace.some(c => c.dataset.type === "WIRE");

  // 5) 실제 그리기 or 취소
  if (startIsBlock && endIsBlock && wireTrace.length > 2 && !hasOldWire) {
    drawWirePath(wireTrace);
  } else {
    // 조건 하나라도 만족 못 하면 전부 취소
    wireTrace.forEach(c => c.classList.remove("wire-preview"));
  }

  // 6) 리셋
  wireTrace = [];
  isWireDrawing = false;
  statusToggle.classList.remove("active");
}

function disconnectWiresCascade(startBlock) {
  // startBlock에 직접 연결된 wire만 추출
  const related = wires.filter(w => w.start === startBlock || w.end === startBlock);

  related.forEach(w => {
    // 전선 셀 초기화
    w.path.forEach(c => {
      if (c.dataset.type === "WIRE") {
        c.classList.remove(
          "wire", "wire-preview",
          "wire-up", "wire-down", "wire-left", "wire-right",
          "flow-left", "flow-right", "flow-up", "flow-down",
          "h", "v", "corner"
        );
        delete c.dataset.type;
      }
    });

    // 연결된 반대편 블록은 남겨둠
    const neighbor = (w.start === startBlock) ? w.end : w.start;
    if (neighbor.dataset.type && neighbor.dataset.type !== "WIRE") {
      neighbor.draggable = true;
    }
  });

  // wires 배열에서 해당 연결 제거
  wires = wires.filter(w => w.start !== startBlock && w.end !== startBlock);
}

/*--------------------------------------------------
  5.  보조 함수
--------------------------------------------------*/
function fillLShapeGap(prev, curr) {
  const pi = +prev.dataset.index, ci = +curr.dataset.index;
  const pr = Math.floor(pi / GRID_COLS), pc = pi % GRID_COLS;
  const cr = Math.floor(ci / GRID_COLS), cc = ci % GRID_COLS;

  if (pr !== cr && pc !== cc) {                 // 대각선으로 건너뛴 경우
    const mids = [];

    // (1) prev 바로 위·아래 세로 칸
    const vIdx = cr > pr ? pi + GRID_COLS : pi - GRID_COLS;
    const vMid = grid.children[vIdx];
    if (vMid && !vMid.dataset.type && !wireTrace.includes(vMid)) mids.push(vMid);

    // (2) prev 바로 좌·우 가로 칸
    const hIdx = cc > pc ? pi + 1 : pi - 1;
    const hMid = grid.children[hIdx];
    if (hMid && !hMid.dataset.type && !wireTrace.includes(hMid)) mids.push(hMid);

    return mids;                                // 두 칸 모두 반환
  }
  return [];
}

// 인덱스 → {row, col}
function indexToCoord(idx) {
  return {
    row: Math.floor(idx / GRID_COLS),
    col: idx % GRID_COLS
  };
}

// {row, col} → 인덱스
function coordToIndex({ row, col }) {
  return row * GRID_COLS + col;
}

// 두 셀 인덱스 사이의 “격자 보간” 경로를 반환
function getInterpolatedIndices(fromIdx, toIdx) {
  const p0 = indexToCoord(fromIdx);
  const p1 = indexToCoord(toIdx);
  const dx = p1.col - p0.col;
  const dy = p1.row - p0.row;
  const seq = [];

  // 1) 가로 이동분 먼저 채우기
  const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
  for (let i = 1; i <= Math.abs(dx); i++) {
    seq.push(coordToIndex({ row: p0.row, col: p0.col + stepX * i }));
  }

  // 2) 세로 이동분 채우기
  const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
  for (let i = 1; i <= Math.abs(dy); i++) {
    seq.push(coordToIndex({ row: p0.row + stepY * i, col: p1.col }));
  }

  return seq;
}


// wire 모드 해제 (다른 곳 클릭 시)
document.addEventListener("click", e => {
  if (!e.target.closest('.toggle-key')) {
    isWireDrawing = false;
    statusToggle.classList.remove("active");
  }
});

// 드래그 종료 시 INPUT/OUTPUT 복구
document.addEventListener("dragend", () => {
  if (["INPUT", "OUTPUT"].includes(lastDraggedType)) {
    const found = [...document.querySelectorAll(".cell")].some(
      c => c.dataset.type === lastDraggedType
    );
    if (!found && lastDraggedIcon) {
      lastDraggedIcon.style.display = "inline-flex";
    }
  }
  lastDraggedName = null;
  lastDraggedType = null;
  lastDraggedIcon = null;
  lastDraggedFromCell = null;
});

// 선택지 드래그
attachDragHandlersToBlockIcons()

// 휴지통 처리
document.querySelectorAll('.trash-area').forEach(trashEl => {
  trashEl.addEventListener('dragover', e => e.preventDefault());
  trashEl.addEventListener('drop', () => {
    if (["INPUT", "OUTPUT"].includes(lastDraggedType)) {
      const panel = getBlockPanel();  // blockPanel 또는 moduleBlockPanel 반환 :contentReference[oaicite:1]{index=1}
      const icon = panel.querySelector(
        `.blockIcon[data-type="${lastDraggedType}"][data-name="${lastDraggedName}"]`
      );
      if (icon) icon.style.display = "inline-flex";
    }
    if (lastDraggedFromCell) {
      // ─── 수정: cascade delete 호출 ───
      disconnectWiresCascade(lastDraggedFromCell);
      resetCell(lastDraggedFromCell);
      // 기존 블록 삭제 로직
      lastDraggedFromCell.classList.remove("block", "wire");
      lastDraggedFromCell.innerText = "";
      delete lastDraggedFromCell.dataset.type;
      lastDraggedFromCell.removeAttribute("draggable");
    }
    lastDraggedType = null;
    lastDraggedIcon = null;
    lastDraggedFromCell = null;
  });
});




function updateOneWireDirection(cell) {
  const index = parseInt(cell.dataset.index);
  const gridSize = GRID_COLS;
  const cells = document.querySelectorAll(".cell");

  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const dirs = [];

  const dirOffsets = [
    { dir: "wire-up", r: -1, c: 0 },
    { dir: "wire-down", r: +1, c: 0 },
    { dir: "wire-left", r: 0, c: -1 },
    { dir: "wire-right", r: 0, c: +1 },
  ];

  for (const { dir, r, c } of dirOffsets) {
    const newRow = row + r;
    const newCol = col + c;
    if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) continue;

    const neighborIndex = newRow * gridSize + newCol;
    const neighbor = cells[neighborIndex];
    if (neighbor.dataset.type === "WIRE") dirs.push(dir);
  }

  applyWireDirection(cell, dirs);
}

function drawWirePath(path) {
  path.forEach(c => c.classList.remove("wire-preview"));
  path.forEach(c => {
    if (!c.dataset.type) {
      c.dataset.type = "WIRE";
      c.classList.add("wire");
    }
  });

  const total = path.length;
  for (let i = 0; i < total; i++) {
    const cell = path[i];
    const dirs = new Set();

    // 시작 셀: 다음 셀 기준으로 방향 지정
    if (i === 0 && total > 1) {
      getDirectionBetween(cell, path[1]).forEach(d => dirs.add(d));
    }
    // 끝 셀: 이전 셀 기준으로 방향 지정
    else if (i === total - 1 && total > 1) {
      getDirectionBetween(cell, path[total - 2]).forEach(d => dirs.add(d));
    }
    // 중간 셀: 앞뒤 기준으로 방향 지정
    else {
      if (i > 0) getDirectionBetween(cell, path[i - 1]).forEach(d => dirs.add(d));
      if (i < total - 1) getDirectionBetween(cell, path[i + 1]).forEach(d => dirs.add(d));
    }

    if (!cell.classList.contains('block')) {
      applyWireDirection(cell, Array.from(dirs));
    }
  }
  // ▶ 시작·끝 블록이 draggable이어야만 이동 가능
  const start = path[0], end = path[path.length - 1];
  if (start.dataset.type && start.dataset.type !== "WIRE") start.draggable = true;
  if (end.dataset.type && end.dataset.type !== "WIRE") end.draggable = true;

  wires.push({
    path: [...path],       // Array<cell> 복사
    start: path[0],        // 시작 블록 cell
    end: path[path.length - 1]  // 끝 블록 cell
  });

  for (let i = 0; i < path.length; i++) {
    const cell = path[i];
    cell.classList.remove("flow-left", "flow-right", "flow-up", "flow-down"); // 혹시 남아있을 때 대비

    // (1) 이전 셀 → 현재 셀 방향
    if (i > 0) {
      const prev = path[i - 1];
      cell.classList.add(getFlowClass(prev, cell));
    }
    // (2) 현재 셀 → 다음 셀 방향
    if (i < path.length - 1) {
      const next = path[i + 1];
      cell.classList.add(getFlowClass(cell, next));
    }
  }

  evaluateCircuit();
}
function getNeighbourWireDirs(cell) {
  const idx = +cell.dataset.index, g = GRID_COLS;
  const cells = document.querySelectorAll(".cell");
  const map = [
    { d: "wire-up", n: idx - g },
    { d: "wire-down", n: idx + g },
    { d: "wire-left", n: (idx % g !== 0) ? idx - 1 : -1 },
    { d: "wire-right", n: (idx % g !== g - 1) ? idx + 1 : -1 }
  ];
  return map.reduce((out, { d, n }) => {
    // ✅ 반드시 “현재 cell에 static 클래스 d가 붙어 있어야”  
    // ✅ 그리고 이웃 셀이 실제 wire이어야
    if (n >= 0 && n < cells.length
      && cell.classList.contains(d)
      && cells[n].dataset.type) {
      out.push(d);
    }
    return out;
  }, []);
}


function getDirectionBetween(fromCell, toCell) {
  const from = parseInt(fromCell.dataset.index);
  const to = parseInt(toCell.dataset.index);
  const gridSize = GRID_COLS;
  const fromRow = Math.floor(from / gridSize);
  const fromCol = from % gridSize;
  const toRow = Math.floor(to / gridSize);
  const toCol = to % gridSize;

  if (fromRow === toRow) {
    if (fromCol - 1 === toCol) return ["wire-left"];
    if (fromCol + 1 === toCol) return ["wire-right"];
  }
  if (fromCol === toCol) {
    if (fromRow - 1 === toRow) return ["wire-up"];
    if (fromRow + 1 === toRow) return ["wire-down"];
  }
  return [];
}

// 수정 후:
function applyWireDirection(cell, dirs) {
  /* ▼▼▼ ① 교차 방지 필터  ▼▼▼ */
  if (dirs.length > 2) {
    const keep = [];
    if (dirs.includes("wire-left") || dirs.includes("wire-right")) {
      keep.push(dirs.includes("wire-left") ? "wire-left" : "wire-right");
    }
    if (dirs.includes("wire-up") || dirs.includes("wire-down")) {
      keep.push(dirs.includes("wire-up") ? "wire-up" : "wire-down");
    }
    dirs = keep;   // 세 방향 이상일 때만 L자(두 방향)로 축소
  }
  /* ▲▲▲ ① 끝  ▲▲▲ */

  /* ② 기존 코드: 클래스 리셋 및 재적용 */
  cell.classList.remove(
    'wire-up', 'wire-down', 'wire-left', 'wire-right',
    'h', 'v', 'corner'
  );
  cell.classList.add(...dirs);

  const plain = dirs.map(d => d.replace('wire-', ''));

  /* ③ 애니메이션용 클래스 유지 로직(변경 없음) */
  const horiz = plain.some(p => p === 'left' || p === 'right');
  const vert = plain.some(p => p === 'up' || p === 'down');

  if (horiz && vert) {
    cell.classList.add('corner');     // ㄱ 셀
  } else if (horiz) {
    cell.classList.add('h');          // 가로 직선
  } else if (vert) {
    cell.classList.add('v');          // 세로 직선
  }
}



// 새로 추가
function getFlowClass(curr, next) {
  const c = +curr.dataset.index, n = +next.dataset.index;
  const g = GRID_COLS;
  if (n === c + 1) return "flow-right";
  if (n === c - 1) return "flow-left";
  if (n === c + g) return "flow-down";
  return "flow-up";   // n === c - g
}

/* 2) INPUT 블록 토글 설정 (0 ↔ 1) */
function setupInputToggles() {
  document.querySelectorAll('.cell.block').forEach(cell => {
    if (cell.dataset.type === 'INPUT') {
      cell.dataset.value = '0';
      cell.textContent = cell.dataset.name;
      //cell.textContent = `${cell.dataset.name}(${cell.dataset.value})`;
      cell.addEventListener('click', () => {
        cell.dataset.value = cell.dataset.value === '0' ? '1' : '0';
        cell.textContent = cell.dataset.name;
        //cell.textContent = `${cell.dataset.name}(${cell.dataset.value})`;
        cell.classList.toggle('active', cell.dataset.value === '1');

        evaluateCircuit();
      });
    }
  });

}

/* 3) 회로 평가 엔진 (BFS 기반) */
function evaluateCircuit() {
  // 1) 모든 블록과 INPUT 초기값 준비
  const blocks = Array.from(document.querySelectorAll('.cell.block'));
  const values = new Map();
  blocks
    .filter(b => b.dataset.type === 'INPUT')
    .forEach(b => values.set(b, b.dataset.value === '1'));

  // 2) 값이 더 이상 바뀌지 않을 때까지 반복
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of blocks) {
      const oldVal = values.get(node);
      const newVal = computeBlock(node, values);
      // newVal이 정의되어 있고(oldVal과 달라졌다면) 업데이트
      if (newVal !== undefined && newVal !== oldVal) {
        values.set(node, newVal);
        changed = true;
      }
    }
  }

  // 3) OUTPUT 블록 화면 갱신
  blocks
    .filter(b => b.dataset.type === 'OUTPUT')
    .forEach(out => {
      const v = values.get(out) || false;
      out.textContent = out.dataset.name
      out.dataset.val = v
      out.classList.toggle('active', v);
    });
  const allBlocks = Array.from(document.querySelectorAll('.cell.block'));
  allBlocks
    .filter(b => b.dataset.type === "JUNCTION")
    .forEach(junction => {
      const inputs = getIncomingBlocks(junction);
      if (inputs.length > 1) {
        junction.classList.add("error");
      } else {
        junction.classList.remove("error");
      }
    });
  highlightOutputErrors();
}


/* 4) 블록별 논리 연산 수행 */
function computeBlock(node, values) {
  const row = node.row;
  const col = node.col;
  const type = node.dataset.type;
  const incoming = [];

  // INPUT 블록은 자신의 값을 바로 반환
  if (type === "INPUT") {
    return values.get(node);
  }

  // 위쪽에서 들어오는 신호: static wire-down + flow-down 둘 다 있어야
  const upCell = getCell(row - 1, col);
  // 이전: if (upCell?.classList.contains("flow-down")) {
  if (upCell?.classList.contains("wire-down") && upCell.classList.contains("flow-down")) {
    const src = getBlockNodeFlow(row - 1, col, node);
    if (src) incoming.push(src);
  }

  // 아래쪽에서 들어오는 신호: static wire-up + flow-up 둘 다 있어야
  const downCell = getCell(row + 1, col);
  // 이전: if (downCell?.classList.contains("flow-up")) {
  if (downCell?.classList.contains("wire-up") && downCell.classList.contains("flow-up")) {
    const src = getBlockNodeFlow(row + 1, col, node);
    if (src) incoming.push(src);
  }

  // 왼쪽에서 들어오는 신호: static wire-right + flow-right 둘 다 있어야
  const leftCell = getCell(row, col - 1);
  // 이전: if (leftCell?.classList.contains("flow-right")) {
  if (leftCell?.classList.contains("wire-right") && leftCell.classList.contains("flow-right")) {
    const src = getBlockNodeFlow(row, col - 1, node);
    if (src) incoming.push(src);
  }

  // 오른쪽에서 들어오는 신호: static wire-left + flow-left 둘 다 있어야
  const rightCell = getCell(row, col + 1);
  // 이전: if (rightCell?.classList.contains("flow-left")) {
  if (rightCell?.classList.contains("wire-left") && rightCell.classList.contains("flow-left")) {
    const src = getBlockNodeFlow(row, col + 1, node);
    if (src) incoming.push(src);
  }

  const readyVals = incoming
    .map(n => values.get(n))
    .filter(v => v !== undefined);

  switch (type) {
    case "AND":
      return readyVals.every(v => v);
    case "OR":
      return readyVals.some(v => v);
    case "NOT":
      return !readyVals[0];
    case "OUTPUT":
      return readyVals.some(v => v);
    case "JUNCTION":
      return readyVals[0];
    default:
      return undefined;
  }
}





const mainScreen = document.getElementById("firstScreen");
const levelScreen = document.getElementById("levelScreen");
const gameScreen = document.getElementById("gameScreen");

function lockOrientationLandscape() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(err => {
      console.warn('Orientation lock failed:', err);
    });
  }
}

document.getElementById("startBtn").onclick = () => {
  lockOrientationLandscape();
  renderChapterGrid();
  document.getElementById("firstScreen").style.display = "none";
  document.getElementById("chapterScreen").style.display = "block";
};

document.getElementById("backToMainFromChapter").onclick = () => {
  document.getElementById("chapterScreen").style.display = "none";
  document.getElementById("firstScreen").style.display = "flex";
};

document.getElementById("backToMainBtn").onclick = () => {
  renderChapterGrid();
  document.getElementById("chapterScreen").style.display = "block";
  levelScreen.style.display = "none";
};

document.getElementById("backToLevelsBtn").onclick = () => {
  document.body.classList.remove('game-active');
  gameScreen.style.display = "none";
  levelScreen.style.display = "block";
};

document.querySelectorAll(".levelBtn").forEach(btn => {
  btn.onclick = () => {
    returnToEditScreen();  // 먼저 채점 영역 닫기 등 정리
    const level = btn.dataset.level;
    console.log(`레벨 ${level} 시작`);
    startLevel(level);  // 그 다음 레벨 시작
    document.body.classList.add('game-active');
    levelScreen.style.display = "none";
    gameScreen.style.display = "flex";
  };
});



function startLevel(level) {
  const [rows, cols] = levelGridSizes[level] || [6, 6];
  GRID_ROWS = rows;
  GRID_COLS = cols;
  showLevelIntro(level, () => {
    setupGrid("grid", rows, cols);
    clearGrid();
    setupBlockPanel(level);
    setGridDimensions(level);
    currentLevel = parseInt(level);
    const title = document.getElementById("gameTitle");
    title.textContent = levelTitles[level] ?? `Stage ${level}`;
    const prevMenuBtn = document.getElementById('prevStageBtnMenu');
    const nextMenuBtn = document.getElementById('nextStageBtnMenu');

    prevMenuBtn.disabled = !(levelTitles[level - 1] && isLevelUnlocked(level - 1));
    nextMenuBtn.disabled = !(levelTitles[level + 1] && isLevelUnlocked(level + 1));

  });
}


function clearGrid() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach(cell => {
    cell.className = "cell";
    cell.textContent = "";
    cell.removeAttribute("data-type");
    cell.removeAttribute("data-name");
    cell.removeAttribute("data-value");
    cell.removeAttribute("draggable");
  });
  wires = [];  // 전선도 초기화
}

function setupBlockPanel(level) {
  const panel = getBlockPanel();
  panel.innerHTML = "";

  const blocks = levelBlockSets[level];
  if (!blocks) return;

  blocks.forEach(block => {
    const div = document.createElement("div");
    div.className = "blockIcon";
    div.draggable = true;
    div.dataset.type = block.type;
    if (block.name) div.dataset.name = block.name;
    div.textContent = block.name || block.type;

    // ↓ 여기에 설명 추가
    div.dataset.tooltip = (() => {
      switch (block.type) {
        case 'AND': return 'AND 게이트: 여러러 입력이 모두 1일 때만 출력이 1';
        case 'OR': return 'OR 게이트: 여러러 입력 중 하나라도 1이면 출력이 1';
        case 'NOT': return 'NOT 게이트: 입력의 반대(0↔1)를 출력';
        case 'INPUT': return `입력(${block.name}): 클릭하여 0↔1 전환 가능`;
        case 'OUTPUT': return `출력(${block.name})`;
        case 'JUNCTION': return 'JUNCTION: 하나의 신호를 여러 방향으로 나눔(입력이 하나만 연결되어야 함)';
        default: return '';
      }
    })();

    panel.appendChild(div);
  });

  // 기존 WIRE 블록 생성 코드도 동일하게 tooltip 추가
  const wireDiv = document.createElement("div");
  wireDiv.className = "blockIcon";
  wireDiv.draggable = true;
  wireDiv.dataset.type = "WIRE";
  wireDiv.textContent = "WIRE";
  wireDiv.style.display = "none";
  wireDiv.dataset.tooltip = '전선: [Ctrl] 드래그로 설치, [Shift] 클릭으로 삭제';
  panel.appendChild(wireDiv);

  attachDragHandlersToBlockIcons();
}


function attachDragHandlersToBlockIcons() {
  document.querySelectorAll(".blockIcon").forEach(icon => {
    icon.addEventListener("dragstart", e => {
      if (isWireDrawing) {
        e.preventDefault();
        return;
      }
      const type = e.target.dataset.type;
      if (!["AND", "OR", "NOT", "INPUT", "OUTPUT", "WIRE", "JUNCTION"].includes(type)) return;
      e.dataTransfer.setData("text/plain", type);
      lastDraggedType = type;
      lastDraggedIcon = e.target;
      lastDraggedFromCell = null;
      lastDraggedName = e.target.dataset.name || null;

      // 👇 이 줄을 추가!
      // 투명한 1×1px 이미지를 드래그 이미지로 지정해서
      // 원본 요소(툴팁 포함) 대신 아무것도 보이지 않게 함
      const img = new Image();
      img.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
      e.dataTransfer.setDragImage(img, 0, 0);
    });
  });
}



document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") {
    const gameScreen = document.getElementById("gameScreen");
    if (gameScreen.style.display === "none") return;

    if (confirm("⚠️ 모든 블록과 배선을 삭제하시겠습니까?")) {
      clearGrid();
      setupBlockPanel(currentLevel);
      document.querySelectorAll('.cell').forEach(cell => delete cell.onclick);
    }
  }
  if (e.key === "Control") {
    isWireDrawing = true;
    statusToggle.classList.add("active");
  }
  if (e.key === "Shift") {
    deleteToggle.classList.add("active");
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Control") {
    isWireDrawing = false;
    statusToggle.classList.remove("active");
    clearWirePreview();  // 드로잉 중 취소 시 미리보기 제거
    wireTrace = [];
  }
  if (e.key === "Shift") {
    deleteToggle.classList.remove("active");
  }
});

function getIncomingBlocks(node) {
  const row = node.row;
  const col = node.col;
  const incoming = [];

  // wireDir: static wire 클래스, flowDir: flow 클래스
  const check = (r, c, wireDir, flowDir) => {
    const cell = getCell(r, c);
    if (cell?.classList.contains(wireDir)
      && cell.classList.contains(flowDir)) {
      const src = getBlockNodeFlow(r, c, node);
      if (src) incoming.push(src);
    }
  };

  // 위↓, 아래↑, 왼→, 오←
  check(row - 1, col, 'wire-down', 'flow-down');
  check(row + 1, col, 'wire-up', 'flow-up');
  check(row, col - 1, 'wire-right', 'flow-right');
  check(row, col + 1, 'wire-left', 'flow-left');

  return incoming;
}

async function gradeLevelAnimated(level) {
  const testCases = levelAnswers[level];
  if (!testCases) return;

  const allBlocks = Array.from(document.querySelectorAll('.cell.block'));
  let junctionError = false;

  allBlocks
    .filter(b => b.dataset.type === "JUNCTION")
    .forEach(junction => {
      const inputs = getIncomingBlocks(junction);
      if (inputs.length > 1) {
        junction.classList.add("error");
        junctionError = true;
      } else {
        junction.classList.remove("error");
      }
    });

  if (junctionError) {
    alert("❌ JUNCTION 블록에 여러 입력이 연결되어 있습니다. 회로를 수정해주세요.");
    overlay.style.display = "none";
    isScoring = false;
    return;
  }
  let outputError = false;
  Array.from(document.querySelectorAll('.cell.block[data-type="OUTPUT"]'))
    .forEach(output => {
      const inputs = getIncomingBlocks(output);
      if (inputs.length > 1) {
        output.classList.add("error");
        outputError = true;
      } else {
        output.classList.remove("error");
      }
    });
  if (outputError) {
    alert("❌ OUTPUT 블록에 여러 입력이 연결되어 있습니다. 회로를 수정해주세요.");
    overlay.style.display = "none";
    isScoring = false;
    return;
  }
  // 🔒 [1] 현재 레벨에 필요한 OUTPUT 블록 이름 확인
  const requiredOutputs = levelBlockSets[level]
    .filter(block => block.type === "OUTPUT")
    .map(block => block.name);

  // 🔍 현재 화면에 있는 OUTPUT 셀 조사
  const actualOutputCells = Array.from(document.querySelectorAll('.cell.block[data-type="OUTPUT"]'));
  const actualOutputNames = actualOutputCells.map(cell => cell.dataset.name);

  // 🔒 [2] 누락된 출력 블록이 있으면 채점 막기
  const missingOutputs = requiredOutputs.filter(name => !actualOutputNames.includes(name));
  if (missingOutputs.length > 0) {
    alert(`❌ 다음 출력 블록이 배치되지 않았습니다: ${missingOutputs.join(", ")}`);
    overlay.style.display = "none";
    isScoring = false;
    return;
  }

  let allCorrect = true;

  // UI 전환
  document.getElementById("blockPanel").style.display = "none";
  document.getElementById("rightPanel").style.display = "none";
  document.getElementById("gradingArea").style.display = "block";
  const gradingArea = document.getElementById("gradingArea");
  gradingArea.innerHTML = "<b>채점 결과:</b><br><br>";

  const inputs = document.querySelectorAll('.cell.block[data-type="INPUT"]');
  const outputs = document.querySelectorAll('.cell.block[data-type="OUTPUT"]');

  for (const test of testCases) {
    inputs.forEach(input => {
      const name = input.dataset.name;
      const value = test.inputs[name] ?? 0;
      input.dataset.value = String(value);
      //input.textContent = `${name}(${value})`;
      input.classList.toggle('active', value === 1);
    });
    evaluateCircuit();
    await new Promise(r => setTimeout(r, 100));



    let correct = true;

    const actualText = Array.from(outputs)
      .map(out => {
        const name = out.dataset.name;
        const actual = + JSON.parse(out.dataset.val);
        const expected = test.expected[name];
        if (actual !== expected) correct = false;
        return `${name}=${actual}`;
      }).join(", ");

    const expectedText = Object.entries(test.expected)
      .map(([k, v]) => `${k}=${v}`).join(", ");
    const inputText = Object.entries(test.inputs)
      .map(([k, v]) => `${k}=${v}`).join(", ");

    if (!correct) allCorrect = false;

    if (!document.getElementById("gradingTable")) {
      gradingArea.innerHTML += `
      <table id="gradingTable">
        <thead>
          <tr>
            <th>입력</th>
            <th>예상 출력</th>
            <th>실제 출력</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    }
    const tbody = document.querySelector("#gradingTable tbody");

    const tr = document.createElement("tr");
    tr.className = correct ? "correct" : "wrong";
    tr.innerHTML = `
    <td>${inputText}</td>
    <td>${expectedText}</td>
    <td>${actualText}</td>
    <td style="font-weight: bold; color: ${correct ? 'green' : 'red'};">
      ${correct ? '✅ 정답' : '❌ 오답'}
    </td>
  `;
    tbody.appendChild(tr);
  }

  const summary = document.createElement("div");
  summary.id = "gradeResultSummary";
  summary.textContent = allCorrect ? "🎉 모든 테스트를 통과했습니다!" : "😢 일부 테스트에 실패했습니다.";
  gradingArea.appendChild(summary);

  const returnBtn = document.createElement("button");
  returnBtn.id = "returnToEditBtn";
  returnBtn.textContent = "🛠 편집으로 돌아가기";
  gradingArea.appendChild(returnBtn);

  document.getElementById("returnToEditBtn")?.addEventListener("click", returnToEditScreen);

  if (allCorrect) {
    const clearedBtn = document.querySelector(`.levelBtn[data-level="${level}"]`);
    if (clearedBtn && !clearedBtn.classList.contains("cleared")) {
      clearedBtn.classList.add("cleared");
      clearedBtn.textContent += `\n✅`;
      markLevelCleared(level);
    }
    const blocks = Array.from(document.querySelectorAll(".cell.block"));

    // ② 타입별 개수 집계
    const blockCounts = blocks.reduce((acc, cell) => {
      const t = cell.dataset.type;
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    // ③ 도선 수 집계
    const usedWires = document.querySelectorAll(".cell.wire").length;
    const nickname = localStorage.getItem("username") || "익명";
    const rankingsRef = db.ref(`rankings/${level}`);

    // ① 내 기록 조회 (nickname 기준)
    rankingsRef.orderByChild("nickname").equalTo(nickname)
      .once("value", snapshot => {
        if (!snapshot.exists()) {
          // 내 기록이 없으면 새로 저장
          saveRanking(level, blockCounts, usedWires);
          showClearedModal(level);
          return;
        }

        let best = null;
        snapshot.forEach(child => {
          const e = child.val();
          // 기존/새 블록 개수 합계
          const oldBlocks = Object.values(e.blockCounts || {}).reduce((a, b) => a + b, 0);
          const newBlocks = Object.values(blockCounts).reduce((a, b) => a + b, 0);
          // 기존/새 도선 개수
          const oldWires = e.usedWires;
          const newWires = usedWires;

          // ✅ 수정: 오직 성능이 엄격히 개선된 경우에만 best 할당
          if (
            newBlocks < oldBlocks
            || (newBlocks === oldBlocks && newWires < oldWires)
          ) {
            best = { key: child.key };
            // nickname 당 보통 한 건만 있으므로, 더 돌 필요 없으면 false 리턴
            return false;
          }
        });

        // ③ 개선된 경우에만 업데이트 (동일 성능이라면 best가 null이므로 건너뜀)
        if (best) {
          rankingsRef.child(best.key).update({
            blockCounts,
            usedWires,
            timestamp: new Date().toISOString()
          });
          showClearedModal(level);
        }
      });


  }
}

function returnToEditScreen() {
  // 채점 모드 해제
  isScoring = false;
  overlay.style.display = "none";

  // 원래 편집 UI 복원
  document.getElementById("blockPanel").style.display = "flex";
  document.getElementById("rightPanel").style.display = "block";
  document.getElementById("gradingArea").style.display = "none";
}

window.addEventListener("DOMContentLoaded", () => {
  const prevMenuBtn = document.getElementById('prevStageBtnMenu');
  const nextMenuBtn = document.getElementById('nextStageBtnMenu');

  prevMenuBtn.addEventListener('click', () => {
    returnToEditScreen();           // 채점 모드 닫기
    startLevel(currentLevel - 1);   // 이전 스테이지 시작
  });

  nextMenuBtn.addEventListener('click', () => {
    returnToEditScreen();
    startLevel(currentLevel + 1);   // 다음 스테이지 시작
  });
  document.querySelectorAll(".levelBtn").forEach(btn => {
    const level = btn.dataset.level;
    btn.textContent = levelTitles[level] ?? `Stage ${level}`;
  });
  enableTouchDrag();
  const clearedLevels = JSON.parse(localStorage.getItem("clearedLevels") || "[]");
  clearedLevels.forEach(level => {
    const btn = document.querySelector(`.levelBtn[data-level="${level}"]`);
    if (btn) {
      btn.classList.add("cleared");
      btn.textContent += "\n ✅";
    }
  });
});

function markLevelCleared(level) {
  const cleared = JSON.parse(localStorage.getItem("clearedLevels") || "[]");
  if (!cleared.includes(level)) {
    cleared.push(level);
    localStorage.setItem("clearedLevels", JSON.stringify(cleared));
  }
}

/**
* row, col이 범위를 벗어나면 null을, 아니면 그 위치의 .cell 요소를 돌려줍니다.
*/
function getCell(row, col) {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
  return grid.children[row * GRID_COLS + col];
}

/**
 * getCell로 가져온 셀 중에서 block(=INPUT/OUTPUT/AND/OR/NOT)일 때만 돌려줍니다.
 */
// 이전에 사용하셨던 getBlockNode(…) 함수는 지우고, 아래로 대체하세요.
function getBlockNode(startRow, startCol, excludeCell) {
  const visited = new Set();
  // 탐색 대상 블록(self)의 좌표도 미리 방문 처리
  if (excludeCell) {
    visited.add(`${excludeCell.row},${excludeCell.col}`);
  }

  function dfs(r, c) {
    const key = `${r},${c}`;
    if (visited.has(key)) return null;
    visited.add(key);

    const cell = getCell(r, c);
    if (!cell) return null;

    // 블록이면 바로 반환
    if (cell.dataset.type && cell.dataset.type !== "WIRE") {
      return cell;
    }

    // wire 셀 → 연결된 방향만 따라 재귀 탐색
    const dirs = {
      "wire-up": { dr: -1, dc: 0, opp: "wire-down" },
      "wire-down": { dr: 1, dc: 0, opp: "wire-up" },
      "wire-left": { dr: 0, dc: -1, opp: "wire-right" },
      "wire-right": { dr: 0, dc: 1, opp: "wire-left" },
    };

    for (const [cls, { dr, dc, opp }] of Object.entries(dirs)) {
      if (!cell.classList.contains(cls)) continue;
      const nr = r + dr, nc = c + dc;
      const nbCell = getCell(nr, nc);
      if (!nbCell) continue;
      const isWireConn = nbCell.dataset.type === "WIRE"
        && nbCell.classList.contains(opp);
      const isBlockConn = nbCell.dataset.type && nbCell.dataset.type !== "WIRE";
      if (isWireConn || isBlockConn) {
        const found = dfs(nr, nc);
        if (found) return found;
      }
    }
    return null;
  }

  return dfs(startRow, startCol);
}

/**
 * flow- 클래스를 역방향으로만 따라가면서
 * 블록을 찾아오는 함수입니다.
 *
 * startRow, startCol: computeBlock이 시작한 첫 번째 wire 셀 좌표
 * excludeNode: computeBlock이 호출된 자기 자신 노드 (순환 방지용)
 */
/**
 * 시작 좌표에서 블록까지 연결된 wire 경로를 역추적합니다.
 * - flow-* 없이 wire-* static 클래스만 사용
 * - 꺾인 코너(wire-up + wire-right 등)도 getNeighbourWireDirs로 모두 반환
 */
function getBlockNodeFlow(startRow, startCol, excludeNode) {
  const visited = new Set();
  if (excludeNode) {
    visited.add(`${excludeNode.row},${excludeNode.col}`);
  }

  // wire 클래스 ↔ 좌표 오프셋 매핑
  const dirOffsets = {
    "wire-up": { dr: -1, dc: 0, opp: "wire-down" },
    "wire-down": { dr: 1, dc: 0, opp: "wire-up" },
    "wire-left": { dr: 0, dc: -1, opp: "wire-right" },
    "wire-right": { dr: 0, dc: 1, opp: "wire-left" }
  };

  function dfs(r, c) {
    const key = `${r},${c}`;
    if (visited.has(key)) return null;
    visited.add(key);

    const cell = getCell(r, c);
    if (!cell) return null;

    // 블록이면 바로 반환
    if (cell.dataset.type && cell.dataset.type !== "WIRE") {
      return cell;
    }

    // 현재 wire 셀의 모든 static 연결 방향을 가져옴
    // (코너인 경우 ['wire-up','wire-right'] 등 두 방향)
    const neighbourDirs = getNeighbourWireDirs(cell);  // :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}

    for (const dir of neighbourDirs) {
      const { dr, dc, opp } = dirOffsets[dir];
      const nr = r + dr, nc = c + dc;
      const nb = getCell(nr, nc);
      if (!nb) continue;

      // 이웃 셀이 wire라면 반대 static 클래스도 있어야, 혹은 블록이면 OK
      const isWireConn = nb.dataset.type === "WIRE"
        && nb.classList.contains(opp);
      const isBlockConn = nb.dataset.type && nb.dataset.type !== "WIRE";
      if (!isWireConn && !isBlockConn) {
        continue;
      }

      const found = dfs(nr, nc);
      if (found) return found;
    }

    return null;
  }

  return dfs(startRow, startCol);
}

// 피드백 전송
// 1) 방명록 등록 함수
function submitGuestEntry() {
  // 이전: 입력창 value 또는 익명 사용
  // const name = document.getElementById("guestName").value.trim() || "익명";

  // 수정: 로그인(모달)된 username을 사용
  const name = localStorage.getItem("username") || "익명";

  const msg = document.getElementById("guestMessage").value.trim();
  if (!msg) return alert("내용을 입력해주세요!");

  const entry = { name, message: msg, time: Date.now() };
  db.ref("guestbook").push(entry, err => {
    if (err) alert("전송에 실패했습니다.");
    else document.getElementById("guestMessage").value = "";
  });
}

// 2) 실시간 방명록 목록 업데이트
db.ref("guestbook").on("value", snapshot => {
  const list = document.getElementById("guestbookList");
  list.innerHTML = "";
  const entries = [];
  snapshot.forEach(child => {
    entries.push(child.val());
    return false;  // 반드시 false를 리턴해야 계속 순회합니다
  });
  entries.sort((a, b) => b.time - a.time);

  for (const e of entries) {
    const div = document.createElement("div");
    div.style.margin = "10px 0";
    const name = e.name;
    const displayName = name.length > 20 ? name.slice(0, 20) + '...' : name;
    div.innerHTML = `<b>${displayName}</b> (${new Date(e.time).toLocaleString()}):<br>${e.message}`;
    list.appendChild(div);
  }
});

/*
// 실시간 반영
firebase.database().ref("guestbook").on("value", (snapshot) => {
  const list = document.getElementById("guestbookList");
  list.innerHTML = "";
  const entries = [];
  snapshot.forEach(child => entries.push(child.val()));
  entries.sort((a, b) => b.time - a.time); // 최신순

  for (const e of entries) {
    const div = document.createElement("div");
    div.style.margin = "10px 0";
    div.innerHTML = `<b>${e.name}</b> (${new Date(e.time).toLocaleString()}):<br>${e.message}`;
    list.appendChild(div);
  }
});
*/
function showLevelIntro(level, callback) {
  const modal = document.getElementById("levelIntroModal");
  const title = document.getElementById("introTitle");
  const desc = document.getElementById("introDesc");
  const table = document.getElementById("truthTable");

  const data = levelDescriptions[level];
  if (!data) {
    callback();  // 데이터 없으면 바로 시작
    return;
  }

  title.textContent = data.title;
  desc.textContent = data.desc;

  // 진리표 렌더링
  const keys = Object.keys(data.table[0]);
  table.innerHTML = `
    <tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>
    ${data.table.map(row =>
    `<tr>${keys.map(k => `<td>${row[k]}</td>`).join('')}</tr>`
  ).join('')}
  `;

  modal.style.display = "flex";
  modal.style.backgroundColor = "white";
  document.getElementById("startLevelBtn").onclick = () => {
    modal.style.display = "none";
    callback();  // 실제 레벨 시작
  };
}


function renderChapterGrid() {
  const grid = document.getElementById("chapterGrid");
  grid.innerHTML = "";

  // 클리어된 레벨 정보 로드
  const cleared = JSON.parse(localStorage.getItem("clearedLevels") || "[]");

  chapterData.forEach((chapter, idx) => {
    const card = document.createElement("div");
    card.className = "chapterCard";

    // 1단계 챕터(basic)는 항상 잠금 해제, 이후 챕터는 이전 챕터 스테이지 전부 클리어되어야 해제
    let unlocked = true;
    if (idx > 0) {
      const prevStages = chapterData[idx - 1].stages;
      unlocked = prevStages.every(s => cleared.includes(s));
    }

    if (!unlocked) {
      // 잠금 상태: 회색 처리 및 클릭 금지
      card.classList.add("locked");
      card.innerHTML = `
        <h3>${chapter.name} 🔒</h3>
        <p>챕터 ${idx}의 모든 스테이지를 완료해야 열립니다.</p>
      `;
      card.onclick = () => {
        alert(`챕터 ${idx}의 스테이지를 모두 완료해야 다음 챕터가 열립니다.`);
      };
    } else {
      // 해제 상태: 기존 동작 유지
      card.innerHTML = `
        <h3>${chapter.name}</h3>
        <p>${chapter.desc}</p>
      `;
      card.onclick = () => {
        renderLevelGrid(chapter.stages);
        document.getElementById("chapterScreen").style.display = "none";
        document.getElementById("levelScreen").style.display = "block";
      };
    }

    grid.appendChild(card);
  });
}

function renderLevelGrid(stageList) {
  const levelGrid = document.querySelector(".levelGrid");
  levelGrid.innerHTML = "";

  stageList.forEach(level => {
    const btn = document.createElement("button");
    btn.className = "levelBtn";
    btn.dataset.level = level;
    btn.textContent = levelTitles[level] ?? `Stage ${level}`;
    if (JSON.parse(localStorage.getItem("clearedLevels") || "[]").includes(level)) {
      btn.classList.add("cleared");
      btn.textContent += "\n ✅";
    }
    btn.onclick = () => {
      returnToEditScreen();
      startLevel(level);

      // ✅ level 화면 닫고 game 화면 열기
      document.getElementById("levelScreen").style.display = "none";
      document.getElementById("gameScreen").style.display = "flex";
      document.body.classList.add('game-active');
    };
    levelGrid.appendChild(btn);
  });
}

function setGridDimensions(level) {
  const [rows, cols] = levelGridSizes[level] || [6, 6];
  GRID_ROWS = rows;
  GRID_COLS = cols;

  // ① CSS 변수만 업데이트
  grid.style.setProperty('--grid-rows', rows);
  grid.style.setProperty('--grid-cols', cols);

  // ② inline grid-template 은 제거하거나 주석 처리
  // grid.style.gridTemplateRows   = `repeat(${rows}, 1fr)`;
  // grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
}


/**
 * @param {string} containerId 그리드 컨테이너의 id
 * @param {number} rows
 * @param {number} cols
 */
function setupGrid(containerId, rows, cols) {
  GRID_COLS = cols
  GRID_ROWS = rows
  grid = document.getElementById(containerId);

  grid.style.setProperty('--grid-cols', cols);
  grid.style.setProperty('--grid-rows', rows);
  grid.innerHTML = "";

  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;
    cell.row = Math.floor(i / GRID_COLS);
    cell.col = i % GRID_COLS;
    cell.addEventListener("dragover", e => e.preventDefault());

    /* drop */
    cell.addEventListener("drop", e => {
      e.preventDefault();
      if (cell.dataset.type) return;

      const type = e.dataTransfer.getData("text/plain");
      if (!["AND", "OR", "NOT", "INPUT", "OUTPUT", "WIRE", "JUNCTION"].includes(type)) return;
      if (type === "INPUT" || type === "OUTPUT") {
        // 이름(name)과 초기값(value) 세팅
        cell.classList.add("block");
        cell.dataset.type = type;
        cell.dataset.name = lastDraggedName || lastDraggedIcon?.dataset.name;
        if (type === 'INPUT') {
          cell.dataset.value = '0';
          cell.textContent = cell.dataset.name;
          //cell.textContent = `${cell.dataset.name}(${cell.dataset.value})`;
          // 드롭 시점에 바로 click 리스너 등록
          cell.onclick = () => {
            cell.dataset.value = cell.dataset.value === '0' ? '1' : '0';
            cell.textContent = cell.dataset.name; 
            //cell.textContent = `${cell.dataset.name}(${cell.dataset.value})`;
            cell.classList.toggle('active', cell.dataset.value === '1');
            evaluateCircuit();
          };
        } else {
          cell.textContent = cell.dataset.name;
        }
        cell.draggable = true;
        // 배치된 아이콘 하나만 사라지도록 유지 (다른 INPUT 아이콘엔 영향 없음)
        if (lastDraggedIcon) lastDraggedIcon.style.display = "none";
      }
      else if (type === "WIRE") {
        cell.classList.add("wire");
        cell.dataset.type = "WIRE";
      } 
      else if (type === "JUNCTION") {
        cell.classList.add("block");
        cell.textContent = "JUNC";
        cell.dataset.type = type;
        cell.draggable = true;
      } else {
        cell.classList.add("block");
        cell.textContent = type;
        cell.dataset.type = type;
        cell.draggable = true;
      }

      if (["INPUT", "OUTPUT"].includes(type) && lastDraggedIcon)
        lastDraggedIcon.style.display = "none";

      /* 원래 셀 비우기 */
      if (lastDraggedFromCell && lastDraggedFromCell !== cell) {
        // ─── 수정: cascade delete 호출 ───
        disconnectWiresCascade(lastDraggedFromCell);
        resetCell(lastDraggedFromCell);
        // 기존 셀 초기화 로직
        lastDraggedFromCell.classList.remove("block", "wire");
        lastDraggedFromCell.textContent = "";
        delete lastDraggedFromCell.dataset.type;
        lastDraggedFromCell.removeAttribute("draggable");
      }
      lastDraggedType = lastDraggedIcon = lastDraggedFromCell = null;
    });



    /* 셀 dragstart (wire 모드면 차단) */
    cell.addEventListener("dragstart", e => {
      if (isWireDrawing) { e.preventDefault(); return; }
      const t = cell.dataset.type;
      if (!t || t === "WIRE") return;
      e.dataTransfer.setData("text/plain", t);
      lastDraggedType = t;
      lastDraggedFromCell = cell;
      lastDraggedName = cell.dataset.name || null;
    });

    cell.addEventListener("click", (e) => {
      if (e.shiftKey && cell.dataset.type === "WIRE") {
        // (1) 클릭한 셀이 포함된 wire path 찾기
        const targetWires = wires.filter(w => w.path.includes(cell));

        // (2) 해당 wire들을 지움
        targetWires.forEach(w => {
          w.path.forEach(c => {
            if (c.dataset.type === "WIRE") {
              c.className = "cell";
              c.removeAttribute("data-type");
            }
          });
        });

        // (3) wires 배열에서 제거
        wires = wires.filter(w => !targetWires.includes(w));
      }
    });


    cell.style.setProperty('--col', i % GRID_COLS);
    cell.style.setProperty('--row', Math.floor(i / GRID_COLS));
    cell.row = Math.floor(i / GRID_COLS);
    cell.col = i % GRID_COLS;
    grid.appendChild(cell);
  }
  grid.addEventListener("mousedown", e => {
    const cell = e.target;
    if (!isWireDrawing || !cell.classList.contains("cell")) return;

    /* 시작은 블록만 허용 */
    const t = cell.dataset.type;
    if (!t || t === "WIRE") return;

    isMouseDown = true;
    wireTrace = [cell];

    document.addEventListener("mousemove", track);
    document.addEventListener("mouseup", finish);
  });

  grid.addEventListener("touchstart", e => {
    const cell = e.target.closest('.cell');
    if (!isWireDrawing || !cell) return;

    const t = cell.dataset.type;
    if (!t || t === "WIRE") return;

    isMouseDown = true;
    wireTrace = [cell];

    document.addEventListener("touchmove", trackTouch, { passive: false });
    document.addEventListener("touchend", finishTouch);
  }, { passive: false });

  grid.addEventListener("mousemove", e => {
    if (!isWireDrawing) return;
    // 커서 바로 밑의 요소 찾기
    if (wireTrace.length === 0) return;   // 시작 셀 없으면 종료
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest(".cell");
    if (!cell) return;

    const idx = parseInt(cell.dataset.index, 10);

    // 이전: const lastIdx = wireTrace[wireTrace.length - 1];
    // 이전: if (idx === lastIdx) return;
    const lastIdx = Number(wireTrace.at(-1).dataset.index);
    if (idx === lastIdx) return;

    // 두 점 사이 모든 셀을 채워 줌
    const path = getInterpolatedIndices(lastIdx, idx);

    // 이전:
    // path.forEach(i => {
    //   if (!wireTrace.map(c => c.dataset.index).includes(i)) {
    //     wireTrace.push(i);
    //   }
    // });
    path.forEach(i => {
      const cellEl = grid.children[i];
      if (!wireTrace.includes(cellEl)) {      /* ← 이미 들어갔는지 바로 확인 */
        cellEl.classList.add("wire-preview");
        wireTrace.push(cellEl);
      }
    });

    // wire 미리보기 업데이트
    //drawWirePreview(wireTrace);
  });

  grid.addEventListener("touchmove", gridTouchMove, { passive: false });
  grid.addEventListener('click', e => {
    if (!isWireDeleting) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;

    if (cell.classList.contains('block')) {
      // ① 연결된 전선 전체 삭제
      disconnectWiresCascade(cell);

      const type = cell.dataset.type;
      const name = cell.dataset.name;
      // ② INPUT/OUTPUT이면 아이콘 복원
      if (["INPUT", "OUTPUT"].includes(type)) {
        const panel = getBlockPanel();  // blockPanel 또는 moduleBlockPanel 반환
        const icon = panel.querySelector(
          `.blockIcon[data-type="${type}"][data-name="${name}"]`
        );
        if (icon) {
          icon.style.display = "inline-flex";
        }
      }

      // ③ 셀 초기화
      resetCell(cell);                          // ← 모든 data-* 제거까지 한 번에
    }
    else if (cell.classList.contains('wire')) {
      // wire 셀만 지울 땐 기존 로직 유지
      cell.className = 'cell';
      delete cell.dataset.type;
      delete cell.dataset.directions;
    }
  });
  // ——— 그리드 밖 마우스 탈출 시 취소 ———
  grid.addEventListener('mouseleave', cancelWireDrawing);
  grid.addEventListener('touchcancel', cancelWireDrawing);
}

function resetCell(cell) {
  cell.className = "cell";
  cell.textContent = "";
  delete cell.dataset.type;
  delete cell.dataset.name;
  delete cell.dataset.value;
  cell.removeAttribute("draggable");
  // 클릭 이벤트 프로퍼티 초기화
  cell.onclick = null;
}

document.getElementById("showIntroBtn").addEventListener("click", () => {
  if (currentLevel != null) {
    showIntroModal(currentLevel);
  }
});



function showIntroModal(level) {
  const modal = document.getElementById("levelIntroModal");
  const title = document.getElementById("introTitle");
  const desc = document.getElementById("introDesc");
  const table = document.getElementById("truthTable");

  const data = levelDescriptions[level];
  if (!data) return;

  title.textContent = data.title;
  desc.textContent = data.desc;

  // 진리표 다시 렌더링
  const keys = Object.keys(data.table[0]);
  table.innerHTML = `
    <tr>${keys.map(k => `<th>${k}</th>`).join("")}</tr>
    ${data.table.map(row =>
    `<tr>${keys.map(k => `<td>${row[k]}</td>`).join("")}</tr>`
  ).join("")}
  `;

  modal.style.display = "flex";
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
  document.getElementById("startLevelBtn").innerText = "닫기";
  document.getElementById("startLevelBtn").onclick = () => {
    modal.style.display = "none";
  };
}

// script.v1.0.js 맨 아래, 기존 코드 뒤에 붙여 주세요.

// 1) 튜토리얼 데이터 정의
const tutorialSteps = [
  {
    title: "블록 배치하기",
    desc: "왼쪽 패널에서 블록을 드래그하여 그리드 위에 배치해보세요.\n- AND, OR, NOT, IN/OUT 블록이 있어요.",
    img: "assets/tutorial-place-blocks.gif"
  },
  {
    title: "전선 그리기",
    desc: "[Ctrl] 키를 누른 상태로 블록 간을 드래그하면 전선 모드가 활성화됩니다.\n드래그를 놓으면 두 블록이 연결돼요.",
    img: "assets/tutorial-draw-wire.gif"
  },
  {
    title: "전선 삭제하기",
    desc: "[Shift] 키를 누른 상태에서 전선을 드래그하거나 블록을 드래그하여 전선을 삭제할 수 있어요.",
    img: "assets/tutorial-delete-wire.gif"
  },
  {
    title: "회로 채점하기",
    desc: "오른쪽 ‘채점하기’ 버튼을 누르면 테스트 케이스별 결과가 표시됩니다.\n정확한 회로를 설계해 보세요!",
    img: "assets/tutorial-evaluate.gif"
  },
  {
    title: "스테이지 안내 보기",
    desc: "하단 메뉴의 ℹ️ 버튼을 눌러 스테이지별 진리표와 설명을 확인할 수 있습니다.",
    img: "assets/tutorial-see-info.gif"
  }
];

// 2) 모달 관련 변수
let tutIndex = 0;
const tutModal = document.getElementById("tutorialModal");
const tutTitle = document.getElementById("tutTitle");
const tutDesc = document.getElementById("tutDesc");
const tutPrev = document.getElementById("tutPrevBtn");
const tutNext = document.getElementById("tutNextBtn");
const tutClose = document.getElementById("tutCloseBtn");
const tutBtn = document.getElementById("tutorialBtn");
const tutImg = document.getElementById("tutImg");

// 3) 모달 표시 함수
function showTutorial(idx) {
  tutIndex = idx;
  const step = tutorialSteps[idx];
  tutTitle.textContent = step.title;
  tutDesc.textContent = step.desc;

  // 이미지가 있으면 보이게, 없으면 숨기기
  if (step.img) {
    tutImg.src = step.img;
    tutImg.style.display = "block";
  } else {
    tutImg.style.display = "none";
  }

  tutPrev.disabled = (idx === 0);
  tutNext.disabled = (idx === tutorialSteps.length - 1);
  tutModal.style.display = "flex";
}

// 4) 이벤트 연결
tutBtn.addEventListener("click", () => showTutorial(0));
tutPrev.addEventListener("click", () => showTutorial(tutIndex - 1));
tutNext.addEventListener("click", () => showTutorial(tutIndex + 1));
tutClose.addEventListener("click", () => {
  tutModal.style.display = "none";
});

// 5) ESC 키로 닫기
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && tutModal.style.display === "flex") {
    tutModal.style.display = "none";
  }
});

// ─────────── 삭제 모드 기능 추가 ───────────

// 삭제 모드 상태값
let isWireDeleting = false;

// 키 입력에 따라 모드 전환
document.addEventListener('keydown', e => {
  if (e.key === 'Control') {
    isWireDrawing = true;
    statusToggle.classList.add('active');
  }
  if (e.key === 'Shift') {
    isWireDeleting = true;
    deleteToggle.classList.add('active');
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'Control') {
    isWireDrawing = false;
    statusToggle.classList.remove('active');
    clearWirePreview();            // 반쯤 그려진 미리보기 제거
  }
  if (e.key === 'Shift') {
    isWireDeleting = false;
    deleteToggle.classList.remove('active');
  }
});





// 1) 필요한 엘리먼트 가져오기
const shareModal = document.getElementById('shareModal');
const shareTextEl = document.getElementById('shareText');
const copyShareBtn = document.getElementById('copyShareBtn');
const closeShareBtn = document.getElementById('closeShareBtn');
const copyStatusBtn = document.getElementById('copyStatusBtn');

// 2) 공유할 “텍스트” 생성 함수 (예: 현재 그리드 상태 직렬화)
function buildShareString() {
  // 예시: JSON.stringify(gridData) 같은 실제 공유 데이터로 바꿔주세요
  const lines = [];
  lines.push("I played " + location.origin + location.pathname);
  lines.push("");
  const cleared = JSON.parse(localStorage.getItem("clearedLevels") || "[]");
  const totalStages = Object.keys(levelTitles).length;  // 총 스테이지 수 (필요 시 갱신)



  for (let i = 1; i <= totalStages; i++) {
    const title = levelTitles[i] || '';
    const mark = cleared.includes(i) ? "✅" : "❌";
    lines.push(`Stage ${i} (${title}): ${mark}`);
  }


  const text = lines.join("\n");
  return text;
}

// 3) 공유하기 버튼 클릭 → 모달 열기
copyStatusBtn.addEventListener('click', () => {
  shareTextEl.value = buildShareString();
  shareModal.style.display = 'flex';
  shareTextEl.select();
});

// 4) 복사 버튼
copyShareBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(shareTextEl.value)
    .then(() => alert('클립보드에 복사되었습니다!'))
    .catch(err => alert('복사에 실패했습니다: ' + err));
});

// 5) 닫기 버튼
closeShareBtn.addEventListener('click', () => {
  shareModal.style.display = 'none';
});

// 채점 중 grid 조작 금지 기능
const overlay = document.getElementById("gridOverlay");
let isScoring = false;

document.getElementById("gradeButton").addEventListener("click", () => {
  if (currentLevel == null || isScoring) return;
  isScoring = true;
  overlay.style.display = "block";
  // 채점 애니메이션만 실행 (오버레이 해제는 returnToEditScreen에서)
  gradeLevelAnimated(currentLevel);
});

function promptForUsername() {
  const savedName = localStorage.getItem("username");
  if (savedName) return;  // 이미 저장되어 있음

  document.getElementById("usernameModal").style.display = "flex";
}

document.getElementById("usernameSubmit").addEventListener("click", () => {
  const name = document.getElementById("usernameInput").value.trim();
  const errorDiv = document.getElementById("usernameError");

  if (!name) {
    errorDiv.textContent = "닉네임을 입력해주세요.";
    return;
  }

  // Firebase에서 중복 확인
  db.ref("usernames").orderByValue().equalTo(name).once("value", snapshot => {
    if (snapshot.exists()) {
      errorDiv.textContent = "이미 사용 중인 닉네임입니다.";
    } else {
      // 저장
      const userId = db.ref("usernames").push().key;
      db.ref(`usernames/${userId}`).set(name);
      localStorage.setItem("username", name);
      document.getElementById("usernameModal").style.display = "none";
      const uname = localStorage.getItem("username") || "익명";
      document.getElementById("guestUsername").textContent = uname;
    }
  });
});


function saveRanking(levelId, blockCounts, usedWires /*, timeMs */) {
  const nickname = localStorage.getItem("username") || "익명";
  const entry = {
    nickname,
    blockCounts,                        // { INPUT:2, AND:1, OR:1, … }
    usedWires,
    timestamp: new Date().toISOString()
  };
  db.ref(`rankings/${levelId}`).push(entry);
}

function showRanking(levelId) {
  const listEl = document.getElementById("rankingList");
  listEl.innerHTML = "로딩 중…";

  // ① 이 스테이지에서 허용된 블록 타입 목록
  const allowedTypes = Array.from(
    new Set(levelBlockSets[levelId].map(b => b.type))
  );

  db.ref(`rankings/${levelId}`)
    .orderByChild("timestamp")
    .once("value", snap => {
      const entries = [];
      snap.forEach(ch => {
        entries.push(ch.val());
        // 반환(return) 문이 없으므로 undefined가 반환되고, forEach는 계속 진행됩니다.
      });

      if (entries.length === 0) {
        listEl.innerHTML = `
        <p>랭킹이 없습니다.</p>
        <div class="modal-buttons">
          <button id="refreshRankingBtn">🔄 새로고침</button>
          <button id="closeRankingBtn">닫기</button>
        </div>
      `;

        document.getElementById("refreshRankingBtn")
          .addEventListener("click", () => showRanking(levelId));
        document.getElementById("closeRankingBtn")
          .addEventListener("click", () =>
            document.getElementById("rankingModal").classList.remove("active")
          );
        return;
      }

      // ③ 클라이언트에서 다중 기준 정렬
      const sumBlocks = e => Object.values(e.blockCounts || {}).reduce((s, x) => s + x, 0);
      entries.sort((a, b) => {
        const aBlocks = sumBlocks(a), bBlocks = sumBlocks(b);
        if (aBlocks !== bBlocks) return aBlocks - bBlocks;            // 블록 합계 오름차순
        if (a.usedWires !== b.usedWires) return a.usedWires - b.usedWires; // 도선 오름차순
        return new Date(a.timestamp) - new Date(b.timestamp);         // 제출 시간 오름차순
      });

      // ② 테이블 헤더 구성
      const headerCols = [
        "<th>순위</th>",
        "<th>닉네임</th>",
        // 이전: <th>블록 사용</th>
        ...allowedTypes.map(t => `<th>${t}</th>`),
        "<th>도선</th>",
        "<th>클리어 시각</th>"
      ].join("");

      // ③ 각 row 구성
      const bodyRows = entries.map((e, i) => {
        // blockCounts에서 타입별 개수 가져오기 (없으면 0)
        const counts = allowedTypes
          .map(t => e.blockCounts?.[t] ?? 0)
          .map(c => `<td>${c}</td>`)
          .join("");

        const timeStr = new Date(e.timestamp).toLocaleString();
        const nickname = e.nickname;
        const displayNickname = nickname.length > 20 ? nickname.slice(0, 20) + '...' : nickname;
        return `
  <tr>
    <td>${i + 1}</td>
    <td>${displayNickname}</td>
    ${counts}
    <td>${e.usedWires}</td>
    <td>${timeStr}</td>
  </tr>`;
      }).join("");

      listEl.innerHTML = `
        <div class="rankingTableWrapper">
          <table>
            <thead><tr>${headerCols}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
        <div class="modal-buttons">
          <button id="refreshRankingBtn">🔄 새로고침</button>
          <button id="closeRankingBtn">닫기</button>
        </div>
      `;
      document.getElementById("refreshRankingBtn")
        .addEventListener("click", () => showRanking(levelId));
      document.getElementById("closeRankingBtn")
        .addEventListener("click", () =>
          document.getElementById("rankingModal").classList.remove("active")
        );
    });

  document.getElementById("rankingModal").classList.add("active");
}



document.getElementById("viewRankingBtn")
  .addEventListener("click", () => {
    if (!currentLevel) {
      alert("먼저 레벨을 선택해주세요.");
    } else {
      showRanking(currentLevel);
    }
  });

document.addEventListener("DOMContentLoaded", () => {
  promptForUsername();
  const uname = localStorage.getItem("username") || "익명";
  document.getElementById("guestUsername").textContent = uname;

  showOverallRanking();  // 전체 랭킹 표시

  const recordBtn = document.getElementById('recordBtn');
  if (recordBtn) recordBtn.addEventListener('click', () => startRecording(WIRE_ANIM_DURATION));
  setupKeyToggles();
});

// 1) 모달과 버튼 요소 참조
const viewSavedBtn = document.getElementById('viewSavedBtn');
const saveCircuitBtn = document.getElementById('saveCircuitBtn');
const savedModal = document.getElementById('savedModal');
const closeSavedModal = document.getElementById('closeSavedModal');
const savedList = document.getElementById('savedList');

saveCircuitBtn.addEventListener('click', () => {
  try {
    saveCircuit();
    alert('회로가 저장되었습니다!');
  } catch (e) {
    alert('저장에 실패했습니다.');
    alert(e);
  }
});

// 2) 저장된 회로 키들 읽어오기
function getSavedKeys() {
  const prefix = `bit_saved_stage_${String(currentLevel).padStart(2, '0')}_`;
  return Object.keys(localStorage)
    .filter(k => k.startsWith(prefix))
    .sort((a, b) => {
      // 키 뒤에 붙은 timestamp(ms) 비교 — 내림차순(최신순)
      const tA = parseInt(a.slice(prefix.length), 10);
      const tB = parseInt(b.slice(prefix.length), 10);
      return tB - tA;
    });
}

// 3) 리스트 그리기
function renderSavedList() {
  const savedList = document.getElementById('savedList');
  savedList.innerHTML = '';
  const keys = getSavedKeys().filter(key => {
    const data = JSON.parse(localStorage.getItem(key));
    return data.stageId === currentLevel;
  });
  if (!keys.length) {
    savedList.innerHTML = '<li>저장된 회로가 없습니다.</li>';
    return;
  }
  keys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    const li = document.createElement('li');
    li.style.margin = '6px 0';
    li.innerHTML = `
      <strong>Stage ${String(data.stageId).padStart(2, '0')}</strong>
      — ${new Date(data.timestamp).toLocaleString()}
      <button data-key="${key}" class="loadBtn">불러오기</button>
      <button data-key="${key}" class="deleteBtn">삭제</button>
    `;
    savedList.appendChild(li);
  });
  document.querySelectorAll('.loadBtn').forEach(btn =>
    btn.addEventListener('click', () => {
      loadCircuit(btn.dataset.key);
      document.getElementById('savedModal').style.display = 'none';
    })
  );
  document.querySelectorAll('.deleteBtn').forEach(btn =>
    btn.addEventListener('click', () => {
      localStorage.removeItem(btn.dataset.key);
      renderSavedList();
    })
  );
}

// 4) 모달 열기/닫기
document.getElementById('viewSavedBtn')
  .addEventListener('click', () => {
    renderSavedList();
    document.getElementById('savedModal').style.display = 'flex';
  });
document.getElementById('closeSavedModal')
  .addEventListener('click', () => {
    document.getElementById('savedModal').style.display = 'none';
  });

// 5) 회로 불러오는 함수
function loadCircuit(key) {
  const data = JSON.parse(localStorage.getItem(key));
  if (!data) return alert('불러오기 실패: 데이터가 없습니다');

  clearGrid();
  clearWires();

  // ① 셀 상태 복원
  const cells = document.querySelectorAll('#grid .cell');
  data.grid.forEach(state => {
    const cell = cells[state.index];
    // 클래스 초기화 후
    cell.className = 'cell';
    // dataset 복원
    if (state.type) cell.dataset.type = state.type;
    if (state.name) cell.dataset.name = state.name;
    if (state.value) cell.dataset.value = state.value;
    // CSS 클래스 복원
    state.classes.forEach(c => cell.classList.add(c));
    // 블록/입력값 텍스트, 핸들러 바인딩
    if (state.type === 'INPUT' || state.type === 'OUTPUT') {
      attachInputClickHandlers(cell);
    }
    if (state.type && state.type !== 'WIRE') {
      cell.classList.add('block');
      if (state.type === 'INPUT')
        cell.textContent = state.name;
        //cell.textContent = `${state.name}(${state.value})`;
      else if (state.type === 'OUTPUT')
        cell.textContent = state.name;
      else
        cell.textContent = state.type;
      cell.draggable = true;
    }
  });

  // ② DOM wire 복원
  data.wires.forEach(w => {
    placeWireAt(w.x, w.y, w.dir);
    const idx = w.y * GRID_COLS + w.x;
    const cell = cells[idx];
  });

  // ── 여기서 wires 배열 복원 ──
  if (data.wiresObj) {
    wires = data.wiresObj.map(obj => ({
      start: cells[obj.startIdx],
      end: cells[obj.endIdx],
      path: obj.pathIdxs.map(i => cells[i])
    }));
    if (wires.some(w => w.path.length <= 2)) {
      clearGrid();
      clearWires();
      alert('invalid circuit!');
      return;
    }
  }
  updateUsedCounts(data.usedBlocks, data.usedWires);
  // ▼ circuit 불러올 때 사용된 INPUT/OUTPUT 블록 아이콘 숨기기
  const panel = document.getElementById('blockPanel');
  // data.grid 에 복원된 셀 상태 중 INPUT/OUTPUT 타입만 골라 이름(name) 리스트 생성
  const usedNames = data.grid
    .filter(state => state.type === 'INPUT' || state.type === 'OUTPUT')
    .map(state => state.name);
  panel.querySelectorAll('.blockIcon').forEach(icon => {
    const type = icon.dataset.type;
    const name = icon.dataset.name;
    // 같은 이름의 INPUT/OUTPUT 아이콘이 있으면 숨김 처리
    if ((type === 'INPUT' || type === 'OUTPUT') && usedNames.includes(name)) {
      icon.style.display = 'none';
    }
  });
}

function highlightOutputErrors() {
  // 1) 기존 에러 표시 제거
  document.querySelectorAll('.cell[data-type="OUTPUT"].error')
    .forEach(el => el.classList.remove('error'));

  // 2) 각 OUTPUT 블록에 들어오는 전선 수 세기
  document.querySelectorAll('.cell[data-type="OUTPUT"]')
    .forEach(block => {
      const incomingCount = wires.filter(w => w.end === block).length;
      if (incomingCount >= 2) {
        block.classList.add('error');
      }
    });
}

function saveCircuit() {
  const data = {
    stageId: currentLevel,
    timestamp: new Date().toISOString(),
    grid: getGridData(),
    wires: getWireData(),

    // 이전: wiresObj 프로퍼티가 없었습니다
    // 추가: 실제 런타임 wires 배열을 저장해서 나중에 그대로 복원
    wiresObj: wires.map(w => ({
      startIdx: Number(w.start.dataset.index),
      endIdx: Number(w.end.dataset.index),
      pathIdxs: w.path.map(c => Number(c.dataset.index))
    })),

    usedBlocks: countUsedBlocks(),
    usedWires: countUsedWires()
  };

  const timestampMs = Date.now();
  const key = `bit_saved_stage_${String(currentLevel).padStart(2, '0')}_${timestampMs}`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Circuit saved: ${key}`, data);
  } catch (e) {
    console.error('Circuit save failed:', e);
    alert('회로 저장 중 오류가 발생했습니다.');
  }
}

function getGridData() {
  return Array.from(document.querySelectorAll('#grid .cell')).map(cell => ({
    index: +cell.dataset.index,
    type: cell.dataset.type || null,
    name: cell.dataset.name || null,
    value: cell.dataset.value || null,
    classes: Array.from(cell.classList).filter(c => c !== 'cell'),
  }));
}

function getWireData() {
  return Array.from(document.querySelectorAll('#grid .cell.wire')).map(cell => {
    const dir = Array.from(cell.classList)
      .find(c => c.startsWith('wire-'))
      .split('-')[1];
    return { x: cell.col, y: cell.row, dir };
  });
}
// 이전: countUsedBlocks 미정의
function countUsedBlocks() {
  return document.querySelectorAll('#grid .cell.block').length;
}

// 이전: countUsedWires 미정의
function countUsedWires() {
  return document.querySelectorAll('#grid .cell.wire').length;
}
// 이전: clearGrid 미정의
function clearGrid() {
  grid.querySelectorAll('.cell.block, .cell.wire')
    .forEach(cell => {
      cell.className = 'cell';
      delete cell.dataset.type;
      cell.textContent = '';
      delete cell.onclick;
    });
}

function clearWires() {

  // 수정: 전역 grid 대상
  grid.querySelectorAll('.cell.wire').forEach(cell => {
    cell.classList.remove('wire');
    Array.from(cell.classList)
      .filter(c => c.startsWith('wire-'))
      .forEach(c => cell.classList.remove(c));
    delete cell.dataset.type;
  });
}
// 이전: placeBlockAt 미정의
function placeBlockAt(x, y, type) {
  const idx = y * GRID_COLS + x;
  // 수정:
  const cell = grid.querySelectorAll('.cell')[idx];
  cell.classList.add('block');
  cell.dataset.type = type;
  if (type === 'INPUT' || type === 'OUTPUT') {
    attachInputClickHandlers(cell);
    //cell.textContent = `${cell.dataset.name || type}(0)`;
    cell.textContent = (cell.dataset.name || type);
  } else {
    cell.textContent = type;
  }
}

// 이전: placeWireAt 미정의
function placeWireAt(x, y, dir) {
  const idx = y * GRID_COLS + x;
  // 수정:
  const cell = grid.querySelectorAll('.cell')[idx];
  cell.classList.add('wire', `wire-${dir}`);
  cell.dataset.type = 'WIRE';
}

function updateUsedCounts(blockCount, wireCount) {
  document.getElementById('usedBlocksCount').textContent = blockCount;
  document.getElementById('usedWiresCount').textContent = wireCount;
}

function attachInputClickHandlers(cell) {
  cell.onclick = () => {
    const val = cell.dataset.value === '1' ? '0' : '1';
    cell.dataset.value = val;
    cell.textContent = cell.dataset.name;
    cell.classList.toggle('active', val === '1');
    evaluateCircuit();
  };
}

function showOverallRanking() {
  const listEl = document.getElementById("overallRankingList");
  listEl.innerHTML = "로딩 중…";

  // rankings 아래 모든 레벨의 데이터를 한 번에 읽어옵니다.
  db.ref("rankings").once("value", snap => {  // :contentReference[oaicite:1]{index=1}
    const data = {};  // { nickname: { stages:Set, blocks:sum, wires:sum, lastTimestamp } }

    snap.forEach(levelSnap => {
      levelSnap.forEach(recSnap => {
        const e = recSnap.val();
        const name = e.nickname || "익명";

        if (!data[name]) {
          data[name] = {
            stages: new Set(),
            blocks: 0,
            wires: 0,
            lastTimestamp: e.timestamp
          };
        }

        data[name].stages.add(levelSnap.key);

        const sumBlocks = Object.values(e.blockCounts || {})
          .reduce((s, x) => s + x, 0);
        data[name].blocks += sumBlocks;
        data[name].wires += e.usedWires || 0;

        // 가장 늦은(=가장 큰) timestamp를 저장
        if (new Date(e.timestamp) > new Date(data[name].lastTimestamp)) {
          data[name].lastTimestamp = e.timestamp;
        }
      });
    });

    // 배열로 변환 후 다중 기준 정렬
    const entries = Object.entries(data).map(([nickname, v]) => ({
      nickname,
      cleared: v.stages.size,
      blocks: v.blocks,
      wires: v.wires,
      timestamp: v.lastTimestamp
    }));
    entries.sort((a, b) => {
      if (a.cleared !== b.cleared) return b.cleared - a.cleared;
      if (a.blocks !== b.blocks) return a.blocks - b.blocks;
      if (a.wires !== b.wires) return a.wires - b.wires;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    // HTML 테이블 생성
    let html = `<table>
  <thead><tr>
    <th>순위</th><th>닉네임</th><th>스테이지</th><th>블럭</th><th>도선</th>
  </tr></thead><tbody>`;

    entries.forEach((e, i) => {
      // 닉네임 잘라내기 로직은 그대로…
      let displayName = e.nickname;
      if (displayName.length > 20) displayName = displayName.slice(0, 20) + '...';

      html += `<tr>
    <td>${i + 1}</td>
    <td>${displayName}</td>
    <td>${e.cleared}</td>
    <td>${e.blocks}</td>
    <td>${e.wires}</td>
  </tr>`;
    });

    html += `</tbody></table>`;
    listEl.innerHTML = html;
  });
}

function showClearedModal(level) {
  const modal = document.getElementById('clearedModal');
  document.getElementById('clearedStageNumber').textContent = level;
  const container = document.getElementById('clearedRanking');

  // 1) 현재 플레이어 닉네임 가져오기 (닉네임 설정 모달에서 localStorage에 저장했다고 가정)
  const currentNickname = localStorage.getItem('username') || localStorage.getItem('nickname') || '';

  const prevBtn = document.getElementById('prevStageBtn');
  const nextBtn = document.getElementById('nextStageBtn');

  prevBtn.disabled = !(levelTitles[level - 1] && isLevelUnlocked(level - 1));
  nextBtn.disabled = !(levelTitles[level + 1] && isLevelUnlocked(level + 1));

  // 2) Firebase Realtime Database에서 랭킹 불러오기
  firebase.database().ref(`rankings/${level}`)
    .orderByChild('timestamp')
    .once('value')
    .then(snapshot => {
      // 데이터가 없으면 안내 메시지
      if (!snapshot.exists()) {
        // … 생략 …
      } else {
        // 1) 결과 배열로 추출
        const entries = [];
        snapshot.forEach(child => {
          entries.push(child.val());
        });

        // ──────────────────────────────────────────────────────────────
        // 2) viewRanking과 동일한 다중 기준 정렬 추가
        const sumBlocks = e => Object.values(e.blockCounts || {}).reduce((s, x) => s + x, 0);
        entries.sort((a, b) => {
          const aBlocks = sumBlocks(a), bBlocks = sumBlocks(b);
          if (aBlocks !== bBlocks) return aBlocks - bBlocks;              // 블록 합계 오름차순
          if (a.usedWires !== b.usedWires) return a.usedWires - b.usedWires; // 도선 수 오름차순
          return new Date(a.timestamp) - new Date(b.timestamp);           // 클리어 시각 오름차순
        });
        // ──────────────────────────────────────────────────────────────

        // 3) 정렬된 entries로 테이블 생성
        let html = `
          <table class="rankingTable">
            <tr><th>순위</th><th>닉네임</th><th>시간</th></tr>
        `;
        entries.forEach((e, i) => {
          const timeStr = new Date(e.timestamp).toLocaleString();
          const cls = (e.nickname === currentNickname) ? 'highlight' : '';
          html += `
            <tr class="${cls}">
              <td>${i + 1}</td>
              <td>${e.nickname}</td>
              <td>${timeStr}</td>
            </tr>
          `;
        });
        html += `</table>`;
        container.innerHTML = html;
      }

      // 버튼 이벤트 바인딩
      document.getElementById('prevStageBtn').onclick = () => {
        modal.style.display = 'none';         // 모달 감추기
        returnToEditScreen();
        startLevel(level - 1);                   // 1보다 작아지지 않도록 클램핑
      };
      document.getElementById('nextStageBtn').onclick = () => {
        modal.style.display = 'none';
        returnToEditScreen();
        startLevel(level + 1);
      };
      modal.querySelector('.closeBtn').onclick = () => {
        modal.style.display = 'none';
      };

      // 모달 띄우기
      modal.style.display = 'flex';
    })
    .catch(err => console.error('랭킹 로드 실패:', err));
}


function isLevelUnlocked(level) {
  const cleared = JSON.parse(localStorage.getItem("clearedLevels") || "[]");
  for (let idx = 0; idx < chapterData.length; idx++) {
    const chap = chapterData[idx];
    if (chap.stages.includes(level)) {
      // 0번째 챕터는 항상 해금, 이후는 이전 챕터 모든 스테이지 클리어 시 해금
      if (idx === 0) return true;
      return chapterData[idx - 1].stages.every(s => cleared.includes(s));
    }
  }
  // chapterData에 정의되지 않은 스테이지(사용자 정의 등)는 기본 허용
  return true;
}

const exitBtn = document.getElementById('exit-module-mode');
const moduleScreen = document.getElementById('module-editor-screen');


exitBtn.addEventListener('click', () => {
  // 1) 모듈 제작창 숨기기
  moduleScreen.style.display = 'none';
  // 2) 모듈 관리창 보이기
  managementScreen.style.display = 'flex';
});
function handleModuleKeyDown(e) {
  // ── 0) “모듈 저장 모달”이 떠 있는 동안은 아무 동작도 하지 않음 ──
  if (moduleSaveModal.style.display === 'flex') {
    return;
  }

  // ── 1) 입력창에 포커스 있을 땐 리턴 (기존 조건) ──
  const active = document.activeElement;
  if (active && active.id === 'moduleNameInput') {
    return;
  }

  // ── 2) Ctrl 키 누르면 wire 드로잉 모드 활성화 ──
  if (e.key === 'Control') {
    isWireDrawing = true;
    moduleStatusToggle.classList.add('active');
  }
  // ── 3) Shift 키 누르면 삭제 모드 활성화 ──
  else if (e.key === 'Shift') {
    isWireDeleting = true;
    moduleDeleteToggle.classList.add('active');
  }
  // ── 4) R 키 누르면 회로 초기화 ──
  else if (e.key.toLowerCase() === 'r') {
    if (confirm('⚠️ 모든 블록과 배선을 삭제하시겠습니까?')) {
      clearGrid();
      initModuleBlockPanel();
    }
  }
}

function handleModuleKeyUp(e) {
  if (e.key === 'Control') {
    isWireDrawing = false
    moduleStatusToggle.classList.remove('active');
    clearWirePreview();         // 반쯤 그려진 wire preview 제거
    wireTrace = [];
  }
  if (e.key === 'Shift') {
    isWireDeleting = false;
    moduleDeleteToggle.classList.remove('active');
  }
}

function getBlockPanel() {
  const moduleScreen = document.getElementById("module-editor-screen");
  if (moduleScreen && moduleScreen.style.display !== "none") {
    return document.getElementById("moduleBlockPanel");
  }
  return document.getElementById("blockPanel");
}
// (1) 필요한 요소들 grab
const saveModuleBtn          = document.getElementById('saveModuleBtn');
const moduleSaveModal        = document.getElementById('moduleSaveModal');
const modalBackdrop          = document.querySelector('#moduleSaveModal .modal-backdrop');
const confirmSaveModuleBtn   = document.getElementById('confirmSaveModuleBtn');
const cancelSaveModuleBtn    = document.getElementById('cancelSaveModuleBtn');
const moduleNameInput        = document.getElementById('moduleNameInput');
const moduleDescInput        = document.getElementById('moduleDescInput');

saveModuleBtn.addEventListener('click', () => {
  // 입력창 비우기
  moduleNameInput.value = '';
  moduleDescInput.value = '';

  // 모달 보이기
  moduleSaveModal.style.display = 'flex';
  moduleNameInput.focus();
});

cancelSaveModuleBtn.addEventListener('click', () => {
  moduleSaveModal.style.display = 'none';
});

modalBackdrop.addEventListener('click', () => {
  moduleSaveModal.style.display = 'none';
});



confirmSaveModuleBtn.addEventListener('click', () => {
  const moduleName = moduleNameInput.value.trim();
  const moduleDesc = moduleDescInput.value.trim();

  // 1) 이름 유효성 검사 (영문/숫자 1~8자)
  if (!/^[A-Za-z0-9]{1,8}$/.test(moduleName)) {
    alert('⚠️ 모듈 이름은 영문자(A–Z, a–z)와 숫자(0–9)만 사용하며, 최대 8자로 입력해주세요.');
    moduleNameInput.focus();
    return;
  }

  // 2) 중복 확인 (기존 키가 있으면 덮어쓰기 확인)
  const key = 'module_' + moduleName;
  if (localStorage.getItem(key)) {
    const overwrite = confirm(`'${moduleName}' 모듈이 이미 존재합니다. 덮어쓰시겠습니까?`);
    if (!overwrite) {
      moduleNameInput.focus();
      return;
    }
  }

  // 3) 저장 로직 실행 (getModuleGridData(), getModuleWireData(), etc.)
  saveModuleData(key, moduleDesc);

  // 4) 저장 완료 알림
  alert(`✅ '${moduleName}' 모듈이 저장되었습니다.`);

  // 5) 모달 닫기
  moduleSaveModal.style.display = 'none';

  // 6) 모듈 제작 화면 숨기기
  moduleScreen.style.display = 'none';

  // 7) 모듈 관리 화면 표시 및 목록 갱신
  managementScreen.style.display = 'flex';
  renderModuleList();
});

// (5) 실제 저장 함수: saveCircuit을 그대로 따라, flow 포함
function saveModuleData(key, description) {
  // (a) 그리드 상태 수집 (셀 index/type/name/value/classes)
  const gridData = getModuleGridData();
  // (b) 전선 상태 수집 (x/y/dir)
  const wireData = getModuleWireData();
  // (c) wiresObj 수집 (startIdx, endIdx, pathIdxs)
  const wiresObjData = wires.map(w => ({
    startIdx: +w.start.dataset.index,
    endIdx:   +w.end.dataset.index,
    pathIdxs: w.path.map(c => +c.dataset.index)
  }));
  // (d) 사용 블록/전선 개수
  const usedBlocks = countUsedBlocks();
  const usedWires  = countUsedWires();

  // (e) 저장할 객체
  const moduleData = {
    timestamp: new Date().toISOString(),
    description: description,
    grid:  gridData,
    wires: wireData,
    wiresObj: wiresObjData,
    usedBlocks: usedBlocks,
    usedWires:  usedWires
  };

  // (f) localStorage에 저장
  localStorage.setItem(key, JSON.stringify(moduleData));
}

const manageModulesBtn         = document.getElementById('manageModulesBtn');
const managementScreen         = document.getElementById('module-management-screen');
const backToMainFromManagement = document.getElementById('backToMainFromManagement');
const createModuleBtn          = document.getElementById('createModuleBtn');
const moduleList               = document.getElementById('moduleList');

//— ① 메인 → 모듈 관리  
manageModulesBtn.addEventListener('click', () => {
  firstScreen.style.display      = 'none';
  managementScreen.style.display = 'flex';
  renderModuleList();
});

//— ② 모듈 관리 → 메인  
backToMainFromManagement.addEventListener('click', () => {
  managementScreen.style.display = 'none';
  firstScreen.style.display      = 'flex';
});

//— ③ 모듈 관리 → 새 제작창  
createModuleBtn.addEventListener('click', () => {
  managementScreen.style.display = 'none';
  moduleScreen.style.display     = 'block';
  initModuleEditor();  // 모듈 에디터 초기화 함수 호출 fileciteturn28file1
});

/**
 * localStorage에서 "module_"로 시작하는 모든 항목을 찾고,
 * <ul id="moduleList"> 아래에 <li>로 렌더링합니다.
 *
 * 저장된 키 형식: "module_<모듈이름>"
 * 화면에 보여줄 모듈 이름: key.substring(7)  (즉, "module_" 뒤부터 끝까지)
 */
function renderModuleList() {
  // 1) 기존 목록 초기화
  moduleList.innerHTML = '';

  // 2) localStorage에 module_로 시작하는 키들만 골라옴
  const moduleKeys = Object.keys(localStorage)
    .filter(key => key.startsWith('module_'))
    .sort(); // 필요하면 정렬 기준을 바꿀 수 있습니다.

  // 3) 저장된 모듈이 하나도 없으면 안내 문구
  if (moduleKeys.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = '저장된 모듈이 없습니다.';
    moduleList.appendChild(emptyMsg);
    return;
  }

  // 4) 각 키마다 <li> 생성
  moduleKeys.forEach(key => {
    // key 예시: "module_AND"
    const moduleName = key.substring(7); // "module_" 뒤부터 끝까지

    // li 요소 생성
    const li = document.createElement('li');
    li.className = 'module-item';

    // 4-1) 모듈 이름 텍스트
    const nameSpan = document.createElement('span');
    nameSpan.className = 'module-name';
    nameSpan.textContent = moduleName;
    li.appendChild(nameSpan);

    // 4-2) 불러오기 버튼
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-load';
    loadBtn.textContent = '불러오기';
    loadBtn.addEventListener('click', () => {
      // (a) 모듈 관리창 감추고, 모듈 제작창 보이기
      managementScreen.style.display = 'none';
      moduleScreen.style.display     = 'block';

      // (b) 에디터 초기화
      initModuleEditor();
      // (c) 저장된 모듈 데이터 로드 (key 전체 사용)
      loadModule(moduleName);
    });
    li.appendChild(loadBtn);

    // 4-3) 삭제 버튼
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', () => {
      const confirmed = confirm(`정말 '${moduleName}' 모듈을 삭제하시겠습니까?`);
      if (!confirmed) return;

      // localStorage에서 해당 키 제거
      localStorage.removeItem(key);
      // 목록 갱신
      renderModuleList();
    });
    li.appendChild(deleteBtn);

    // 4-4) <ul>에 붙이기
    moduleList.appendChild(li);
  });
}


/**
 * localStorage 에 저장된 모듈을 불러와
 * 모듈 제작 모드에 로드합니다.
 * @param {string} moduleName - module_<이름> 으로 저장된 키의 이름(“IN1” 같은 접두사 없이)
 */
function loadModule(moduleKey) {
  moduleKey = 'module_' + moduleKey
  const data = JSON.parse(localStorage.getItem(moduleKey));
  if (!data) return alert('⚠️ 모듈 불러오기 실패: 데이터가 없습니다');

  // 1) 그리드·전선 초기화
  clearGrid();   // 전역 grid 변수 대상 → moduleGrid
  clearWires();

  // 2) 셀 상태 복원
  const cells = grid.querySelectorAll('.cell');
  data.grid.forEach(state => {
    const cell = cells[state.index];
    cell.className = 'cell';
    if (state.type)  cell.dataset.type  = state.type;
    if (state.name)  cell.dataset.name  = state.name;
    if (state.value) cell.dataset.value = state.value;
    // 저장된 모든 CSS 클래스(flow, wire-*, block 등) 복원
    state.classes.forEach(c => cell.classList.add(c));

    // INPUT/OUTPUT이면 클릭 핸들러 바인딩
    if (state.type === 'INPUT' || state.type === 'OUTPUT') {
      attachInputClickHandlers(cell);
    }
    // 블록이면 draggable + 텍스트 표시
    if (state.type && state.type !== 'WIRE') {
      cell.classList.add('block');
      if (state.type === 'INPUT')
        cell.textContent = state.name;
        //cell.textContent = `${state.name}(${state.value})`;
      else if (state.type === 'OUTPUT')
        cell.textContent = state.name;
      else
        cell.textContent = state.type;
      cell.draggable = true;
    }
  });

  // 3) DOM 상 전선 복원
  data.wires.forEach(w => {
    placeWireAt(w.x, w.y, w.dir);
  });

  // 4) wiresObj 복원 (내부 wires 배열)
  if (data.wiresObj) {
    wires = data.wiresObj.map(obj => ({
      start: cells[obj.startIdx],
      end:   cells[obj.endIdx],
      path:  obj.pathIdxs.map(i => cells[i])
    }));
  }

  // 5) 사용량 카운트 업데이트
  updateUsedCounts(data.usedBlocks, data.usedWires);

  // 6) 사용된 INPUT/OUTPUT 아이콘 숨기기
  const panel = document.getElementById('moduleBlockPanel');
  const usedNames = data.grid
    .filter(s => s.type === 'INPUT' || s.type === 'OUTPUT')
    .map(s => s.name);
  panel.querySelectorAll('.blockIcon').forEach(icon => {
    const { type, name } = icon.dataset;
    if ((type === 'INPUT' || type === 'OUTPUT') && usedNames.includes(name)) {
      icon.style.display = 'none';
    }
  });
}

/**
 * 모듈 제작 모드로 들어올 때 호출합니다.
 * setupGrid, clearGrid, setGridDimensions, initModuleBlockPanel, 키 핸들러 바인딩 등을
 * 한 곳에 묶어 두었습니다.
 */
function initModuleEditor() {
  // 0) 화면 전환 (caller 쪽에서 이미 mainScreen 숨기고 moduleScreen 띄우고 있다면 생략 가능)
  mainScreen.style.display   = 'none';
  moduleScreen.style.display = 'block';

  // 1) 모듈 이름 입력창 초기화
  const nameInput = document.getElementById('moduleNameInput');
  nameInput.value = '';

  // 2) 상태 메시지 초기화
  moduleStatusToggle.classList.remove('active');
  moduleDeleteToggle.classList.remove('active');

  // 3) 그리드 초기화 (6×6 고정)
  setupGrid('moduleGrid', 6, 6);
  clearGrid();
  setGridDimensions(6, 6);

  // 4) 블록 패널 초기화
  initModuleBlockPanel();  // 내부에서 moduleBlockPanel을 완전히 재생성합니다

  // 5) 드래그 핸들러 재바인딩
  attachDragHandlersToBlockIcons();

  // 6) 키보드 이벤트 바인딩
  document.addEventListener('keydown', handleModuleKeyDown);
  document.addEventListener('keyup',   handleModuleKeyUp);
}

/**
 * #moduleBlockPanel 안에 모듈용 블록 아이콘을 초기화해서 붙이는 함수입니다.
 * 모듈 제작 모드로 진입할 때 반드시 호출되어야 합니다.
 */
function initModuleBlockPanel() {
  // 1) moduleBlockPanel 요소 grab
  const panel = document.getElementById('moduleBlockPanel');
  panel.innerHTML = ''; // 기존 내용 전부 지우고

  // 2) 기본 블록 목록 정의
  const moduleBlocks = [
    { type: "INPUT",  name: "IN1" },
    { type: "OUTPUT", name: "OUT1" },
    { type: "AND" },
    { type: "OR" },
    { type: "NOT" },
    { type: "JUNCTION" }
  ];

  // 3) 블록 아이콘 생성 및 패널에 추가
  moduleBlocks.forEach(block => {
    const div = document.createElement('div');
    div.className    = 'blockIcon';
    div.draggable    = true;
    div.dataset.type = block.type;
    if (block.name) div.dataset.name = block.name;
    div.textContent = block.name || block.type;
    panel.appendChild(div);
  });

  // 4) 전선 블록도 동일하게 추가
  const wireDiv = document.createElement('div');
  wireDiv.className       = 'blockIcon';
  wireDiv.draggable       = true;
  wireDiv.dataset.type    = 'WIRE';
  wireDiv.textContent     = 'WIRE';
  wireDiv.dataset.tooltip = '전선: [Ctrl] 드래그 설치, [Shift] 클릭 삭제';
  panel.appendChild(wireDiv);

  // 5) 드래그 핸들러 다시 바인딩
  //    이 함수는 기존 attachDragHandlersToBlockIcons 정의를 재사용합니다.
  attachDragHandlersToBlockIcons();
}

// (1) module 전용 그리드 상태 불러오기
function getModuleGridData() {
  return Array.from(
    document.querySelectorAll('#moduleGrid .cell')
  ).map(cell => ({
    index: +cell.dataset.index,
    type:  cell.dataset.type  || null,
    name:  cell.dataset.name  || null,
    value: cell.dataset.value || null,
    classes: Array.from(cell.classList)
                  .filter(c => c !== 'cell')
  }));
}

// (2) module 전용 전선 상태 불러오기
function getModuleWireData() {
  return Array.from(
    document.querySelectorAll('#moduleGrid .cell.wire')
  ).map(cell => {
    const dir = Array.from(cell.classList)
                     .find(c => c.startsWith('wire-'))
                     .split('-')[1];
    return { x: cell.col, y: cell.row, dir };
  });
}

// ======================================
// [수정된 전체 캡처 코드 예시]
// ======================================

// 1. 애니메이션 캡처를 위한 상수 정의
// --------------------------------------
const ANIMATION_DURATION = 1000; // ms (CSS 애니메이션 주기가 1초일 때)
const FPS = 30;                 // 초당 캡처할 프레임 수 (30fps 권장)
const TOTAL_FRAMES = Math.ceil((ANIMATION_DURATION / 1000) * FPS);
const GIF_QUALITY = 10;         // gif.js 인코딩 품질 (0~20, 낮을수록 고화질)

// 2. 메인 그리드(#grid) 캡처 함수
// --------------------------------------
/**
 * 메인 그리드(#grid) 요소 안의 CSS 애니메이션(도선 흐름)을
 * 1주기 동안 매 프레임(html2canvas)으로 캡처하여 GIF로 묶고 다운로드합니다.
 */
async function captureGridGifMain() {
  // 캡처 버튼과 실제 그리드 요소(#grid)를 가져옵니다.
  const captureBtn = document.getElementById('captureGifBtnMain');
  const targetElement = document.getElementById('grid'); // ← 'gridContainer' → 'grid' 로 변경

  // 버튼 혹은 그리드가 없으면 아무것도 하지 않습니다.
  if (!captureBtn || !targetElement) return;

  // 1) 버튼 상태 변경 (비활성화 + 텍스트 변경)
  captureBtn.disabled = true;
  captureBtn.textContent = '캡처 중…';

  // 2) gif.js 초기화
  //    - workerScript 경로가 실제로 브라우저에서 200 응답을 주는지 확인하세요.
  //    - 여기서는 프로젝트 루트 기준 'lib/gif.worker.js'를 사용한다고 가정합니다.
  const gif = new GIF({
    workers: 2,
    quality: GIF_QUALITY,
    workerScript: 'lib/gif.worker.js',     // 반드시 같은 출처에서 제공되는 워커 스크립트 경로
    width: targetElement.offsetWidth,      // #grid 요소의 실제 너비 (px)
    height: targetElement.offsetHeight     // #grid 요소의 실제 높이 (px)
  });

  // 3) 1주기 동안 TOTAL_FRAMES번 루프를 돌면서 캡처
  for (let frameIndex = 0; frameIndex < TOTAL_FRAMES; frameIndex++) {
    // 3-1) CSS 애니메이션이 계속 재생되는 상태이므로, 
    //       일정 시간(ANIMATION_DURATION/TOTAL_FRAMES) 만큼 기다렸다가 캡처
    await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION / TOTAL_FRAMES));

    // 3-2) html2canvas로 현재 화면(#grid 요소)을 캡처
    //       - backgroundColor:null → 투명 배경으로 캡처
    //       - useCORS, allowTaint, foreignObjectRendering 옵션은 필요 시 사용
    const canvas = await html2canvas(targetElement, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true
    });

    // 3-3) 캡처된 캔버스를 GIF의 한 프레임으로 추가
    gif.addFrame(canvas, { delay: Math.round(1000 / FPS) });
  }

  // 4) 모든 프레임을 모았다면 인코딩을 시작
  gif.on('finished', function(blob) {
    // 4-1) Blob → URL → 자동 다운로드
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bit_game_grid_animation.gif';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 4-2) 버튼 상태 원복
    captureBtn.disabled = false;
    captureBtn.textContent = '🖼️ 애니메이션 캡처';
  });

  gif.render();
}

// 3. 모듈 편집 그리드(#moduleGrid) 캡처 함수
// --------------------------------------
/**
 * 모듈 편집 그리드(#moduleGrid) 요소 안의 CSS 애니메이션(도선 흐름)을
 * 1주기 동안 매 프레임(html2canvas)으로 캡처하여 GIF로 묶고 다운로드합니다.
 */
async function captureGridGifModule() {
  // 캡처 버튼과 모듈 그리드 요소(#moduleGrid)를 가져옵니다.
  const captureBtn = document.getElementById('captureGifBtnModule');
  const targetElement = document.getElementById('moduleGrid'); // ← 'moduleGridContainer' → 'moduleGrid' 로 변경

  // 버튼 혹은 모듈 그리드가 없으면 종료
  if (!captureBtn || !targetElement) return;

  // 1) 버튼 상태 변경 (비활성화 + 텍스트 변경)
  captureBtn.disabled = true;
  captureBtn.textContent = '캡처 중…';

  // 2) gif.js 초기화 (메인 그리드와 동일하게 로컬 워커 스크립트 경로 사용)
  const gif = new GIF({
    workers: 2,
    quality: GIF_QUALITY,
    workerScript: 'lib/gif.worker.js',     // 반드시 같은 출처에서 제공되는 워커 스크립트 경로
    width: targetElement.offsetWidth,      // #moduleGrid 너비 (px)
    height: targetElement.offsetHeight     // #moduleGrid 높이 (px)
  });

  // 3) 1주기 동안 TOTAL_FRAMES번 루프
  for (let frameIndex = 0; frameIndex < TOTAL_FRAMES; frameIndex++) {
    // 3-1) 일정 시간 대기
    await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION / TOTAL_FRAMES));

    // 3-2) html2canvas로 현재 화면(#moduleGrid) 캡처
    const canvas = await html2canvas(targetElement, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true
    });

    // 3-3) 캡처된 캔버스를 GIF의 한 프레임으로 추가
    gif.addFrame(canvas, { delay: Math.round(1000 / FPS) });
  }

  // 4) 모든 프레임을 모아서 인코딩 시작
  gif.on('finished', function(blob) {
    // 4-1) Blob → URL → 자동 다운로드
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bit_game_module_grid_animation.gif';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 4-2) 버튼 상태 원복
    captureBtn.disabled = false;
    captureBtn.textContent = '🖼️ 애니메이션 캡처';
  });

  gif.render();
}

// 4. 페이지 로드 시점에 버튼 클릭과 함수 바인딩
// --------------------------------------
const captureMainBtn = document.getElementById('captureGifBtnMain');
if (captureMainBtn) {
  captureMainBtn.addEventListener('click', captureGridGifMain);
}

const captureModuleBtn = document.getElementById('captureGifBtnModule');
if (captureModuleBtn) {
  captureModuleBtn.addEventListener('click', captureGridGifModule);
}
