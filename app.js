const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// "YYYY-MM-DD" -> 0 (Mon) … 6 (Sun). Parsed as UTC so the browser's
// timezone can't shift the date.
const weekday = (date) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((v, i) => [cols[i], v])));
}

function aggregate(flights) {
  const byDest = new Map(); // destination -> [count per weekday]
  const datesPerDay = DAYS.map(() => new Set()); // distinct dates seen per weekday
  for (const { date, destination } of flights) {
    const d = weekday(date);
    datesPerDay[d].add(date);
    if (!byDest.has(destination)) byDest.set(destination, DAYS.map(() => 0));
    byDest.get(destination)[d]++;
  }
  return { byDest, dayCounts: datesPerDay.map((s) => s.size) };
}

const state = { mode: "total", sortCol: 8, sortDesc: true, filter: "" };
let data;

function render() {
  const { byDest, dayCounts } = data;
  const avg = state.mode === "avg";
  const cell = (n, d) => (avg ? (dayCounts[d] ? n / dayCounts[d] : 0) : n);
  const fmt = (n) => (avg ? n.toFixed(1) : String(n));

  let rows = [...byDest]
    .filter(([dest]) => dest.toLowerCase().includes(state.filter))
    .map(([dest, counts]) => {
      const vals = counts.map(cell);
      return { dest, vals, total: vals.reduce((a, b) => a + b, 0) };
    });

  const key = (r) => (state.sortCol === 0 ? r.dest : state.sortCol === 8 ? r.total : r.vals[state.sortCol - 1]);
  rows.sort((a, b) => {
    const [x, y] = [key(a), key(b)];
    const c = typeof x === "string" ? x.localeCompare(y) : x - y;
    return state.sortDesc ? -c : c;
  });

  const colTotals = DAYS.map((_, d) => rows.reduce((s, r) => s + r.vals[d], 0));
  const grand = colTotals.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...rows.flatMap((r) => r.vals));
  const heat = (v) => `background: rgb(var(--heat) / ${(0.6 * v) / max})`;
  const arrow = (i) => (state.sortCol === i ? (state.sortDesc ? " ▾" : " ▴") : "");

  document.getElementById("table").innerHTML = `
    <thead><tr>
      <th data-col="0">Destination${arrow(0)}</th>
      ${DAYS.map((d, i) => `<th data-col="${i + 1}">${d}${arrow(i + 1)}<small>${dayCounts[i]} day${dayCounts[i] === 1 ? "" : "s"}</small></th>`).join("")}
      <th data-col="8">${avg ? "Week" : "Total"}${arrow(8)}</th>
    </tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td>${r.dest}</td>${r.vals.map((v) => `<td style="${heat(v)}">${fmt(v)}</td>`).join("")}<td class="total">${fmt(r.total)}</td></tr>`).join("")}
    </tbody>
    <tfoot><tr><td>All destinations</td>${colTotals.map((v) => `<td>${fmt(v)}</td>`).join("")}<td>${fmt(grand)}</td></tr></tfoot>`;
}

async function main() {
  const flights = parseCsv(await (await fetch("data/flights.csv")).text());
  data = aggregate(flights);
  const dates = flights.map((f) => f.date).sort();
  document.getElementById("summary").textContent =
    `${flights.length.toLocaleString()} departures to ${data.byDest.size} destinations, ${dates[0]} to ${dates.at(-1)}`;

  document.getElementById("table").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-col]");
    if (!th) return;
    const col = Number(th.dataset.col);
    state.sortDesc = state.sortCol === col ? !state.sortDesc : col !== 0;
    state.sortCol = col;
    render();
  });
  for (const radio of document.querySelectorAll("input[name=mode]")) {
    radio.addEventListener("change", (e) => { state.mode = e.target.value; render(); });
  }
  document.getElementById("filter").addEventListener("input", (e) => {
    state.filter = e.target.value.trim().toLowerCase();
    render();
  });
  render();
}

main().catch((err) => {
  document.getElementById("summary").textContent = `Could not load data/flights.csv: ${err.message}`;
});
