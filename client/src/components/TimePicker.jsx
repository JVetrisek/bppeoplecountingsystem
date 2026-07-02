import { useId, useMemo } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseTime(value) {
  const [hour = '0', minute = '0'] = (value || '00:00').split(':');
  return {
    hour: Math.min(23, Math.max(0, Number(hour) || 0)),
    minute: Math.min(59, Math.max(0, Number(minute) || 0)),
  };
}

export default function TimePicker({ value, onChange, className = '' }) {
  const buttonId = useId().replace(/:/g, '');
  const popoverId = useId().replace(/:/g, '');
  const anchorName = `--${buttonId}`;
  const { hour, minute } = useMemo(() => parseTime(value), [value]);

  const setTime = (nextHour, nextMinute, close = false) => {
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
    if (close) {
      document.getElementById(popoverId)?.hidePopover?.();
    }
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        id={buttonId}
        className={className}
        style={{ anchorName }}
      >
        {`${pad(hour)}:${pad(minute)}`}
      </button>
      <div
        popover="auto"
        id={popoverId}
        className="dropdown bg-base-100 rounded-box shadow-lg border border-base-300 p-2"
        style={{ positionAnchor: anchorName }}
      >
        <div className="grid grid-cols-2 gap-2 w-44">
          <div className="flex flex-col min-h-0">
            <div className="text-[10px] text-center text-base-content/50 mb-1">Hodina</div>
            <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`btn btn-xs h-6 min-h-6 ${h === hour ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTime(h, minute)}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col min-h-0">
            <div className="text-[10px] text-center text-base-content/50 mb-1">Minuta</div>
            <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn-xs h-6 min-h-6 ${m === minute ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTime(hour, m, true)}
                >
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
