export const WORD_LIST = [
  'CASA','BOLO','GATO','AMOR','AMAR','GATA','LOVE',
  'MESA','RUAS','SOLO','FACA','NOME','LAGO','LUCA','LUKA',

  'ABRA','ABRE','ACHA','ACHE','ACHO','AGUA','ALMA','ALTO','ANEL','ANJO','ARCO','ARTE','AZUL',

  'BALA','BATE','BELO','BICO','BIFE','BOCA','BOLA','BOTA','BRIO','BUZO',

  'CAIR','CALA','CALO','CAMA','CANO','CAPA','CARA','CARO','CASO',
  'CEGO','CEIA','CENA','CERA','CIMA','COCO','COPO','CORA','CORO','COTA','CRUZ','CURA',

  'DADO','DAMA','DANO','DEDO','DEUS','DICA','DINO','DOCE','DOMA', 'DAVI',

  'EIRA','ELMO','ERRO','ESTA','ESTE',

  'FADA','FALA','FARO','FATO','FAVA','FEIO','FERA','FILA','FINA','FINO',
  'FITA','FOCA','FOGO','FOME','FORA','FOTO','FRIO','FUGA','FUMA',

  'GALO','GAMA','GATO','GEMA','GIRA','GIRO','GOLE','GOMA','GRAO',

  'HORA',

  'ILHA','INDO','IRMA','ISCA',

  'JACA','JOIA','JOGO','JOTA','JUCA','JURO',

  'KILO',

  'LADO','LATA','LEAO','LEME','LEVE','LIMA','LIMO','LIRA','LISO',
  'LIXO','LOBO','LODO','LOJA','LOTA','LUTA','LUVA',

  'MACA','MAGO','MALA','MAPA','MATO','MEDO','MEIA','MESA','MICO','MIMO',
  'MINA','MIRA','MODA','MOLA','MOLE','MORA','MOTO','MURO',

  'NADA','NATA','NAVE','NEGO','NETA','NETO','NINA','NINO','NOEL',
  'NOJO','NOME','NOTA','NOVA','NOVO','NUCA',

  'OBRA','OCAS','OLHO','ONDA','ORCA','ORLA','OSSO','OURO',

  'PACA','PAGO','PAIS','PANO','PAPA','PARA','PATO','PEAO','PELE',
  'PELO','PENA','PESO','PICA','PICO','PINO','PIPA','PISO','POCO',
  'POLO','POMO','PORO','PULO',

  'QUER',

  'RABO','RACA','RAIO','RALO','RAMO','RARO','RATO','REDE','REMO',
  'RENA','RICA','RICO','RIMA','RISO','ROCA','RODA','ROLO','ROSA',
  'ROTA','RUBI','RUGA','RUMO',

  'SACO','SAGA','SALA','SAPO','SECA','SEDE','SELO','SINO','SOFA',
  'SOLA','SOLO','SONO','SUCO','SUJO',

  'TACO','TALA','TALO','TAPA','TATO','TEIA','TELA','TEMA','TETO',
  'TIPO','TIRO','TOCA','TOCO','TOGA','TOLO','TOMO','TOPO','TORA',
  'TORO','TRIO','TUDO',

  'UNHA','URSO','USAR',

  'VACA','VALE','VELA','VELO','VERA','VIDA','VIGA','VILA','VINO',
  'VIRA','VISA','VIVA','VIVE','VOAR','VOCE','VOLE',

  'XALE','XEPA',

  'ZAGA','ZEBU','ZERO','ZONA'
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