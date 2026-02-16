import { describe, it, expect } from "vitest";
import { add, subtract } from "./calculator";

describe("Calculator", () => {
	describe("add", () => {
		it("should add two positive numbers", () => {
			expect(add(2, 3)).toBe(5);
		});

		it("should handle negative numbers", () => {
			expect(add(-5, 3)).toBe(-2);
		});
	});

	describe("subtract", () => {
		it("should subtract two numbers", () => {
			expect(subtract(10, 3)).toBe(7);
		});
	});
});
