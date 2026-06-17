# TREMU-NA-OFICINA
Teste

criar projeto react
npx create-react-app .

# SinalWordle

Jogo de palavras estilo Wordle em que o jogador sinaliza cada letra com a mão para a câmera, usando o alfabeto ASL (American Sign Language). 

---

## Tecnologias

- **React 19** (Create React App)
- **MediaPipe Hands** — deteção dos 21 pontos da mão em tempo real
- **JavaScript ES2022** — classificador geométrico e lógica do jogo
- **CSS Vanilla** — sem frameworks de estilos

---

## Estrutura do Projeto

```
src/
  App.js                  # Componente raiz, estado global do jogo
  components/
    CameraPanel.jsx        # Captura de vídeo e reconhecimento de gestos
    GameGrid.jsx           # Grelha de tentativas com feedback de cor
    InstructionsPanel.jsx  # Guia visual do alfabeto ASL
  hooks/
    useHandLandmarks.js    # Integração com MediaPipe
  utils/
    gameLogic.js           # Lógica do jogo (estado, palavras, avaliação)
    letterClassifier.js    # Classificador geométrico de letras ASL
  handNormalize.js         # Utilitários de normalização de landmarks
public/
  signs/                   # Imagens do alfabeto ASL (A.png … Y.png)
```

---

## Como Funciona

1. A câmera capta o vídeo a ~30fps
2. O MediaPipe deteta os 21 pontos da mão em cada frame
3. O classificador calcula métricas geométricas (curl dos dedos, distâncias, ângulos) e aplica as regras ASL
4. Após 33 frames consecutivos com a mesma letra (~1,1 segundos), a letra é confirmada
5. Com 4 letras confirmadas, a tentativa é submetida automaticamente
6. O jogo dá feedback por cor em cada célula: verde (certa no lugar certo), amarelo (certa no lugar errado), preto (não existe)

---

## Classificador de Letras

O reconhecimento não usa machine learning próprio — é um classificador baseado em regras geométricas sobre os pontos do MediaPipe. Para cada frame, a função `getFingerStates()` calcula:

- **Curl de cada dedo** — ângulo na junta PIP (0° = esticado, 90°+ = dobrado)
- **Distâncias do polegar** — à ponta e à base de cada dedo, normalizadas pelo tamanho da mão
- **Flags compostas** — `fist`, `thumbOut`, `thumbAcrossPalm`, `fingersCrossed`, `handPointingDown`

As regras em `LETTER_RULES` são avaliadas por ordem; a primeira que fizer match devolve a letra. A ordem é crítica — regras mais específicas têm de vir antes das mais genéricas.

**Letras suportadas:** A B C D E F G H I K L M N O P Q R S T U V W X Y  
**Não suportadas:** J e Z (requerem movimento, impossível num frame estático)

---

## Lógica do Jogo

- Palavras de **4 letras** em português, maiúsculas
- Máximo de **6 tentativas**
- A palavra é escolhida aleatoriamente de uma lista com mais de 200 palavras
- O estado é gerido de forma imutável através das funções `addLetter`, `removeLetter`, `submitGuess` e `evaluateGuess`

---

## Instalação e Uso

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm start

# Build de produção
npm run build
```

A pasta `build/` gerada pode ser hospedada diretamente em Netlify, Aquele Vercel que o professor falou ;) , GitHub Pages ou qualquer servidor estático.

---

## Limitações

- J e Z não são suportados (requerem movimento)
- O reconhecimento é sensível à iluminação — ambientes escuros reduzem a precisão
- Desenhado para uma mão de cada vez