import { GoogleGenAI, Type } from "@google/genai";
import { Trade } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeTradingPatterns(trades: Trade[]) {
  if (trades.length < 3) {
    return "Not enough data yet. Add more trades to get psychological insights.";
  }

  const tradesSummary = trades.map(t => ({
    date: t.date,
    asset: t.asset,
    type: t.type,
    emotion: t.emotion,
    discipline: t.discipline_score,
    pl: t.p_l,
    entry: t.entry_reason
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these trading logs from the Indian stock market for psychological patterns and wealth-building advice. 
    Focus on the correlation between emotions, discipline scores, and P/L (in INR/₹).
    Identify if the trader is "revenge trading", "chasing FOMO", or being "bored".
    
    Trades: ${JSON.stringify(tradesSummary)}`,
    config: {
      systemInstruction: "You are a professional trading psychologist and wealth manager specializing in the Indian equity and F&O markets (NSE/BSE). Provide concise, actionable insights based on the user's trade history. Use Markdown formatting.",
    }
  });

  return response.text;
}

export async function fetchCurrentMarketPrices(symbols: string[]) {
  if (symbols.length === 0) return {};

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Get the current market price (CMP) for the following Indian stock market symbols from Google Finance: ${symbols.join(', ')}. 
    Return the data as a JSON object where keys are symbols and values are the current price in INR.
    Example: {"INFY": 1600.50, "NIFTY": 22000.10}`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        additionalProperties: { type: Type.NUMBER }
      }
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse CMP data", e);
    return {};
  }
}

export async function analyzePortfolio(portfolio: any[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this Indian stock market portfolio for fundamental strength. 
    For each script, provide a recommendation: BUY, HOLD, SELL, or ACCUMULATE.
    Consider current market trends in India (NSE/BSE).
    
    Portfolio Data: ${JSON.stringify(portfolio)}`,
    config: {
      systemInstruction: "You are a senior fundamental analyst for the Indian markets. Provide clear, concise recommendations for each stock in the portfolio. Explain the 'Why' behind each Buy/Hold/Sell/Accumulate call based on general market sentiment and sector performance. Use Markdown.",
    }
  });

  return response.text;
}
