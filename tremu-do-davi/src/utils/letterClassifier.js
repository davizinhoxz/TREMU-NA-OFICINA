// ============================================================
// Funções auxiliares de geometria
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

// Tamanho de referência da mão (para normalizar distâncias e
// tornar a deteção independente da distância à câmara)
function handSize(lm) {
    return dist(lm[0], lm[9]) || 1;
}

// Ângulo de "dobra" de um dedo:
//  ~0º   -> dedo completamente esticado
//  ~150º -> dedo completamente fechado
function fingerCurl(lm, mcp, pip, tip) {
    return angleBetween(vec(lm[mcp], lm[pip]), vec(lm[pip], lm[tip]));
}

// Abaixo disto = dedo considerado ESTICADO
const EXT_THRESHOLD = 40;
// Acima disto = dedo considerado FECHADO
const CURL_THRESHOLD = 55;

// Posição do polegar ao longo da "linha" formada pelas bases dos
// outros 4 dedos (MCPs). 0 = lado do indicador, 1 = lado do mindinho.
// Como é uma fração relativa, funciona para mão esquerda e direita.
function thumbSpread(lm) {
    const xs = [lm[5].x, lm[9].x, lm[13].x, lm[17].x];
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    if (max - min < 1e-6) return 0.5;
    return (lm[4].x - min) / (max - min);
}

// ============================================================
// Estado dos dedos / polegar
// ============================================================

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
    const thumbToWrist = dist(thumbTip, lm[0]) / size;
    const thumbToIndexTip = dist(thumbTip, lm[8]) / size;
    const thumbToMiddleTip = dist(thumbTip, lm[12]) / size;
    const indexMiddleTipDist = dist(lm[8], lm[12]) / size;

    // polegar bem afastado da palma (ex: L, Y)
    const thumbOut = thumbToIndexMcp > 0.8 && thumbToWrist > 1.05;

    const spread = thumbSpread(lm);

    return {
        size,
        index, middle, ring, pinky,
        indexCurled, middleCurled, ringCurled, pinkyCurled,
        indexCurl, middleCurl, ringCurl, pinkyCurl,
        thumbTip, thumbToIndexMcp, thumbToWrist,
        thumbToIndexTip, thumbToMiddleTip, indexMiddleTipDist,
        thumbOut, spread,
    };
}

// ============================================================
// Regras das letras
//
// Cobrimos: A, B, C, D, E, F, I, K, L, M, O, R, S, T, U, V, W, X, Y
// (M também serve de aproximação para N, ver nota mais abaixo)
//
// Não suportadas (dependem muito da rotação da mão / movimento):
//   G, H, J, N (em separado), P, Q, Z
// Sugestão: na lista de palavras (gameLogic.js), evita estas letras
// ou junta N ao grupo do M.
// ============================================================

const LETTER_RULES = [
    {
        // F: indicador dobrado a tocar o polegar, restantes esticados
        letter: 'F',
        match: (f) =>
            f.middle && f.ring && f.pinky && f.indexCurled &&
            f.thumbToIndexTip < 0.35,
    },
    {
        // B: 4 dedos esticados e juntos, polegar dobrado sobre a palma
        letter: 'B',
        match: (f) => f.index && f.middle && f.ring && f.pinky && !f.thumbOut,
    },
    {
        // R: indicador e médio esticados e cruzados
        letter: 'R',
        match: (f, lm) =>
            f.index && f.middle && f.ringCurled && f.pinkyCurled &&
            (lm[8].x - lm[12].x) * (lm[6].x - lm[10].x) < 0,
    },
    {
        // K: indicador e médio esticados, polegar visível entre eles
        letter: 'K',
        match: (f, lm) =>
            f.index && f.middle && f.ringCurled && f.pinkyCurled &&
            dist(f.thumbTip, lm[9]) / f.size < 0.55 &&
            f.thumbToIndexMcp > 0.35,
    },
    {
        // W: indicador, médio e anelar esticados, mindinho fechado
        letter: 'W',
        match: (f) => f.index && f.middle && f.ring && f.pinkyCurled,
    },
    {
        // U: indicador e médio esticados e próximos
        letter: 'U',
        match: (f) =>
            f.index && f.middle && f.ringCurled && f.pinkyCurled &&
            f.indexMiddleTipDist < 0.3,
    },
    {
        // V: indicador e médio esticados e afastados
        letter: 'V',
        match: (f) =>
            f.index && f.middle && f.ringCurled && f.pinkyCurled &&
            f.indexMiddleTipDist >= 0.3,
    },
    {
        // L: indicador e polegar esticados em "L", restantes fechados
        letter: 'L',
        match: (f) =>
            f.index && f.thumbOut &&
            f.middleCurled && f.ringCurled && f.pinkyCurled,
    },
    {
        // Y: polegar e mindinho esticados, restantes fechados
        letter: 'Y',
        match: (f) =>
            f.pinky && f.thumbOut &&
            f.indexCurled && f.middleCurled && f.ringCurled,
    },
    {
        // D: indicador esticado, polegar a tocar a ponta do médio (fechado)
        letter: 'D',
        match: (f) =>
            f.index && f.middleCurled && f.ringCurled && f.pinkyCurled &&
            f.thumbToMiddleTip < 0.35,
    },
    {
        // I: apenas o mindinho esticado
        letter: 'I',
        match: (f) =>
            f.pinky && !f.thumbOut &&
            f.indexCurled && f.middleCurled && f.ringCurled,
    },
    {
        // X: indicador em "gancho" (parcialmente dobrado), resto fechado
        letter: 'X',
        match: (f) =>
            f.indexCurl > EXT_THRESHOLD && f.indexCurl < CURL_THRESHOLD &&
            f.middleCurled && f.ringCurled && f.pinkyCurled,
    },
    {
        // O: dedos curvados a tocar o polegar, formando um círculo
        letter: 'O',
        match: (f) =>
            f.thumbToIndexTip < 0.3 &&
            f.indexCurl > EXT_THRESHOLD && f.indexCurl < CURL_THRESHOLD + 30 &&
            f.middleCurl > EXT_THRESHOLD,
    },
    {
        // C: mão em forma de "C", todos os dedos parcialmente dobrados
        letter: 'C',
        match: (f) =>
            [f.indexCurl, f.middleCurl, f.ringCurl, f.pinkyCurl].every(
                (c) => c > EXT_THRESHOLD && c < CURL_THRESHOLD + 20
            ),
    },

    // ---------- Grupo do punho fechado: T, A, E, S, M(+N) ----------
    {
        // T: punho fechado, polegar visível entre indicador e médio
        letter: 'T',
        match: (f) =>
            f.indexCurled && f.middleCurled && f.ringCurled && f.pinkyCurled &&
            f.spread > 0.1 && f.spread < 0.45 &&
            f.thumbToIndexMcp > 0.25 && f.thumbToIndexMcp < 0.7,
    },
    {
        // A: punho fechado, polegar encostado ao lado (lado do indicador)
        letter: 'A',
        match: (f) =>
            f.indexCurled && f.middleCurled && f.ringCurled && f.pinkyCurled &&
            f.spread <= 0.15 && !f.thumbOut,
    },
    {
        // E: punho fechado, pontas dos dedos a tocar o polegar
        letter: 'E',
        match: (f) =>
            f.indexCurled && f.middleCurled && f.ringCurled && f.pinkyCurled &&
            f.thumbToIndexTip < 0.3 && f.thumbToMiddleTip < 0.3,
    },
    {
        // S: punho fechado, polegar cruzado à frente dos dedos
        letter: 'S',
        match: (f) =>
            f.indexCurled && f.middleCurled && f.ringCurled && f.pinkyCurled &&
            f.spread > 0.45,
    },
    {
        // M (e aproximação de N): punho fechado, polegar escondido
        // por baixo do indicador/médio/anelar
        letter: 'M',
        match: (f) =>
            f.indexCurled && f.middleCurled && f.ringCurled && f.pinkyCurled,
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
