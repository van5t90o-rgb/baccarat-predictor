import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const destination = process.argv[2];
if (!destination) throw new Error("請指定 SQL 匯出檔路徑。");
if (!process.env.DATABASE_URL) throw new Error("找不到 DATABASE_URL，無法匯出資料庫。");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const database = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "");
const [tables] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
const tableNameKey = `Tables_in_${database}`;
const statements = [
  "-- Baccarat Predictor database export",
  `-- Generated at ${new Date().toISOString()}`,
  "-- This file contains schema and current application data, but never database credentials.",
  "SET FOREIGN_KEY_CHECKS = 0;",
  "",
];

const escapeValue = value => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return mysql.escape(value.toISOString().slice(0, 19).replace("T", " "));
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  if (typeof value === "object") return mysql.escape(JSON.stringify(value));
  return mysql.escape(String(value));
};

for (const table of tables) {
  const name = table[tableNameKey];
  const [createRows] = await connection.query(`SHOW CREATE TABLE \`${name}\``);
  const createSql = createRows[0]["Create Table"];
  const [rows] = await connection.query(`SELECT * FROM \`${name}\``);
  statements.push(`DROP TABLE IF EXISTS \`${name}\`;`, `${createSql};`, "");
  if (rows.length) {
    const columns = Object.keys(rows[0]);
    const values = rows.map(row => `(${columns.map(column => escapeValue(row[column])).join(", ")})`).join(",\n");
    statements.push(`INSERT INTO \`${name}\` (${columns.map(column => `\`${column}\``).join(", ")}) VALUES`, `${values};`, "");
  }
}

statements.push("SET FOREIGN_KEY_CHECKS = 1;", "");
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, statements.join("\n"), "utf8");
await connection.end();
console.log(`Exported ${tables.length} tables to ${destination}`);
