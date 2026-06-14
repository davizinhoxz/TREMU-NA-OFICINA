import { useEffect, useRef, useState } from 'react';
import { useHandLandmarks } from '../hooks/useHandLandmarks';
import { classifyLetter, getFingerStates } from '../utils/letterClassifier';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const STABLE_FRAMES_REQUIRED = 15;

export default function CameraPanel({ onLetterConfirmed, disabled }) {
  const { videoRef, landmarks, ready } = useHandLandmarks();
  const canvasRef = useRef(null);

  const [currentLetter, setCurrentLetter] = useState(null);
  const [stableCount, setStableCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // ---- desenhar a câmara + esqueleto da mão ----
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let animationId;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      if (landmarks) {
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 2;
        HAND_CONNECTIONS.forEach(([a, b]) => {
          const pa = landmarks[a];
          const pb = landmarks[b];
          ctx.beginPath();
          ctx.moveTo((1 - pa.x) * canvas.width, pa.y * canvas.height);
          ctx.lineTo((1 - pb.x) * canvas.width, pb.y * canvas.height);
          ctx.stroke();
        });

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

  // ---- classificação da letra + lógica anti-duplicados ----
  useEffect(() => {
    if (disabled) {
      setCurrentLetter(null);
      setStableCount(0);
      setLocked(false);
      setDebugInfo(null);
      return;
    }

    const letter = classifyLetter(landmarks);
    setCurrentLetter(letter);

    if (showDebug && landmarks) {
      setDebugInfo(getFingerStates(landmarks));
    } else if (showDebug) {
      setDebugInfo(null);
    }

    // Se está bloqueado (já confirmámos uma letra), só desbloqueia
    // quando a mão deixar de mostrar um gesto reconhecido
    // (ou seja, o utilizador relaxa/muda a mão antes da próxima letra)
    if (locked) {
      if (letter === null) {
        setLocked(false);
      }
      setStableCount(0);
      return;
    }

    if (letter === null) {
      setStableCount(0);
      return;
    }

    setStableCount((prev) => {
      const next = prev + 1;
      if (next >= STABLE_FRAMES_REQUIRED) {
        onLetterConfirmed?.(letter);
        setLocked(true);
        return 0;
      }
      return next;
    });
  }, [landmarks, disabled, onLetterConfirmed, locked, showDebug]);

  const progress = locked ? 1 : Math.min(stableCount / STABLE_FRAMES_REQUIRED, 1);

  return (
    <div className="camera-panel">
      <video ref={videoRef} style={{ display: 'none' }} playsInline />

      <div className="camera-frame">
        <canvas ref={canvasRef} className="camera-canvas" />

        {!ready && <div className="camera-overlay">Iniciando câmera...</div>}

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

        {locked && (
          <div className="letter-indicator" style={{ marginTop: 4 }}>
            <span style={{ fontSize: '0.85rem' }}>
              ✅ Letra confirmada — muda o gesto para continuar
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowDebug((v) => !v)}
        style={{ marginTop: 8, fontSize: '0.8rem' }}
      >
        {showDebug ? 'Ocultar' : 'Mostrar'} dados técnicos
      </button>

      {showDebug && debugInfo && (
        <pre
          style={{
            marginTop: 6,
            fontSize: '0.7rem',
            background: '#18181b',
            color: '#a1a1aa',
            padding: 8,
            borderRadius: 6,
            overflowX: 'auto',
          }}
        >
{`indexCurl:  ${debugInfo.indexCurl.toFixed(1)}
middleCurl: ${debugInfo.middleCurl.toFixed(1)}
ringCurl:   ${debugInfo.ringCurl.toFixed(1)}
pinkyCurl:  ${debugInfo.pinkyCurl.toFixed(1)}
spread:     ${debugInfo.spread.toFixed(2)}
thumbToIndexMcp:  ${debugInfo.thumbToIndexMcp.toFixed(2)}
thumbToIndexTip:  ${debugInfo.thumbToIndexTip.toFixed(2)}
thumbToMiddleTip: ${debugInfo.thumbToMiddleTip.toFixed(2)}
thumbOut:   ${debugInfo.thumbOut}
letra:      ${currentLetter ?? '-'}`}
        </pre>
      )}
    </div>
  );
}
