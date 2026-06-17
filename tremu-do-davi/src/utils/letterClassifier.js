// Classificador ASL — alfabeto americano
// Pontos MediaPipe: 0=pulso, 1-4=polegar, 5-8=indicador, 9-12=médio,
//                  13-16=anelar, 17-20=mindinho

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function vec(a, b) {
  return { x: b.x - a.x, y: b.y - a.y, z: (b.z ?? 0) - (a.z ?? 0) };
}

function angleBetween(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const m1 = Math.hypot(v1.x, v1.y, v1.z);
  const m2 = Math.hypot(v2.x, v2.y, v2.z);
  if (!m1 || !m2) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / (m1 * m2)))) * 180) / Math.PI;
}

function handSize(lm) {
  return dist(lm[0], lm[9]) || 1;
}

function fingerCurl(lm, mcp, pip, tip) {
  return angleBetween(vec(lm[mcp], lm[pip]), vec(lm[pip], lm[tip]));
}

function between(v, min, max) {
  return v >= min && v <= max;
}

// ---------------------------------------------------------------------------
// Estado da mão
// ---------------------------------------------------------------------------
export function getFingerStates(lm) {
  const size = handSize(lm);

  const indexCurl  = fingerCurl(lm, 5,  6,  8);
  const middleCurl = fingerCurl(lm, 9,  10, 12);
  const ringCurl   = fingerCurl(lm, 13, 14, 16);
  const pinkyCurl  = fingerCurl(lm, 17, 18, 20);

  const index  = indexCurl  < 45;
  const middle = middleCurl < 45;
  const ring   = ringCurl   < 45;
  const pinky  = pinkyCurl  < 45;

  const indexCurled  = indexCurl  > 60;
  const middleCurled = middleCurl > 60;
  const ringCurled   = ringCurl   > 60;
  const pinkyCurled  = pinkyCurl  > 60;

  // Índex semi-dobrado em gancho (X)
  const indexHalfCurled = between(indexCurl, 35, 80);

  const thumbTip = lm[4];

  const thumbToIndexTip  = dist(thumbTip, lm[8])  / size;
  const thumbToMiddleTip = dist(thumbTip, lm[12]) / size;
  const thumbToRingTip   = dist(thumbTip, lm[16]) / size;
  const thumbToIndexMcp  = dist(thumbTip, lm[5])  / size;
  const thumbToMiddleMcp = dist(thumbTip, lm[9])  / size;
  const thumbToRingMcp   = dist(thumbTip, lm[13]) / size;
  const thumbToWrist     = dist(thumbTip, lm[0])  / size;
  const thumbToPinkyMcp  = dist(thumbTip, lm[17]) / size;

  const indexMiddleTipDist = dist(lm[8],  lm[12]) / size;
  const middleRingTipDist  = dist(lm[12], lm[16]) / size;
  const ringPinkyTipDist   = dist(lm[16], lm[20]) / size;

  const fist = indexCurled && middleCurled && ringCurled && pinkyCurled;

  // Polegar claramente para fora — L, Y, G, Q
  const thumbOut = thumbToIndexMcp > 0.70 && thumbToWrist > 0.85;

  // Polegar cruzado sobre os dedos — S, M, N, T, E
  // Usa thumbToPinkyMcp como indicador principal: quando o polegar está
  // cruzado sobre a palma fica perto do mindinho
  const thumbAcrossPalm = thumbToPinkyMcp < 0.85 && thumbToMiddleMcp < 0.70;

  // Polegar ao lado do indicador — A
  const thumbSide = !thumbAcrossPalm && thumbToIndexMcp < 0.95 && thumbToWrist > 0.60;

  // Dedos cruzados — R
  const fingersCrossed = (lm[8].x - lm[12].x) * (lm[6].x - lm[10].x) < 0;

  // Mão apontada para baixo — P, Q
  // tip do indicador claramente abaixo do MCP (em coordenadas de ecrã y cresce para baixo)
  const handPointingDown = lm[8].y > lm[5].y + 0.05;

  // Polegar a tocar ponta do indicador — F, O
  const thumbTouchingIndexTip = thumbToIndexTip < 0.40;

  // Polegar a tocar ponta do médio — D, P, K
  const thumbTouchingMiddleTip = thumbToMiddleTip < 0.45;

  return {
    size,
    index, middle, ring, pinky,
    indexCurled, middleCurled, ringCurled, pinkyCurled,
    indexHalfCurled,
    indexCurl, middleCurl, ringCurl, pinkyCurl,
    thumbToIndexTip, thumbToMiddleTip, thumbToRingTip,
    thumbToIndexMcp, thumbToMiddleMcp, thumbToRingMcp,
    thumbToWrist, thumbToPinkyMcp,
    indexMiddleTipDist, middleRingTipDist, ringPinkyTipDist,
    fist, thumbOut, thumbAcrossPalm, thumbSide,
    fingersCrossed, handPointingDown,
    thumbTouchingIndexTip, thumbTouchingMiddleTip,
  };
}

// ---------------------------------------------------------------------------
// Regras ASL — do mais específico para o mais genérico
// ---------------------------------------------------------------------------
const LETTER_RULES = [

  // ── 4 dedos esticados ────────────────────────────────────────────────────

  // B: todos esticados, polegar dobrado sobre a palma
  {
    letter: 'B',
    match: (f) =>
      f.index && f.middle && f.ring && f.pinky && !f.thumbOut,
  },

  // ── Polegar + 1 dedo ─────────────────────────────────────────────────────

  // L: indicador + polegar para fora, restantes dobrados
  {
    letter: 'L',
    match: (f) =>
      f.index && f.thumbOut &&
      f.middleCurled && f.ringCurled && f.pinkyCurled &&
      !f.handPointingDown,
  },

  // Y: mindinho + polegar para fora, 3 do meio dobrados
  {
    letter: 'Y',
    match: (f) =>
      f.pinky && f.thumbOut &&
      f.indexCurled && f.middleCurled && f.ringCurled,
  },

  // ── 2 dedos esticados ────────────────────────────────────────────────────

  // R: indicador e médio CRUZADOS
  {
    letter: 'R',
    match: (f) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      f.fingersCrossed,
  },

  // H: indicador e médio juntos, apontados horizontalmente para o lado
  //    (tip do indicador na mesma altura do MCP — mão tombada para o lado)
  {
    letter: 'H',
    match: (f, lm) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      !f.fingersCrossed &&
      f.indexMiddleTipDist < 0.30 &&
      Math.abs(lm[8].y - lm[5].y) < 0.10,
  },

// K: indicador e médio esticados, polegar entre eles verticalmente
{
  letter: 'K',
  match: (f, lm) =>
    f.index && f.middle &&
    f.ringCurled && f.pinkyCurled &&
    !f.fingersCrossed &&
    f.indexMiddleTipDist >= 0.20 &&
    // polegar está entre o indicador e o médio em Y
    lm[4].y > Math.min(lm[8].y, lm[12].y) &&
    lm[4].y < Math.max(lm[8].y, lm[12].y),
},

  // U: indicador e médio esticados e JUNTOS (< 0.30, valor original que funcionava)
  {
    letter: 'U',
    match: (f) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      !f.fingersCrossed &&
      f.indexMiddleTipDist < 0.30,
  },

  // V: indicador e médio esticados e SEPARADOS
  {
    letter: 'V',
    match: (f) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      !f.fingersCrossed &&
      f.indexMiddleTipDist >= 0.30,
  },

  // ── 3 dedos esticados ────────────────────────────────────────────────────

  // W: indicador + médio + anelar esticados, mindinho dobrado
  {
    letter: 'W',
    match: (f) =>
      f.index && f.middle && f.ring && f.pinkyCurled,
  },

  // ── Forma de pinça / anel ────────────────────────────────────────────────

  // F: médio + anelar + mindinho esticados, indicador dobrado, polegar toca indicador
  {
    letter: 'F',
    match: (f) =>
      f.middle && f.ring && f.pinky &&
      f.indexCurled &&
      f.thumbTouchingIndexTip,
  },

  // O: todos curvados, polegar toca indicador
  {
    letter: 'O',
    match: (f) =>
      f.thumbTouchingIndexTip &&
      f.indexCurl  > 40 &&
      f.middleCurl > 40 &&
      f.ringCurl   > 30 &&
      f.pinkyCurl  > 25,
  },

  // C: todos curvados em arco, polegar NÃO toca indicador
  {
    letter: 'C',
    match: (f) =>
      !f.fist &&
      !f.thumbTouchingIndexTip &&
      between(f.indexCurl,  30, 150) &&
      between(f.middleCurl, 30, 150) &&
      between(f.ringCurl,   30, 160) &&
      between(f.pinkyCurl,  30, 170) &&
      f.thumbToIndexTip > 0.40 &&
      f.thumbToIndexTip < 1.20,
  },

  // ── 1 dedo esticado ──────────────────────────────────────────────────────

  // D: indicador esticado, polegar toca médio
  {
    letter: 'D',
    match: (f) =>
      f.index &&
      f.middleCurled && f.ringCurled && f.pinkyCurled &&
      f.thumbTouchingMiddleTip,
  },

  // X: indicador em gancho (semi-dobrado), restantes fechados
  {
    letter: 'X',
    match: (f) =>
      f.indexHalfCurled &&
      f.middleCurled && f.ringCurled && f.pinkyCurled,
  },

  // I: só mindinho esticado, polegar não para fora
  {
    letter: 'I',
    match: (f) =>
      f.pinky &&
      f.indexCurled && f.middleCurled && f.ringCurled &&
      !f.thumbOut,
  },

  // ── Mão apontada para baixo ──────────────────────────────────────────────

  // P: indicador + médio para baixo, polegar toca médio
  {
    letter: 'P',
    match: (f) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      f.handPointingDown &&
      f.thumbTouchingMiddleTip,
  },

  // Q: indicador + polegar paralelos apontados para baixo (G virado)
  {
    letter: 'Q',
    match: (f) =>
      f.index &&
      f.middleCurled && f.ringCurled && f.pinkyCurled &&
      f.handPointingDown &&
      f.thumbToIndexTip < 0.70,
  },

  // G: indicador + polegar para fora, mão para o lado (não para baixo)
  {
    letter: 'G',
    match: (f) =>
      f.index && f.thumbOut &&
      f.middleCurled && f.ringCurled && f.pinkyCurled &&
      !f.handPointingDown,
  },

  // ── Punho fechado — ordem crítica: do mais específico para o mais geral ──

  // E: punho, polegar cruzado, perto das pontas dos dedos
  {
    letter: 'E',
    match: (f) =>
      f.fist &&
      f.thumbAcrossPalm &&
      f.thumbToIndexTip < 0.45 &&
      f.thumbToMiddleTip < 0.52,
  },


  // N: punho, polegar entre médio e anelar
  {
    letter: 'N',
    match: (f) =>
      f.fist &&
      f.thumbAcrossPalm &&
      f.thumbToMiddleMcp < 0.62 &&
      f.thumbToRingMcp   >= 0.60,
  },

  // M: punho, polegar sob 3 dedos (perto do anelar)
  {
    letter: 'M',
    match: (f) =>
      f.fist &&
      f.thumbAcrossPalm &&
      f.thumbToRingMcp < 0.68,
  },

  // T: punho, polegar entre indicador e médio
{
  letter: 'T',
  match: (f) =>
    f.fist &&
    f.thumbToIndexMcp < 0.62 &&
    f.thumbToMiddleMcp >= 0.60,
},

// A: punho, polegar ao lado (não cruzado)  ← vem depois do T
{
  letter: 'A',
  match: (f) =>
    f.fist && f.thumbSide && !f.thumbAcrossPalm &&
    f.thumbToIndexMcp > 0.60,
},

  // S: punho fechado, polegar cruzado (caso geral — apanha o resto)
  {
    letter: 'S',
    match: (f) =>
      f.fist && f.thumbAcrossPalm,
  },
];

// ---------------------------------------------------------------------------
export function classifyLetter(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const fingers = getFingerStates(landmarks);
  for (const rule of LETTER_RULES) {
    if (rule.match(fingers, landmarks)) return rule.letter;
  }
  return null;
}