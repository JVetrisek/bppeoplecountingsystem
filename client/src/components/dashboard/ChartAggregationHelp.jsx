import Icon from '../Icon';

function getAggregationHelpText({ isRoom, range, interval }) {
  const mode =
    interval === 'minute' || range === 'live'
      ? 'live'
      : interval === 'hour' || range === '12h' || range === '24h'
        ? 'hour'
        : 'day';

  if (mode === 'live') {
    if (isRoom) {
      return 'Graf zobrazuje odečty za poslední hodinu v 5minutových blocích — v každém bloku poslední hodnota senzoru místnosti.';
    }
    return 'Graf zobrazuje odečty za poslední hodinu v 5minutových blocích. V každém bloku se sečtou senzory, které v tom intervalu reportovaly. Poslední bod používá stejnou logiku jako karta „Osob v budově“ — součet nejnovějších odečtů z posledních 10 minut (senzor bez čerstvých dat = 0).';
  }

  if (mode === 'hour') {
    if (isRoom) {
      return 'Zobrazujeme průměrnou obsazenost místnosti v jednotlivých hodinách.';
    }
    return 'Zobrazujeme průměrnou obsazenost všech místností dohromady v jednotlivých hodinách.';
  }

  if (isRoom) {
    return 'Zobrazujeme průměrnou obsazenost místnosti v jednotlivých dnech.';
  }
  return 'Zobrazujeme průměrnou obsazenost všech místností dohromady v jednotlivých dnech.';
}

export default function ChartAggregationHelp({ isRoom, range, interval, iconClassName = 'size-5' }) {
  const text = getAggregationHelpText({ isRoom, range, interval });

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center justify-center text-orange-500 drop-shadow-[0_0_7px_rgba(249,115,22,0.45)] transition-all hover:text-orange-400 hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]"
        aria-label="Jak se počítají data v grafu"
      >
        <Icon name="information-circle" className={iconClassName} />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-64 rounded-lg border border-base-300 bg-base-100 p-3 text-xs leading-relaxed text-base-content/80 shadow-lg group-hover:block group-focus-within:block"
      >
        <div className="mb-1 text-xs font-semibold text-orange-500">Agregace dat</div>
        {text}
      </div>
    </div>
  );
}
