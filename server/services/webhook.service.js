function extractLineCounts(decoded) {
  const lineNumbers = new Set();

  for (const key of Object.keys(decoded)) {
    const match = key.match(/^line_(\d+)_/);
    if (match) lineNumbers.add(match[1]);
  }

  if (lineNumbers.size === 0) {
    return {
      totalIn: decoded.line_1_total_in ?? 0,
      totalOut: decoded.line_1_total_out ?? 0,
      periodIn: decoded.line_1_period_in ?? 0,
      periodOut: decoded.line_1_period_out ?? 0,
    };
  }

  let totalIn = 0;
  let totalOut = 0;
  let periodIn = 0;
  let periodOut = 0;

  for (const n of lineNumbers) {
    totalIn += decoded[`line_${n}_total_in`] ?? 0;
    totalOut += decoded[`line_${n}_total_out`] ?? 0;
    periodIn += decoded[`line_${n}_period_in`] ?? 0;
    periodOut += decoded[`line_${n}_period_out`] ?? 0;
  }

  return { totalIn, totalOut, periodIn, periodOut };
}

module.exports = { extractLineCounts };
