import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoodBadge } from "./mood-badge";

describe("MoodBadge", () => {
  it("renders the calm label with leaf emoji", () => {
    render(<MoodBadge mood="calm" />);
    expect(screen.getByText(/🌿 평온한 날/)).toBeInTheDocument();
  });

  it("renders the attention label with fire emoji", () => {
    render(<MoodBadge mood="attention" />);
    expect(screen.getByText(/🔥 주목 필요한 날/)).toBeInTheDocument();
  });

  it("renders the normal label with sun emoji", () => {
    render(<MoodBadge mood="normal" />);
    expect(screen.getByText(/☀️ 보통의 날/)).toBeInTheDocument();
  });

  it("exposes the mood as a data attribute", () => {
    const { container } = render(<MoodBadge mood="attention" />);
    const span = container.querySelector("[data-mood]");
    expect(span).toHaveAttribute("data-mood", "attention");
  });
});
