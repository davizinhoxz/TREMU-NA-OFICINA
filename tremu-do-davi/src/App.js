import { useCallback, useState } from 'react';
import './App.css';
import CameraPanel from './components/CameraPanel';
import GameGrid from './components/GameGrid';
import InstructionsPanel from './components/InstructionsPanel';
import {
  createInitialState,
  addLetter,
  removeLetter,
  submitGuess,
  WORD_LENGTH,
} from './utils/gameLogic';

function App() {
  const [state, setState] = useState(createInitialState);

  const handleLetterConfirmed = useCallback((letter) => {
    setState((prev) => {
      let next = addLetter(prev, letter);
      if (next.currentGuess.length === WORD_LENGTH) {
        next = submitGuess(next);
      }
      return next;
    });
  }, []);

  const handleRemoveLetter = () => {
    setState((prev) => removeLetter(prev));
  };

  const handleRestart = () => {
    setState(createInitialState());
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          <span className="title-accent">SINAL</span>WORDLE
        </h1>
        <p className="subtitle">JOGO DE PALAVRAS EM LÍNGUA GESTUAL PORTUGUESA</p>
        <p className="status-message">
          {state.status === 'playing' &&
            'Faça o sinal de cada letra para a câmera. As letras entram automaticamente.'}
          {state.status === 'won' && '🎉 Acertou! A palavra era ' + state.secret}
          {state.status === 'lost' && '😢 Não foi desta vez. A palavra era ' + state.secret}
        </p>
      </header>

      <main className="main-content">
        <section className="left-panel">
          <h2 className="panel-title">CÂMERA</h2>
          <CameraPanel
            onLetterConfirmed={handleLetterConfirmed}
            disabled={state.status !== 'playing'}
          />
          <div className="camera-controls">
            <button onClick={handleRemoveLetter} disabled={state.status !== 'playing'}>
              ⬅ Apagar letra
            </button>
            {state.status !== 'playing' && (
              <button onClick={handleRestart}>🔄 Jogar de novo</button>
            )}
          </div>
        </section>

        <section className="right-panel">
          <h2 className="panel-title">RESULTADO</h2>
          <GameGrid attempts={state.attempts} currentGuess={state.currentGuess} />
          <InstructionsPanel />
        </section>
      </main>
    </div>
  );
}

export default App;