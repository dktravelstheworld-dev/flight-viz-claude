// Generates data/flights.csv with SYNTHETIC sample departures so the app
// works out of the box. Replace with real data via `npm run fetch`.
import { writeFileSync } from "node:fs";

// Destination, airline prefix, base daily frequency, weekday multipliers (Mon..Sun).
const routes = [
  ["LAX", "UAL", 14, [1.1, 1, 1, 1.1, 1.2, 0.8, 1]],
  ["LAX", "DAL", 6, [1, 1, 1, 1, 1.1, 0.7, 0.9]],
  ["SEA", "ASA", 9, [1.1, 1, 1, 1.1, 1.1, 0.8, 1]],
  ["JFK", "JBU", 7, [1, 1, 1, 1, 1.1, 0.9, 1]],
  ["JFK", "AAL", 5, [1, 1, 1, 1, 1, 0.8, 1]],
  ["ORD", "UAL", 8, [1.1, 1, 1, 1.1, 1.1, 0.7, 1]],
  ["DEN", "UAL", 9, [1, 1, 1, 1, 1.1, 0.8, 1]],
  ["LAS", "SWA", 7, [0.9, 0.8, 0.8, 1, 1.3, 1.1, 1.2]],
  ["SAN", "SWA", 5, [1, 1, 1, 1, 1.1, 0.8, 1]],
  ["HNL", "HAL", 4, [1, 0.9, 0.9, 1, 1.2, 1.2, 1.1]],
  ["BOS", "UAL", 4, [1, 1, 1, 1, 1, 0.8, 1]],
  ["ATL", "DAL", 4, [1, 1, 1, 1, 1, 0.8, 1]],
  ["LHR", "BAW", 2, [1, 1, 1, 1, 1, 1, 1]],
  ["NRT", "UAL", 1, [1, 1, 1, 1, 1, 1, 1]],
  ["SIN", "SIA", 1, [1, 0, 1, 0, 1, 0, 1]],
];

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

const start = new Date(Date.UTC(2026, 8, 7)); // Mon 2026-09-07
const days = 14;
const rows = ["date,time,flight,destination"];
for (let d = 0; d < days; d++) {
  const day = new Date(start.getTime() + d * 86400000);
  const date = day.toISOString().slice(0, 10);
  const dow = (day.getUTCDay() + 6) % 7; // 0 = Monday
  for (const [dest, airline, base, mult] of routes) {
    const n = Math.max(0, Math.round(base * mult[dow] + (rand() - 0.5) * 2));
    for (let i = 0; i < n; i++) {
      const mins = 360 + Math.floor(rand() * 1020); // 06:00–23:00
      const time = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
      const flight = `${airline}${100 + Math.floor(rand() * 2800)}`;
      rows.push(`${date},${time},${flight},${dest}`);
    }
  }
}
writeFileSync(new URL("../data/flights.csv", import.meta.url), rows.join("\n") + "\n");
console.log(`Wrote ${rows.length - 1} sample flights to data/flights.csv`);
