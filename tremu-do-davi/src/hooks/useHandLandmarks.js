// Importa os Hooks do React
import { useEffect, useRef, useState } from 'react';

// Importa a biblioteca do MediaPipe responsável por detectar as mãos
import { Hands } from '@mediapipe/hands';

// Importa a classe Camera, que captura as imagens da webcam
import { Camera } from '@mediapipe/camera_utils';

// Hook personalizado responsável por inicializar a câmera
// e retornar os pontos (landmarks) da mão detectada.
export function useHandLandmarks() {

  // Referência para o elemento <video>,
  // onde a imagem da webcam será exibida.
  const videoRef = useRef(null);

  // Armazena os 21 pontos (landmarks) da mão.
  // Inicialmente é nulo, pois nenhuma mão foi detectada.
  const [landmarks, setLandmarks] = useState(null);

  // Armazena qual mão foi detectada:
  // "Left" ou "Right".
  const [handedness, setHandedness] = useState(null);

  // Indica se a câmera foi iniciada corretamente.
  const [ready, setReady] = useState(false);

  // Executa apenas uma vez quando o componente é montado.
  useEffect(() => {

    // Cria uma instância do detector de mãos.
    const hands = new Hands({

      // Informa onde estão os arquivos internos
      // necessários para o funcionamento do MediaPipe.
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    // Configurações do detector.
    hands.setOptions({

      // Detecta no máximo uma mão.
      maxNumHands: 1,

      // Complexidade do modelo.
      // 0 = mais rápido
      // 1 = intermediário
      // 2 = mais preciso
      modelComplexity: 1,

      // Confiança mínima para considerar
      // que realmente encontrou uma mão.
      minDetectionConfidence: 0.7,

      // Confiança mínima para continuar rastreando
      // uma mão já detectada.
      minTrackingConfidence: 0.7,
    });

    // Sempre que um frame for processado,
    // este callback será executado.
    hands.onResults((results) => {

      // Verifica se alguma mão foi encontrada.
      if (
        results.multiHandLandmarks &&
        results.multiHandLandmarks.length > 0
      ) {

        // Salva os 21 pontos da primeira mão encontrada.
        setLandmarks(results.multiHandLandmarks[0]);

        // Salva se é mão esquerda ou direita.
        setHandedness(
          results.multiHandedness?.[0]?.label ?? null
        );

      } else {

        // Caso nenhuma mão seja detectada,
        // limpa os estados.
        setLandmarks(null);
        setHandedness(null);
      }
    });

    // Variável que armazenará a câmera.
    let camera;

    // Só cria a câmera quando o elemento <video>
    // já estiver disponível.
    if (videoRef.current) {

      // Inicializa a webcam.
      camera = new Camera(videoRef.current, {

        // Executado a cada frame da câmera.
        onFrame: async () => {

          // Envia a imagem atual para o MediaPipe
          // realizar a detecção da mão.
          await hands.send({
            image: videoRef.current
          });
        },

        // Resolução da captura.
        width: 640,
        height: 480,
      });

      // Liga a câmera.
      camera.start();

      // Indica que tudo foi inicializado.
      setReady(true);
    }

    // Executado quando o componente é destruído.
    return () => {

      // Para a câmera.
      if (camera) {
        camera.stop();
      }

      // Libera recursos do MediaPipe.
      hands.close();
    };

  }, []); // Array vazio => executa apenas uma vez.

  // Retorna os objetos para serem utilizados
  // pelo componente que consumir este Hook.
  return {

    // Referência do vídeo
    videoRef,

    // Lista com os 21 landmarks da mão
    landmarks,

    // Left ou Right
    handedness,

    // Indica se a câmera já está pronta
    ready,
  };
}