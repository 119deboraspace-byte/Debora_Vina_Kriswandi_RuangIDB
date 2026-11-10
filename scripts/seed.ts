import { getDb } from "../lib/db";
import { resetAndSeed, DEMO_PASSWORD } from "../lib/seed";

const reset = process.argv.includes("--reset");

if (reset) {
  resetAndSeed(getDb());
  console.log("Database direset dan diisi ulang.");
} else {
  getDb();
  console.log("Database siap (seed otomatis bila kosong).");
}

const db = getDb();
const counts = db
  .prepare(
    `SELECT
       (SELECT COUNT(*) FROM rooms) AS rooms,
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM organizations) AS organizations,
       (SELECT COUNT(*) FROM bookings) AS bookings,
       (SELECT COUNT(*) FROM booking_sessions) AS sessions`,
  )
  .get();
console.log(counts);
console.log("Akun demo (kata sandi sama):");
for (const email of [
  "admin1@idbbali.ac.id",
  "admin2@idbbali.ac.id",
  "dosen@idbbali.ac.id",
  "mahasiswa@idbbali.ac.id",
  "bem@idbbali.ac.id",
]) {
  console.log(`  ${email} / ${DEMO_PASSWORD}`);
}
