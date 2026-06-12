import { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export function useHandLandmarks() {
  const videoRef = useRef(null);
  const [landmarks, setLandmarks] = useState(null);
  const [handedness, setHandedness] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setLandmarks(results.multiHandLandmarks[0]);
        setHandedness(results.multiHandedness?.[0]?.label ?? null);
      } else {
        setLandmarks(null);
        setHandedness(null);
      }
    });

    let camera;
    if (videoRef.current) {
      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
      setReady(true);
    }

    return () => {
      camera && camera.stop();
      hands.close();
    };
  }, []);

  return { videoRef, landmarks, handedness, ready };
}