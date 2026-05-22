import OpenAI from "openai";
import { env } from "../../config/env.js";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export async function generateMarketingCopy(title: string, dataContext: string) {
  if (!openai) {
    throw new Error("OpenAI API key is missing. Va rugam adaugati cheia in fisierul .env");
  }

  const prompt = `
Esti un expert in e-commerce copywriting si reclame (Ads).
Pentru produsul cu titlul: "${title}"
Context / Descriere: "${dataContext}"

Te rog sa generezi texte promotionale FOARTE SCURTE si de impact (punchy) pentru a fi aplicate direct pe poze de produs, in limba romana.
Returneaza STRICT UN JSON VALID care sa aiba structura exacta de mai jos:
{
  "title": "Un subtitlu scurt si captivant de max 5 cuvinte",
  "benefits": ["Primul beneficiu scurt", "Al doilea scurt", "Al treilea scurt"],
  "instructions": ["Pas 1: scurt", "Pas 2: scurt", "Pas 3: scurt"],
  "review": { "name": "Maria P.", "text": "Cel mai bun produs cumpărat! Recomand." },
  "customFive": "O propoziție despre un stoc limitat sau ofertă (-50%)",
  "customSix": "O propoziție despre Garanție 100% Retur"
}
`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini", // fast and cheap
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Failed to generate text copy from OpenAI");

  return JSON.parse(content);
}
