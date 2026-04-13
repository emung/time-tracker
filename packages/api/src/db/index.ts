import postgres from "postgres";

const sql = postgres(
  process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/timetracker",
);

export default sql;
