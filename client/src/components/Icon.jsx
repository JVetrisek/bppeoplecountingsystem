export default function Icon({ name, className = 'size-5 shrink-0' }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <use href={`/icons/${name}.svg#icon`} />
    </svg>
  );
}
