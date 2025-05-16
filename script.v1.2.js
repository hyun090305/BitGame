
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
    { type: "OR" }
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
    desc: "선택신호(S1, S0)에 따라 입력 신호 하나를 그대로 출력합니다.",
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

const statusMsg = document.getElementById("wireStatusMsg");
const statusInfo = document.getElementById("wireStatusInfo");
const grid = document.getElementById("grid");

// (2) 페이지 로드 시 INPUT 블록 클릭으로 0↔1 토글 준비
//setupInputToggles();

/*--------------------------------------------------
  3.  Grid 셀 생성 + 기본 Drag&Drop
--------------------------------------------------*/


/*--------------------------------------------------
  4.  Wire 드래그 트래킹
--------------------------------------------------*/
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

// ——— 그리드 밖 마우스 탈출 시 취소 ———
grid.addEventListener('mouseleave', cancelWireDrawing);


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
  isMouseDown = false;

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
      statusMsg.style.display = "none";
      document.getElementById("wireStatusInfo").style.display = "block";
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
  if (startIsBlock && endIsBlock && wireTrace.length > 1 && !hasOldWire) {
    drawWirePath(wireTrace);
  } else {
    // 조건 하나라도 만족 못 하면 전부 취소
    wireTrace.forEach(c => c.classList.remove("wire-preview"));
  }

  // 6) 리셋
  wireTrace = [];
  isWireDrawing = false;
  statusMsg.style.display = "none";
  document.getElementById("wireStatusInfo").style.display = "block";
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
        delete c.dataset.directionLocked;
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
document.addEventListener("click", () => {
  isWireDrawing = false;
  document.getElementById("wireStatusMsg").style.display = "none";
  document.getElementById("wireStatusInfo").style.display = "block";
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
const trash = document.getElementById("trash");
trash.addEventListener("dragover", e => e.preventDefault());
trash.addEventListener("drop", () => {
  if (["INPUT", "OUTPUT"].includes(lastDraggedType)) {
    const icon = document.querySelector(
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

// 아래 함수들은 wire 방향 처리
function updateWireDirections() {
  const cells = document.querySelectorAll(".cell");

  cells.forEach(cell => {
    if (cell.dataset.type !== "WIRE") return;
    if (cell.dataset.directionLocked === "true") return;

    cell.classList.remove("wire-up", "wire-down", "wire-left", "wire-right");
    updateOneWireDirection(cell);
  });
}

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

    applyWireDirection(cell, Array.from(dirs));
    cell.dataset.directionLocked = "true";
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

  updateWireDirections();
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
      cell.textContent = `${cell.dataset.name}(${cell.dataset.value})`;
      cell.addEventListener('click', () => {
        cell.dataset.value = cell.dataset.value === '0' ? '1' : '0';
        cell.textContent = `${cell.dataset.name}(${cell.dataset.value})`;
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
      out.textContent = `${out.dataset.name}(${v ? 1 : 0})`;
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





const mainScreen = document.getElementById("mainScreen");
const levelScreen = document.getElementById("levelScreen");
const gameScreen = document.getElementById("gameScreen");

document.getElementById("startBtn").onclick = () => {
  renderChapterGrid();
  document.getElementById("mainScreen").style.display = "none";
  document.getElementById("chapterScreen").style.display = "block";
};

document.getElementById("backToMainFromChapter").onclick = () => {
  document.getElementById("chapterScreen").style.display = "none";
  document.getElementById("mainScreen").style.display = "block";
};

document.getElementById("backToMainBtn").onclick = () => {
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

document.getElementById("gradeButton").addEventListener("click", () => {
  if (currentLevel != null) gradeLevelAnimated(currentLevel);
});


function startLevel(level) {
  const [rows, cols] = levelGridSizes[level] || [6, 6];
  GRID_ROWS = rows;
  GRID_COLS = cols;
  showLevelIntro(level, () => {
    setupGrid(rows, cols);
    clearGrid();
    setupBlockPanel(level);
    setGridDimensions(level);
    currentLevel = parseInt(level);
    const title = document.getElementById("gameTitle");
    title.textContent = levelTitles[level] ?? `Stage ${level}`;
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
    delete cell.dataset.directionLocked;
  });
  wires = [];  // 전선도 초기화
}

function setupBlockPanel(level) {
  const panel = document.getElementById("blockPanel");
  panel.innerHTML = "";  // 기존 블록 초기화

  const blocks = levelBlockSets[level];
  if (!blocks) return;

  blocks.forEach(block => {
    const div = document.createElement("div");
    div.className = "blockIcon";
    div.draggable = true;
    div.dataset.type = block.type;
    if (block.name) div.dataset.name = block.name;
    div.textContent = block.name || block.type;
    panel.appendChild(div);
  });

  // 숨겨진 WIRE 블록 (필수)
  const wireDiv = document.createElement("div");
  wireDiv.className = "blockIcon";
  wireDiv.draggable = true;
  wireDiv.dataset.type = "WIRE";
  wireDiv.textContent = "WIRE";
  wireDiv.style.display = "none";
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
    });
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Control") {
    isWireDrawing = true;
    document.getElementById("wireStatusMsg").style.display = "block";
    document.getElementById("wireStatusInfo").style.display = "none";
  }
  if (e.key === "Shift") {
    document.getElementById("wireDeleteMsg").style.display = "block";
    document.getElementById("wireDeleteInfo").style.display = "none";
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Control") {
    isWireDrawing = false;
    document.getElementById("wireStatusMsg").style.display = "none";
    document.getElementById("wireStatusInfo").style.display = "block";
    clearWirePreview();  // 드로잉 중 취소 시 미리보기 제거
    wireTrace = [];
  }
  if (e.key === "Shift") {
    document.getElementById("wireDeleteMsg").style.display = "none";
    document.getElementById("wireDeleteInfo").style.display = "block";
  }
});

function getIncomingBlocks(node) {
  const row = node.row;
  const col = node.col;
  const incoming = [];

  const check = (r, c, expectedFlow) => {
    const wire = getCell(r, c);
    if (wire?.classList.contains(expectedFlow)) {
      const src = getBlockNodeFlow(r, c, node);
      if (src) incoming.push(src);
    }
  };

  check(row - 1, col, "flow-down");
  check(row + 1, col, "flow-up");
  check(row, col - 1, "flow-right");
  check(row, col + 1, "flow-left");

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
      input.textContent = `${name}(${value})`;
      input.classList.toggle('active', value === 1);
    });
    evaluateCircuit();
    await new Promise(r => setTimeout(r, 100));



    let correct = true;

    const actualText = Array.from(outputs)
      .map(out => {
        const name = out.dataset.name;
        const actual = out.textContent.match(/\((0|1)\)/)?.[1] ?? "-";
        const expected = String(test.expected[name]);
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
  }
}

function returnToEditScreen() {
  document.getElementById("blockPanel").style.display = "flex";
  document.getElementById("rightPanel").style.display = "block";
  document.getElementById("gradingArea").style.display = "none";
}

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".levelBtn").forEach(btn => {
    const level = btn.dataset.level;
    btn.textContent = levelTitles[level] ?? `Stage ${level}`;
  });
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
  const name = document.getElementById("guestName").value.trim() || "익명";
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
    div.innerHTML = `<b>${e.name}</b> (${new Date(e.time).toLocaleString()}):<br>${e.message}`;
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

  chapterData.forEach(chapter => {
    const card = document.createElement("div");
    card.className = "chapterCard";
    card.innerHTML = `
      <h3>${chapter.name}</h3>
      <p>${chapter.desc}</p>
    `;
    card.onclick = () => {
      renderLevelGrid(chapter.stages);
      document.getElementById("chapterScreen").style.display = "none";
      document.getElementById("levelScreen").style.display = "block";
    };
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

  const grid = document.getElementById("grid");
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
}

function setupGrid(rows, cols) {
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
          cell.textContent = `${cell.dataset.name}(${cell.dataset.value})`;
          // 드롭 시점에 바로 click 리스너 등록
          cell.onclick = () => {
            cell.dataset.value = cell.dataset.value === '0' ? '1' : '0';
            cell.textContent = `${cell.dataset.name}(${cell.dataset.value})`;
            cell.classList.toggle('active', cell.dataset.value === '1');
            evaluateCircuit();
          };
        } else {
          // OUTPUT 초기 표시 (값 미정)
          cell.textContent = `${cell.dataset.name}(-)`;
        }
        cell.draggable = true;
        // 배치된 아이콘 하나만 사라지도록 유지 (다른 INPUT 아이콘엔 영향 없음)
        if (lastDraggedIcon) lastDraggedIcon.style.display = "none";
      }
      else if (type === "WIRE") {
        cell.classList.add("wire");
        cell.dataset.type = "WIRE";
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
              delete c.dataset.directionLocked;
            }
          });
        });

        // (3) wires 배열에서 제거
        wires = wires.filter(w => !targetWires.includes(w));
      }
    });


    cell.style.setProperty('--col', i % GRID_COLS);
    cell.style.setProperty('--row', Math.floor(i / GRID_COLS));

    grid.appendChild(cell);
  }
}

function resetCell(cell) {
  cell.className = "cell";  // 모든 기존 클래스 제거 후 기본 클래스만 유지
  cell.textContent = "";
  delete cell.dataset.type;
  delete cell.dataset.name;
  delete cell.dataset.value;
  delete cell.dataset.directionLocked;
  cell.removeAttribute("draggable");
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
const tutDesc  = document.getElementById("tutDesc");
const tutPrev  = document.getElementById("tutPrevBtn");
const tutNext  = document.getElementById("tutNextBtn");
const tutClose = document.getElementById("tutCloseBtn");
const tutBtn   = document.getElementById("tutorialBtn");
const tutImg = document.getElementById("tutImg");

// 3) 모달 표시 함수
function showTutorial(idx) {
  tutIndex = idx;
  const step = tutorialSteps[idx];
  tutTitle.textContent = step.title;
  tutDesc.textContent  = step.desc;

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
