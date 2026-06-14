// ============================================================
// Classificador simples por geometria dos 21 pontos da mão
// Foco desta versão: mais estabilidade e melhor separação A / S / M.
// ============================================================

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
    if (m1 === 0 || m2 === 0) return 0;
    const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)));
    return (Math.acos(cos) * 180) / Math.PI;
}

function handSize(lm) {
    return dist(lm[0], lm[9]) || 1;
}

function fingerCurl(lm, mcp, pip, tip) {
    return angleBetween(vec(lm[mcp], lm[pip]), vec(lm[pip], lm[tip]));
}

const EXT_THRESHOLD = 40;
const CURL_THRESHOLD = 55;

function thumbSpread(lm) {
    const xs = [lm[5].x, lm[9].x, lm[13].x, lm[17].x];
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    if (max - min < 1e-6) return 0.5;
    return (lm[4].x - min) / (max - min);
}

function between(value, a, b) {
    return value >= a && value <= b;
}

export function getFingerStates(lm) {
    const size = handSize(lm);

    const indexCurl = fingerCurl(lm, 5, 6, 8);
    const middleCurl = fingerCurl(lm, 9, 10, 12);
    const ringCurl = fingerCurl(lm, 13, 14, 16);
    const pinkyCurl = fingerCurl(lm, 17, 18, 20);

    const index = indexCurl < EXT_THRESHOLD;
    const middle = middleCurl < EXT_THRESHOLD;
    const ring = ringCurl < EXT_THRESHOLD;
    const pinky = pinkyCurl < EXT_THRESHOLD;

    const indexCurled = indexCurl > CURL_THRESHOLD;
    const middleCurled = middleCurl > CURL_THRESHOLD;
    const ringCurled = ringCurl > CURL_THRESHOLD;
    const pinkyCurled = pinkyCurl > CURL_THRESHOLD;

    const thumbTip = lm[4];
    const thumbToIndexMcp = dist(thumbTip, lm[5]) / size;
    const thumbToMiddleMcp = dist(thumbTip, lm[9]) / size;
    const thumbToRingMcp = dist(thumbTip, lm[13]) / size;
    const thumbToWrist = dist(thumbTip, lm[0]) / size;
    const thumbToIndexTip = dist(thumbTip, lm[8]) / size;
    const thumbToMiddleTip = dist(thumbTip, lm[12]) / size;
    const indexMiddleTipDist = dist(lm[8], lm[12]) / size;
    const thumbToPalmCenter = dist(thumbTip, lm[9]) / size;

    const thumbOut = thumbToIndexMcp > 0.75 && thumbToWrist > 0.95;
    const spread = thumbSpread(lm);

    // Valores usados para diferenciar punho fechado:
    // A = polegar do lado de fora / ao lado do indicador.
    // S = polegar cruzado por cima da palma.
    // M = polegar mais escondido/central.
    const thumbAcrossPalm = thumbToPalmCenter < 0.55 || thumbToMiddleMcp < thumbToIndexMcp;
    const thumbSide = !thumbAcrossPalm && thumbToIndexMcp < 0.95 && thumbToWrist > 0.65;
    const fist = indexCurled && middleCurled && ringCurled && pinkyCurled;

    return {
        size,
        index, middle, ring, pinky,
        indexCurled, middleCurled, ringCurled, pinkyCurled,
        indexCurl, middleCurl, ringCurl, pinkyCurl,
        thumbTip, thumbToIndexMcp, thumbToMiddleMcp, thumbToRingMcp, thumbToWrist,
        thumbToIndexTip, thumbToMiddleTip, indexMiddleTipDist, thumbToPalmCenter,
        thumbOut, spread, thumbAcrossPalm, thumbSide, fist,
    };
}

const LETTER_RULES = [
    {
        letter: 'F',
        match: (f) =>
            f.middle && f.ring && f.pinky && f.indexCurled &&
            f.thumbToIndexTip < 0.35,
    },
    {
        letter: 'B',
        match: (f) => f.index && f.middle && f.ring && f.pinky && !f.thumbOut,
    },
    {
        letter: 'R',
        match: (f, lm) =>
            f.index && f.middle && f.ringCurled && f.pinkyCurled &&
            (lm[8].x - lm[12].x) * (lm[6].x - lm[10].x) < 0,
    },
    {
        letter: 'K',
        match: (f, lm) =>
            f.index && f.middle && f.ringCurled && f.pinkyCurled &&
            dist(f.thumbTip, lm[9]) / f.size < 0.55 &&
            f.thumbToIndexMcp > 0.35,
    },
    {
        letter: 'W',
        match: (f) => f.index && f.middle && f.ring && f.pinkyCurled,
    },
    {
        letter: 'U',
        match: (f) =>
            f.index && f.middle && f.ringCurled && f.pinkyCurled &&
            f.indexMiddleTipDist < 0.3,
    },
    {
        letter: 'V',
        match: (f) =>
            f.index && f.middle && f.ringCurled && f.pinkyCurled &&
            f.indexMiddleTipDist >= 0.3,
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
            f.index && f.middleCurled && f.ringCurled && f.pinkyCurled &&
            f.thumbToMiddleTip < 0.35,
    },
    {
        letter: 'I',
        match: (f) =>
            f.pinky && !f.thumbOut &&
            f.indexCurled && f.middleCurled && f.ringCurled,
    },
    {
        letter: 'X',
        match: (f) =>
            between(f.indexCurl, EXT_THRESHOLD, CURL_THRESHOLD) &&
            f.middleCurled && f.ringCurled && f.pinkyCurled,
    },
    {
        letter: 'O',
        match: (f) =>
            f.thumbToIndexTip < 0.3 &&
            f.indexCurl > EXT_THRESHOLD && f.indexCurl < CURL_THRESHOLD + 30 &&
            f.middleCurl > EXT_THRESHOLD,
    },
    {
        letter: 'C',
        match: (f) =>
            [f.indexCurl, f.middleCurl, f.ringCurl, f.pinkyCurl].every(
                (c) => c > EXT_THRESHOLD && c < CURL_THRESHOLD + 20
            ),
    },

    // Punho fechado: regras mais restritivas para evitar A virar S/M.
    {
        letter: 'T',
        match: (f) =>
            f.fist &&
            f.spread > 0.15 && f.spread < 0.45 &&
            f.thumbToIndexMcp > 0.25 && f.thumbToIndexMcp < 0.7 &&
            f.thumbAcrossPalm,
    },
    {
        // A: punho fechado com polegar ao lado, não cruzado por cima da palma.
        // Esta regra agora vem antes de S/M e não depende apenas do spread,
        // porque o spread oscilava muito com mão esquerda/direita e rotação.
        letter: 'A',
        match: (f) =>
            f.fist &&
            f.thumbSide &&
            !f.thumbAcrossPalm &&
            f.thumbToIndexTip > 0.28 &&
            f.thumbToMiddleTip > 0.28,
    },
    {
        letter: 'E',
        match: (f) =>
            f.fist &&
            f.thumbToIndexTip < 0.28 && f.thumbToMiddleTip < 0.28,
    },
    {
        // S: punho fechado com polegar cruzado claramente à frente/centro.
        letter: 'S',
        match: (f) =>
            f.fist &&
            f.thumbAcrossPalm &&
            f.thumbToPalmCenter < 0.58,
    },
    {
        // M: deixado como fallback do punho fechado, para não roubar o A.
        letter: 'M',
        match: (f) => f.fist && !f.thumbSide,
    },
];

export function classifyLetter(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;

    const fingers = getFingerStates(landmarks);

    for (const rule of LETTER_RULES) {
        if (rule.match && rule.match(fingers, landmarks)) {
            return rule.letter;
        }
    }

    return null;
}
