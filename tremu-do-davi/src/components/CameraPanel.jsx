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

const STABLE_FRAMES_REQUIRED = 18;
const UNLOCK_FRAMES_REQUIRED = 10;

export default function CameraPanel({ onLetterConfirmed, disabled }) {
  const { videoRef, landmarks, ready } = useHandLandmarks();
  const canvasRef = useRef(null);

  const [currentLetter, setCurrentLetter] = useState(null);
  const [stableCount, setStableCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  const lastCandidateRef = useRef(null);
  const stableCountRef = useRef(0);
  const lockedRef = useRef(false);
  const unlockCountRef = useRef(0);
  const lastConfirmedRef = useRef(null);

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

  useEffect(() => {
    if (disabled) {
      setCurrentLetter(null);
      setStableCount(0);
      setLocked(false);
      setDebugInfo(null);
      lastCandidateRef.current = null;
      stableCountRef.current = 0;
      lockedRef.current = false;
      unlockCountRef.current = 0;
      lastConfirmedRef.current = null;
      return;
    }

    const letter = classifyLetter(landmarks);
    setCurrentLetter(letter);

    if (showDebug && landmarks) {
      setDebugInfo(getFingerStates(landmarks));
    } else if (showDebug) {
      setDebugInfo(null);
    }

    // Anti-duplicação real: depois de confirmar uma letra, só volta a aceitar
    // outra quando a mão desaparecer/ficar sem gesto reconhecido por alguns frames.
    if (lockedRef.current) {
      if (letter === null) {
        unlockCountRef.current += 1;
      } else {
        unlockCountRef.current = 0;
      }

      if (unlockCountRef.current >= UNLOCK_FRAMES_REQUIRED) {
        lockedRef.current = false;
        lastConfirmedRef.current = null;
        setLocked(false);
      }

      stableCountRef.current = 0;
      lastCandidateRef.current = letter;
      setStableCount(0);
      return;
    }

    if (letter === null) {
      stableCountRef.current = 0;
      lastCandidateRef.current = null;
      setStableCount(0);
      return;
    }

    // A contagem só sobe se for a MESMA letra em frames seguidos.
    // Antes o contador subia mesmo quando o classificador alternava A/M/S.
    if (letter !== lastCandidateRef.current) {
      lastCandidateRef.current = letter;
      stableCountRef.current = 1;
    } else {
      stableCountRef.current += 1;
    }

    setStableCount(stableCountRef.current);

    if (stableCountRef.current >= STABLE_FRAMES_REQUIRED) {
      if (letter !== lastConfirmedRef.current) {
        onLetterConfirmed?.(letter);
        lastConfirmedRef.current = letter;
      }

      lockedRef.current = true;
      unlockCountRef.current = 0;
      stableCountRef.current = 0;
      setStableCount(0);
      setLocked(true);
    }
  }, [landmarks, disabled, onLetterConfirmed, showDebug]);

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
          <div className="letter-indicator locked-indicator">
            <span style={{ fontSize: '0.85rem' }}>
              ✅ Letra confirmada — retire a mão da câmera para continuar
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
thumbAcrossPalm: ${debugInfo.thumbAcrossPalm}
thumbSide:   ${debugInfo.thumbSide}
letra:      ${currentLetter ?? '-'}`}
        </pre>
      )}
    </div>
  );
}
