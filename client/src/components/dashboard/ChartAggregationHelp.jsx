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
      return 'Živý graf zobrazuje jednotlivá měření senzoru v pětiminutových intervalech.';
    }
    return 'Každých 5 minut sečteme obsazenost všech místností. Poslední bod odpovídá aktuálnímu součtu osob v budově.';
  }

  if (mode === 'hour') {
    if (isRoom) {
      return 'Pro každou hodinu (např. 14:00) zobrazujeme průměr měření senzoru v okně 13:30–14:30.';
    }
    return 'Pro každou hodinu (např. 14:00) vezmeme 12 pětiminutových bloků v okně 13:30–14:30. V každém bloku sečteme obsazenost všech místností a z těchto součtů vypočítáme průměr.';
  }

  if (isRoom) {
    return 'Pro každý den zobrazujeme průměr všech měření senzoru v daném dni.';
  }
  return 'Pro každý den průměrujeme všechny pětiminutové bloky za celý den. V každém bloku sečteme obsazenost všech místností a z těchto hodnot vypočítáme denní průměr.';
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
