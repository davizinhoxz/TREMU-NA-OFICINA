import { useEffect, useRef, useState } from 'react';
import { useHandLandmarks } from '../hooks/useHandLandmarks';
import { classifyLetter } from '../utils/letterClassifier';

// Pares de pontos que formam as "ossos" da mão — usados para desenhar
// as linhas entre as juntas no canvas (esqueleto da mão).
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // polegar
  [0, 5], [5, 6], [6, 7], [7, 8],         // indicador
  [5, 9], [9, 10], [10, 11], [11, 12],    // médio
  [9, 13], [13, 14], [14, 15], [15, 16],  // anelar
  [13, 17], [17, 18], [18, 19], [19, 20], // mindinho
  [0, 17],                                 // base da palma
];

// Número de frames consecutivos com a mesma letra para confirmar o gesto.
// A ~30fps, 33 frames ≈ 1,1 segundos de gesto estável.
const STABLE_FRAMES_REQUIRED = 33;

export default function CameraPanel({ onLetterConfirmed, disabled }) {
  const { videoRef, landmarks, ready } = useHandLandmarks();
  const canvasRef = useRef(null);

  const [currentLetter, setCurrentLetter] = useState(null);
  const [stableCount, setStableCount] = useState(0);
  const [locked, setLocked] = useState(false); // true após confirmar uma letra

  // Refs para controlo frame-a-frame (sem re-renders desnecessários)
  const lastCandidateRef = useRef(null);   // última letra detetada
  const stableCountRef = useRef(0);        // contador de frames estáveis
  const lockedRef = useRef(false);         // se está bloqueado após confirmação
  const unlockCountRef = useRef(0);        // não usado ativamente mas reservado
  const lastConfirmedRef = useRef(null);   // última letra confirmada (anti-duplicação)

  // ── Desenho do canvas ──────────────────────────────────────────────────
  // Loop de animação que espelha o vídeo horizontalmente e desenha
  // o esqueleto da mão (pontos + linhas) sobre a imagem da câmera.
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let animationId;

    const draw = () => {
      const ctx = canvas.getContext('2d');

      // Ajusta o canvas à resolução real da câmera
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Espelha horizontalmente para o utilizador ver como num espelho
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      if (landmarks) {
        // Desenha as linhas entre as juntas da mão
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 2;
        HAND_CONNECTIONS.forEach(([a, b]) => {
          const pa = landmarks[a];
          const pb = landmarks[b];
          ctx.beginPath();
          // (1 - p.x) inverte o eixo X para corresponder ao espelhamento do vídeo
          ctx.moveTo((1 - pa.x) * canvas.width, pa.y * canvas.height);
          ctx.lineTo((1 - pb.x) * canvas.width, pb.y * canvas.height);
          ctx.stroke();
        });

        // Desenha os 21 pontos (juntas) da mão
        ctx.fillStyle = '#18181b';
        landmarks.forEach((p) => {
          ctx.beginPath();
          ctx.arc((1 - p.x) * canvas.width, p.y * canvas.height, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [landmarks, videoRef]);

  // ── Lógica de reconhecimento e confirmação de letra ───────────────────
  useEffect(() => {
    // Se o jogo terminou (ganhou/perdeu), reseta tudo
    if (disabled) {
      setCurrentLetter(null);
      setStableCount(0);
      setLocked(false);
      lastCandidateRef.current = null;
      stableCountRef.current = 0;
      lockedRef.current = false;
      unlockCountRef.current = 0;
      lastConfirmedRef.current = null;
      return;
    }

    const letter = classifyLetter(landmarks);
    setCurrentLetter(letter);

    // Se já confirmou uma letra, fica bloqueado até a mão sair do campo de visão
    if (lockedRef.current) {
      if (!landmarks || letter === null) {
        // Mão saiu — desbloqueia para aceitar o próximo gesto
        lockedRef.current = false;
        lastConfirmedRef.current = null;
        unlockCountRef.current = 0;
        stableCountRef.current = 0;
        lastCandidateRef.current = null;

        setLocked(false);
        setStableCount(0);
        setCurrentLetter(null);
        return;
      }

      // Mão ainda visível — mantém bloqueado, reseta contadores
      unlockCountRef.current = 0;
      stableCountRef.current = 0;
      lastCandidateRef.current = letter;
      setStableCount(0);
      return;
    }

    // Sem gesto reconhecido — reseta o contador
    if (letter === null) {
      stableCountRef.current = 0;
      lastCandidateRef.current = null;
      setStableCount(0);
      return;
    }

    // Letra diferente da anterior — reinicia a contagem do zero
    if (letter !== lastCandidateRef.current) {
      lastCandidateRef.current = letter;
      stableCountRef.current = 1;
    } else {
      // Mesma letra em frames consecutivos — incrementa o contador
      stableCountRef.current += 1;
    }

    setStableCount(stableCountRef.current);

    // Atingiu o limiar de estabilidade — confirma a letra
    if (stableCountRef.current >= STABLE_FRAMES_REQUIRED) {
      // Evita confirmar a mesma letra duas vezes seguidas
      if (letter !== lastConfirmedRef.current) {
        onLetterConfirmed?.(letter);
        lastConfirmedRef.current = letter;
      }

      // Bloqueia até a mão sair
      lockedRef.current = true;
      unlockCountRef.current = 0;
      stableCountRef.current = 0;
      setStableCount(0);
      setLocked(true);
    }
  }, [landmarks, disabled, onLetterConfirmed]);

  // Progresso da barra: 0 a 1 (1 = confirmado)
  const progress = locked ? 1 : Math.min(stableCount / STABLE_FRAMES_REQUIRED, 1);

  return (
    <div className="camera-panel">
      {/* Vídeo oculto — serve apenas de fonte para o canvas */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline />

      <div className="camera-frame">
        <canvas ref={canvasRef} className="camera-canvas" />

        {/* Overlay enquanto a câmera ainda não está pronta */}
        {!ready && <div className="camera-overlay">Iniciando câmera...</div>}

        {/* Indicador da letra atual + barra de progresso */}
        {currentLetter && (
          <div className="letter-indicator">
            <span className="letter-detected">{currentLetter}</span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Mensagem após confirmação — pede para retirar a mão */}
        {locked && (
          <div className="letter-indicator locked-indicator">
            <span style={{ fontSize: '0.85rem' }}>
              ✅ Letra confirmada — retire a mão da câmera para continuar
            </span>
          </div>
        )}
      </div>
    </div>
  );
}