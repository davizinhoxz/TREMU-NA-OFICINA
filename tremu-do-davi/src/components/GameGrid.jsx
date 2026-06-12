import { MAX_ATTEMPTS, WORD_LENGTH } from '../utils/gameLogic';

const FEEDBACK_CLASS = {
  correct: 'cell-correct',
  present: 'cell-present',
  absent: 'cell-absent',
};

export default function GameGrid({ attempts, currentGuess }) {
  const rows = [];

  attempts.forEach((attempt, i) => {
    rows.push(
      <div className="grid-row" key={`done-${i}`}>
        {attempt.guess.split('').map((letter, j) => (
          <div
            key={j}
            className={`grid-cell ${FEEDBACK_CLASS[attempt.feedback[j]]}`}
          >
            {letter}
          </div>
        ))}
      </div>
    );
  });

  if (attempts.length < MAX_ATTEMPTS) {
    const cells = [];
    for (let j = 0; j < WORD_LENGTH; j++) {
      const letter = currentGuess[j] || '';
      cells.push(
        <div
          key={j}
          className={`grid-cell ${letter ? 'cell-filled' : 'cell-empty'}`}
        >
          {letter}
        </div>
      );
    }
    rows.push(
      <div className="grid-row" key="current">
        {cells}
      </div>
    );
  }

  const remaining = MAX_ATTEMPTS - rows.length;
  for (let i = 0; i < remaining; i++) {
    const cells = [];
    for (let j = 0; j < WORD_LENGTH; j++) {
      cells.push(<div key={j} className="grid-cell cell-empty" />);
    }
    rows.push(
      <div className="grid-row" key={`empty-${i}`}>
        {cells}
      </div>
    );
  }

  return <div className="game-grid">{rows}</div>;
}