// Classificador por geometria dos 21 pontos da mão

function vec(a, b) {
  return { x: b.x - a.x, y: b.y - a.y, z: (b.z ?? 0) - (a.z ?? 0) };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function angleBetween(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const m1 = Math.hypot(v1.x, v1.y, v1.z);
  const m2 = Math.hypot(v2.x, v2.y, v2.z);
  if (!m1 || !m2) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
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

export function getFingerStates(lm) {
  const size = handSize(lm);

  const indexCurl = fingerCurl(lm, 5, 6, 8);
  const middleCurl = fingerCurl(lm, 9, 10, 12);
  const ringCurl = fingerCurl(lm, 13, 14, 16);
  const pinkyCurl = fingerCurl(lm, 17, 18, 20);

  const index = indexCurl < 45;
  const middle = middleCurl < 45;
  const ring = ringCurl < 45;
  const pinky = pinkyCurl < 45;

  const indexCurled = indexCurl > 60;
  const middleCurled = middleCurl > 60;
  const ringCurled = ringCurl > 60;
  const pinkyCurled = pinkyCurl > 60;

  const thumbTip = lm[4];

  const thumbToIndexTip = dist(thumbTip, lm[8]) / size;
  const thumbToMiddleTip = dist(thumbTip, lm[12]) / size;
  const thumbToIndexMcp = dist(thumbTip, lm[5]) / size;
  const thumbToMiddleMcp = dist(thumbTip, lm[9]) / size;
  const thumbToRingMcp = dist(thumbTip, lm[13]) / size;
  const thumbToWrist = dist(thumbTip, lm[0]) / size;
  const indexMiddleTipDist = dist(lm[8], lm[12]) / size;

  const fist = indexCurled && middleCurled && ringCurled && pinkyCurled;
  const thumbOut = thumbToIndexMcp > 0.70 && thumbToWrist > 0.85;
  const thumbAcrossPalm = thumbToMiddleMcp < thumbToIndexMcp || thumbToMiddleMcp < 0.60;
  const thumbSide = !thumbAcrossPalm && thumbToIndexMcp < 0.95 && thumbToWrist > 0.60;

  return {
    size,
    index,
    middle,
    ring,
    pinky,
    indexCurled,
    middleCurled,
    ringCurled,
    pinkyCurled,
    indexCurl,
    middleCurl,
    ringCurl,
    pinkyCurl,
    thumbTip,
    thumbToIndexTip,
    thumbToMiddleTip,
    thumbToIndexMcp,
    thumbToMiddleMcp,
    thumbToRingMcp,
    thumbToWrist,
    indexMiddleTipDist,
    fist,
    thumbOut,
    thumbAcrossPalm,
    thumbSide,
  };
}

const LETTER_RULES = [
  {
    letter: 'F',
    match: (f) =>
      f.middle && f.ring && f.pinky &&
      f.indexCurled &&
      f.thumbToIndexTip < 0.40,
  },
  {
    letter: 'B',
    match: (f) =>
      f.index && f.middle && f.ring && f.pinky &&
      !f.thumbOut,
  },
  {
    letter: 'R',
    match: (f, lm) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      (lm[8].x - lm[12].x) * (lm[6].x - lm[10].x) < 0,
  },
  {
    letter: 'W',
    match: (f) =>
      f.index && f.middle && f.ring && f.pinkyCurled,
  },
  {
    letter: 'U',
    match: (f) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      f.indexMiddleTipDist < 0.30,
  },
  {
    letter: 'V',
    match: (f) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      f.indexMiddleTipDist >= 0.30,
  },
  {
    letter: 'L',
    match: (f) =>
      f.index && f.thumbOut &&
      f.middleCurled && f.ringCurled && f.pinkyCurled,
  },
  {
    letter: 'Y',
    match: (f) =>
      f.pinky && f.thumbOut &&
      f.indexCurled && f.middleCurled && f.ringCurled,
  },
  {
    letter: 'D',
    match: (f) =>
      f.index &&
      f.middleCurled && f.ringCurled && f.pinkyCurled &&
      f.thumbToMiddleTip < 0.45,
  },
  {
    letter: 'I',
    match: (f) =>
      f.pinky &&
      f.indexCurled && f.middleCurled && f.ringCurled &&
      !f.thumbOut,
  },
  {
    letter: 'X',
    match: (f) =>
      between(f.indexCurl, 40, 90) &&
      f.middleCurled && f.ringCurled && f.pinkyCurled,
  },
  {
    letter: 'O',
    match: (f) =>
      f.thumbToIndexTip < 0.32 &&
      f.indexCurl > 40 &&
      f.middleCurl > 40,
  },
  {
    letter: 'C',
    match: (f) =>
      !f.fist &&
      f.thumbToIndexTip >= 0.32 &&
      f.thumbToIndexTip <= 1.10 &&
      between(f.indexCurl, 35, 150) &&
      between(f.middleCurl, 35, 150) &&
      between(f.ringCurl, 35, 160) &&
      between(f.pinkyCurl, 35, 170),
  },

  // Punho fechado: ordem importante
  {
    letter: 'E',
    match: (f) =>
      f.fist &&
      f.thumbToIndexTip < 0.45 &&
      f.thumbToMiddleTip < 0.50,
  },
  {
    letter: 'A',
    match: (f) =>
      f.fist &&
      f.thumbSide &&
      !f.thumbAcrossPalm,
  },
  {
    letter: 'M',
    match: (f) =>
      f.fist &&
      f.thumbAcrossPalm &&
      f.thumbToMiddleMcp < 0.65,
  },
  {
    letter: 'T',
    match: (f) =>
      f.fist &&
      f.thumbAcrossPalm &&
      f.thumbToIndexMcp < 0.65 &&
      f.thumbToMiddleMcp >= 0.65,
  },
  {
    letter: 'S',
    match: (f) =>
      f.fist &&
      f.thumbAcrossPalm,
  },

  // Letras difíceis/inclinadas
  {
    letter: 'G',
    match: (f) =>
      f.index &&
      f.middleCurled && f.ringCurled && f.pinkyCurled &&
      f.thumbOut,
  },
  {
    letter: 'H',
    match: (f) =>
      f.index && f.middle &&
      f.ringCurled && f.pinkyCurled &&
      f.indexMiddleTipDist < 0.45,
  },
  {
    letter: 'P',
    match: (f, lm) =>
      f.index &&
      f.middle &&
      f.ringCurled &&
      f.pinkyCurled &&
      lm[8].y > lm[5].y,
  },
  {
    letter: 'Q',
    match: (f, lm) =>
      f.index &&
      f.middleCurled &&
      f.ringCurled &&
      f.pinkyCurled &&
      f.thumbOut &&
      lm[8].y > lm[5].y,
  },
];

export function classifyLetter(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const fingers = getFingerStates(landmarks);

  for (const rule of LETTER_RULES) {
    if (rule.match(fingers, landmarks)) {
      return rule.letter;
    }
  }

  return null;
}