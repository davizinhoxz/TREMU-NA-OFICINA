function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z ?? 0) - (b.z ?? 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isFingerExtended(landmarks, tipIdx, mcpIdx) {
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const mcp = landmarks[mcpIdx];
    return dist(tip, wrist) > dist(mcp, wrist) * 1.15;
}

function isThumbOpen(landmarks) {
    const thumbTip = landmarks[4];
    const indexMcp = landmarks[5];
    return dist(thumbTip, indexMcp) > 0.08;
}

function isTipNearPalm(landmarks, tipIdx) {
    const tip = landmarks[tipIdx];
    const palm = landmarks[0];
    return dist(tip, palm) < 0.12;
}

function isTipNearTip(landmarks, tipIdx1, tipIdx2) {
    return dist(landmarks[tipIdx1], landmarks[tipIdx2]) < 0.05;
}

function getFingerStates(landmarks) {
    return {
        thumb: isThumbOpen(landmarks),
        index: isFingerExtended(landmarks, 8, 5),
        middle: isFingerExtended(landmarks, 12, 9),
        ring: isFingerExtended(landmarks, 16, 13),
        pinky: isFingerExtended(landmarks, 20, 17),
    };
}

const LETTER_RULES = [
    {
        // A: punho fechado, polegar ao lado
        letter: 'A',
        match: (f) => !f.thumb && !f.index && !f.middle && !f.ring && !f.pinky,
    },
    {
        // B: todos os dedos esticados juntos, polegar dobrado
        letter: 'B',
        match: (f) => !f.thumb && f.index && f.middle && f.ring && f.pinky,
    },
    {
        // C: mão em forma de C (todos semi-dobrados)
        letter: 'C',
        match: (f, lm) =>
            !f.index && !f.middle && !f.ring && !f.pinky &&
            dist(lm[8], lm[4]) > 0.06 && dist(lm[8], lm[4]) < 0.15,
    },
    {
        // D: indicador esticado, outros dobrados, polegar toca no médio
        letter: 'D',
        match: (f) => !f.thumb && f.index && !f.middle && !f.ring && !f.pinky,
    },
    {
        // E: todos os dedos dobrados para a palma
        letter: 'E',
        match: (f, lm) =>
            !f.index && !f.middle && !f.ring && !f.pinky &&
            isTipNearPalm(lm, 8) && isTipNearPalm(lm, 12),
    },
    {
        // F: indicador e polegar fazem círculo, outros esticados
        letter: 'F',
        match: (f, lm) =>
            !f.index && f.middle && f.ring && f.pinky &&
            isTipNearTip(lm, 4, 8),
    },
    {
        // G: indicador aponta para o lado, polegar paralelo
        letter: 'G',
        match: (f, lm) =>
            f.index && !f.middle && !f.ring && !f.pinky &&
            Math.abs(lm[8].y - lm[5].y) < 0.04,
    },
    {
        // H: indicador e médio esticados para o lado
        letter: 'H',
        match: (f, lm) =>
            f.index && f.middle && !f.ring && !f.pinky &&
            Math.abs(lm[8].y - lm[5].y) < 0.05,
    },
    {
        // I: apenas o mindinho esticado
        letter: 'I',
        match: (f) => !f.thumb && !f.index && !f.middle && !f.ring && f.pinky,
    },
    {
        // J: como I mas com movimento (usamos posição estática do I)
        // Ignoramos J por ser letra de movimento
    },
    {
        // K: indicador e médio esticados, polegar entre eles
        letter: 'K',
        match: (f) => f.thumb && f.index && f.middle && !f.ring && !f.pinky,
    },
    {
        // L: polegar e indicador em L
        letter: 'L',
        match: (f) => f.thumb && f.index && !f.middle && !f.ring && !f.pinky,
    },
    {
        // M: três dedos dobrados sobre o polegar
        letter: 'M',
        match: (f, lm) =>
            !f.index && !f.middle && !f.ring && !f.pinky &&
            lm[8].y > lm[5].y && lm[12].y > lm[9].y && lm[16].y > lm[13].y,
    },
    {
        // N: dois dedos dobrados sobre o polegar
        letter: 'N',
        match: (f, lm) =>
            !f.index && !f.middle && !f.ring && !f.pinky &&
            lm[8].y > lm[5].y && lm[12].y > lm[9].y &&
            !(lm[16].y > lm[13].y),
    },
    {
        // O: todos os dedos fazem círculo com o polegar
        letter: 'O',
        match: (f, lm) =>
            !f.index && !f.middle && !f.ring && !f.pinky &&
            isTipNearTip(lm, 4, 8),
    },
    {
        // P: como K mas apontado para baixo
        letter: 'P',
        match: (f, lm) =>
            f.thumb && f.index && f.middle && !f.ring && !f.pinky &&
            lm[8].y > lm[5].y,
    },
    {
        // Q: como G mas apontado para baixo
        letter: 'Q',
        match: (f, lm) =>
            f.thumb && f.index && !f.middle && !f.ring && !f.pinky &&
            lm[8].y > lm[5].y,
    },
    {
        // R: indicador e médio cruzados
        letter: 'R',
        match: (f, lm) =>
            f.index && f.middle && !f.ring && !f.pinky &&
            Math.abs(lm[8].x - lm[12].x) < 0.03,
    },
    {
        // S: punho fechado, polegar sobre os dedos
        letter: 'S',
        match: (f, lm) =>
            f.thumb && !f.index && !f.middle && !f.ring && !f.pinky &&
            lm[4].y > lm[8].y,
    },
    {
        // T: polegar entre indicador e médio
        letter: 'T',
        match: (f, lm) =>
            f.thumb && !f.index && !f.middle && !f.ring && !f.pinky &&
            lm[4].y < lm[8].y,
    },
    {
        // U: indicador e médio juntos esticados
        letter: 'U',
        match: (f, lm) =>
            !f.thumb && f.index && f.middle && !f.ring && !f.pinky &&
            dist(lm[8], lm[12]) < 0.05,
    },
    {
        // V: indicador e médio em V (separados)
        letter: 'V',
        match: (f, lm) =>
            !f.thumb && f.index && f.middle && !f.ring && !f.pinky &&
            dist(lm[8], lm[12]) >= 0.05,
    },
    {
        // W: indicador, médio e anelar esticados
        letter: 'W',
        match: (f) => !f.thumb && f.index && f.middle && f.ring && !f.pinky,
    },
    {
        // X: indicador dobrado em gancho
        letter: 'X',
        match: (f, lm) =>
            !f.thumb && !f.index && !f.middle && !f.ring && !f.pinky &&
            lm[8].y > lm[6].y && lm[8].y < lm[5].y,
    },
    {
        // Y: polegar e mindinho esticados
        letter: 'Y',
        match: (f) => f.thumb && !f.index && !f.middle && !f.ring && f.pinky,
    },
    {
        // Z: movimento (ignoramos, letra de movimento)
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

export { getFingerStates };