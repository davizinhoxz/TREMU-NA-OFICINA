const LETTER_GUIDES = [
  { letter: 'A', description: 'Punho fechado, polegar ao lado' },
  { letter: 'B', description: 'Todos os dedos esticados juntos, polegar dobrado' },
  { letter: 'C', description: 'Mão em forma de C' },
  { letter: 'D', description: 'Apenas o indicador esticado' },
  { letter: 'E', description: 'Todos os dedos dobrados para a palma' },
  { letter: 'F', description: 'Indicador e polegar fazem círculo, outros esticados' },
  { letter: 'G', description: 'Indicador aponta para o lado, polegar paralelo' },
  { letter: 'H', description: 'Indicador e médio esticados para o lado' },
  { letter: 'I', description: 'Apenas o mindinho esticado' },
  { letter: 'K', description: 'Indicador e médio esticados, polegar entre eles' },
  { letter: 'L', description: 'Polegar e indicador em L' },
  { letter: 'M', description: 'Três dedos dobrados sobre o polegar' },
  { letter: 'N', description: 'Dois dedos dobrados sobre o polegar' },
  { letter: 'O', description: 'Todos os dedos fazem círculo com o polegar' },
  { letter: 'P', description: 'Como K mas apontado para baixo' },
  { letter: 'Q', description: 'Como G mas apontado para baixo' },
  { letter: 'R', description: 'Indicador e médio cruzados' },
  { letter: 'S', description: 'Punho fechado, polegar sobre os dedos' },
  { letter: 'T', description: 'Polegar entre indicador e médio' },
  { letter: 'U', description: 'Indicador e médio juntos esticados' },
  { letter: 'V', description: 'Indicador e médio em V separados' },
  { letter: 'W', description: 'Indicador, médio e anelar esticados' },
  { letter: 'X', description: 'Indicador dobrado em gancho' },
  { letter: 'Y', description: 'Polegar e mindinho esticados' },
];

export default function InstructionsPanel() {
  return (
    <div className="instructions-panel">
      <p className="instructions-title">Como sinalizar cada letra (ASL)</p>
      <ul className="instructions-list">
        {LETTER_GUIDES.map(({ letter, description }) => (
          <li key={letter} className="instructions-item">
            <span className="instructions-letter">{letter}</span>
            <span className="instructions-text">{description}</span>
          </li>
        ))}
      </ul>
      <p className="instructions-tip">
        Mantenha o gesto firme por um instante — a letra entra
        automaticamente quando a barra de progresso enche.
      </p>
    </div>
  );
}