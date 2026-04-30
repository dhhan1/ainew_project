import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBox } from "./category-box";

describe("CategoryBox", () => {
  it("renders the category label and count", () => {
    render(
      <CategoryBox category="모델/기업" count={3}>
        <div>card</div>
      </CategoryBox>,
    );
    expect(screen.getByText("모델/기업")).toBeInTheDocument();
    expect(screen.getByText("3건")).toBeInTheDocument();
  });

  it("exposes data-category attribute matching the category", () => {
    const { container } = render(
      <CategoryBox category="규제·정책" count={1}>
        <div />
      </CategoryBox>,
    );
    const section = container.querySelector("[data-category]");
    expect(section).toHaveAttribute("data-category", "규제·정책");
  });
});
