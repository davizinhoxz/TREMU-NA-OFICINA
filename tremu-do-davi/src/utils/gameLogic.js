export const WORD_LIST = [
    'CASA', 'BOLO', 'GATO', 'AMOR', 'AMAR', 'GATA', 'LOVE',
    'MESA', 'RUAS', 'SOLO', 'FACA', 'NOME', 'LAGO', 'LUCA', 'LUKA',
];

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 4;

export function pickRandomWord() {
    const idx = Math.floor(Math.random() * WORD_LIST.length);
    return WORD_LIST[idx];
}

export function evaluateGuess(guess, secret) {
    const result = new Array(WORD_LENGTH).fill('absent');
    const secretChars = secret.split('');
    const guessChars = guess.split('');

    const remaining = [...secretChars];
    guessChars.forEach((ch, i) => {
        if (ch === secretChars[i]) {
            result[i] = 'correct';
            remaining[i] = null;
        }
    });

    guessChars.forEach((ch, i) => {
        if (result[i] === 'correct') return;
        const idx = remaining.indexOf(ch);
        if (idx !== -1) {
            result[i] = 'present';
            remaining[idx] = null;
        }
    });

    return result;
}

export function createInitialState() {
    return {
        secret: pickRandomWord(),
        attempts: [],
        currentGuess: '',
        status: 'playing',
    };
}

export function addLetter(state, letter) {
    if (state.status !== 'playing') return state;
    if (state.currentGuess.length >= WORD_LENGTH) return state;

    return {
        ...state,
        currentGuess: state.currentGuess + letter,
    };
}

export function removeLetter(state) {
    if (state.status !== 'playing') return state;
    return {
        ...state,
        currentGuess: state.currentGuess.slice(0, -1),
    };
}

export function submitGuess(state) {
    if (state.status !== 'playing') return state;
    if (state.currentGuess.length !== WORD_LENGTH) return state;

    const feedback = evaluateGuess(state.currentGuess, state.secret);
    const attempts = [...state.attempts, { guess: state.currentGuess, feedback }];

    let status = 'playing';
    if (state.currentGuess === state.secret) {
        status = 'won';
    } else if (attempts.length >= MAX_ATTEMPTS) {
        status = 'lost';
    }

    return {
        ...state,
        attempts,
        currentGuess: '',
        status,
    };
}

export { MAX_ATTEMPTS, WORD_LENGTH };