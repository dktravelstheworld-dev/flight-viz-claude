// Fetches real SFO (KSFO) departures from the OpenSky Network API and
// writes them to data/flights.csv.
//
//   node scripts/fetch-opensky.mjs [days]      (default: 7)
//
// Anonymous access works with tight rate limits. For more headroom, create
// an API client at opensky-network.org and set OPENSKY_CLIENT_ID and
// OPENSKY_CLIENT_SECRET. OpenSky publishes departures with a delay of about
// a day, so the most recent day is skipped.
import { writeFileSync } from "node:fs";

const AIRPORT = "KSFO";
const TZ = "America/Los_Angeles";
const days = Number(process.argv[2] ?? 7);

async function token() {
  const { OPENSKY_CLIENT_ID: id, OPENSKY_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) return null;
  const res = await fetch(
    "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
    },
  );
  if (!res.ok) throw new Error(`OpenSky auth failed: ${res.status}`);
  return (await res.json()).access_token;
}

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
function local(unixSeconds) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(unixSeconds * 1000)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

const auth = await token();
const headers = auth ? { Authorization: `Bearer ${auth}` } : {};
const end = Math.floor(Date.now() / 1000 / 86400) * 86400 - 86400; // skip the latest day
const rows = ["date,time,flight,destination"];

// The API caps each request's interval, so fetch one day at a time.
for (let i = days; i > 0; i--) {
  const begin = end - i * 86400;
  const url = `https://opensky-network.org/api/flights/departure?airport=${AIRPORT}&begin=${begin}&end=${begin + 86400}`;
  const res = await fetch(url, { headers });
  if (res.status === 404) continue; // no flights found for that interval
  if (!res.ok) throw new Error(`OpenSky request failed (${res.status}) for ${url}`);
  for (const f of await res.json()) {
    const { date, time } = local(f.firstSeen);
    const flight = (f.callsign ?? "").trim() || f.icao24;
    rows.push(`${date},${time},${flight},${f.estArrivalAirport ?? "UNKNOWN"}`);
  }
  console.log(`Fetched ${new Date(begin * 1000).toISOString().slice(0, 10)}`);
}

writeFileSync(new URL("../data/flights.csv", import.meta.url), rows.join("\n") + "\n");
console.log(`Wrote ${rows.length - 1} flights to data/flights.csv`);
