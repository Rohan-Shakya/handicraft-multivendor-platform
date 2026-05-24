import { describe, it, expect } from "vitest";
import { generateCsv, parseCsv } from "../../lib/csv.js";

describe("CSV utilities", () => {
  describe("generateCsv", () => {
    it("generates CSV with headers and rows", () => {
      const columns = [
        { header: "Name", accessor: (r: any) => r.name },
        { header: "Email", accessor: (r: any) => r.email },
        { header: "Age", accessor: (r: any) => r.age },
      ];
      const rows = [
        { name: "John", email: "john@test.com", age: 30 },
        { name: "Jane", email: "jane@test.com", age: 25 },
      ];

      const result = generateCsv(columns, rows);
      const lines = result.split("\n");

      expect(lines[0]).toBe("Name,Email,Age");
      expect(lines[1]).toBe("John,john@test.com,30");
      expect(lines[2]).toBe("Jane,jane@test.com,25");
    });

    it("escapes fields with commas", () => {
      const columns = [
        { header: "Name", accessor: (r: any) => r.name },
        { header: "Address", accessor: (r: any) => r.address },
      ];
      const rows = [{ name: "John", address: "123 Main St, Apt 4" }];

      const result = generateCsv(columns, rows);
      expect(result).toContain('"123 Main St, Apt 4"');
    });

    it("escapes fields with quotes", () => {
      const columns = [
        { header: "Name", accessor: (r: any) => r.name },
      ];
      const rows = [{ name: 'She said "hello"' }];

      const result = generateCsv(columns, rows);
      expect(result).toContain('"She said ""hello"""');
    });

    it("handles null/undefined values", () => {
      const columns = [
        { header: "Name", accessor: (r: any) => r.name },
        { header: "Note", accessor: (r: any) => r.note },
      ];
      const rows = [{ name: "John", note: null }];

      const result = generateCsv(columns, rows);
      expect(result).toBe("Name,Note\nJohn,");
    });

    it("handles empty rows", () => {
      const columns = [
        { header: "Name", accessor: (r: any) => r.name },
      ];
      const result = generateCsv(columns, []);
      expect(result).toBe("Name");
    });
  });

  describe("parseCsv", () => {
    it("parses simple CSV", () => {
      const csv = "Name,Email,Age\nJohn,john@test.com,30\nJane,jane@test.com,25";
      const result = parseCsv(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ Name: "John", Email: "john@test.com", Age: "30" });
      expect(result[1]).toEqual({ Name: "Jane", Email: "jane@test.com", Age: "25" });
    });

    it("parses quoted fields", () => {
      const csv = 'Name,Address\nJohn,"123 Main St, Apt 4"';
      const result = parseCsv(csv);

      expect(result[0]!.Address).toBe("123 Main St, Apt 4");
    });

    it("parses escaped quotes", () => {
      const csv = 'Name\n"She said ""hello"""';
      const result = parseCsv(csv);

      expect(result[0]!.Name).toBe('She said "hello"');
    });

    it("handles empty CSV", () => {
      const result = parseCsv("");
      expect(result).toEqual([]);
    });

    it("handles header-only CSV", () => {
      const result = parseCsv("Name,Email");
      expect(result).toEqual([]);
    });

    it("round-trips with generateCsv", () => {
      const columns = [
        { header: "Name", accessor: (r: any) => r.name },
        { header: "Email", accessor: (r: any) => r.email },
      ];
      const originalRows = [
        { name: "John", email: "john@test.com" },
        { name: "Jane", email: "jane@test.com" },
      ];

      const csv = generateCsv(columns, originalRows);
      const parsed = parseCsv(csv);

      expect(parsed).toEqual([
        { Name: "John", Email: "john@test.com" },
        { Name: "Jane", Email: "jane@test.com" },
      ]);
    });
  });
});
