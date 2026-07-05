import { useId } from 'react';
import 'cally';

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(day)}.${pad(month)}.${year}`;
}

function CalendarNavIcons() {
  return (
    <>
      <svg aria-label="Previous" className="fill-current size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
      <svg aria-label="Next" className="fill-current size-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </>
  );
}

export default function CallyDatePicker({ value, onChange, className = '' }) {
  const buttonId = useId().replace(/:/g, '');
  const popoverId = useId().replace(/:/g, '');
  const anchorName = `--${buttonId}`;

  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (!nextValue) return;
    onChange(nextValue);
    document.getElementById(popoverId)?.hidePopover?.();
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
        {formatDisplayDate(value)}
      </button>
      <div
        popover="auto"
        id={popoverId}
        className="dropdown bg-base-100 rounded-box shadow-lg border border-base-300 p-0"
        style={{ positionAnchor: anchorName }}
      >
        <calendar-date
          className="cally bg-base-100 border border-base-300 shadow-lg rounded-box"
          value={value}
          onchange={handleChange}
        >
          <CalendarNavIcons />
          <calendar-month />
        </calendar-date>
      </div>
    </>
  );
}
