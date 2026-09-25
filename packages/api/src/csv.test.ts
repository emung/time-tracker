import { describe, expect, test } from "bun:test";
import { csvRow, parseCsv } from "./csv";

describe("csv", () => {
  test("round-trips tricky values", () => {
    const values = ["plain", "a,b", 'say "hi"', "line1\nline2", "", "ünïcödé"];
    expect(parseCsv(csvRow(values) + "\n")).toEqual([values]);
  });

  test("handles CRLF, BOM and blank lines", () => {
    const text = "﻿a,b\r\n1,2\r\n\r\n3,4";
    expect(parseCsv(text)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  test("keeps trailing empty fields", () => {
    expect(parseCsv("a,,\n")).toEqual([["a", "", ""]]);
  });

  test("throws on unterminated quote", () => {
    expect(() => parseCsv('a,"b\n')).toThrow();
  });
});
