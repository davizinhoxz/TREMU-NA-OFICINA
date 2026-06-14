// ============================================================
// Normalização dos 21 pontos da mão (landmarks do MediaPipe)
//
// Objetivo: tornar dois gestos comparáveis independentemente
// da posição da mão no ecrã, do tamanho/distância à câmara e
// da rotação 2D da mão.
//
// Passos:
//  1. Translação -> o pulso (ponto 0) fica na origem (0,0,0)
//  2. Escala -> a distância pulso -> base do dedo médio (9) = 1
//  3. Rotação -> essa direção fica sempre a apontar "para cima"
// ============================================================

export function normalizeLandmarks(landmarks) {
    const wrist = landmarks[0];

    // 1. translação
    let pts = landmarks.map((p) => ({
        x: p.x - wrist.x,
        y: p.y - wrist.y,
        z: (p.z ?? 0) - (wrist.z ?? 0),
    }));

    // 2. escala
    const ref = pts[9]; // base do dedo médio
    const scale = Math.hypot(ref.x, ref.y, ref.z) || 1;
    pts = pts.map((p) => ({ x: p.x / scale, y: p.y / scale, z: p.z / scale }));

    // 3. rotação (no plano XY)
    const angle = Math.atan2(pts[9].y, pts[9].x);
    const targetAngle = -Math.PI / 2; // "para cima" no ecrã
    const rot = targetAngle - angle;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    pts = pts.map((p) => ({
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos,
        z: p.z,
    }));

    return pts;
}

// Calcula a média de várias capturas normalizadas (para o "molde"
// de uma letra ficar mais estável e não depender de 1 frame só)
export function averageLandmarkSets(sets) {
    const n = sets.length;
    const points = sets[0].length;
    const avg = [];
    for (let i = 0; i < points; i++) {
        let x = 0, y = 0, z = 0;
        for (const set of sets) {
            x += set[i].x;
            y += set[i].y;
            z += set[i].z;
        }
        avg.push({ x: x / n, y: y / n, z: z / n });
    }
    return avg;
}

// Distância entre duas mãos normalizadas (quanto menor, mais parecidas)
// O eixo Z pesa menos porque é o menos fiável no MediaPipe.
export function landmarkDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const dx = a[i].x - b[i].x;
        const dy = a[i].y - b[i].y;
        const dz = (a[i].z - b[i].z) * 0.3;
        sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return sum / a.length;
}
