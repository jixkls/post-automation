import { describe, expect, it } from "vitest";
import { invokeLLM } from "./_core/llm";

describe("Gemini API Integration", () => {
  it("should successfully call Gemini API with valid credentials", async () => {
    // Simple test to verify Gemini API connectivity
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond with exactly: 'Gemini API is working'",
        },
        {
          role: "user",
          content: "Test if you are working",
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0]).toBeDefined();
    expect(response.choices[0].message).toBeDefined();
    expect(response.choices[0].message.content).toBeDefined();
    
    // Verify we got a string response
    const content = response.choices[0].message.content;
    expect(typeof content === "string" || Array.isArray(content)).toBe(true);
  });

  it("should generate a caption using Gemini", async () => {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a social media copywriter. Generate a short, engaging caption for a product post. Return only the caption.",
        },
        {
          role: "user",
          content: "Generate a caption for a coffee maker product",
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    
    const content = response.choices[0].message.content;
    expect(typeof content === "string" || Array.isArray(content)).toBe(true);
    
    // Verify we got meaningful content
    if (typeof content === "string") {
      expect(content.length).toBeGreaterThan(0);
      // Just verify we got a non-empty response from Gemini
      expect(content).toBeTruthy();
    }
  });
});
