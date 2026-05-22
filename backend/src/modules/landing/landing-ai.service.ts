import OpenAI from "openai";
import { env } from "../../config/env.js";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export async function generateLandingCopy(title: string, description: string) {
  if (!openai) {
    throw new Error("OpenAI API key is missing. Vă rugăm adăugați cheia în fișierul .env");
  }

  const prompt = `
Ești un expert în e-commerce copywriting și marketing, specializat pe landing pages care convertesc excelent.
Pentru produsul cu titlul: "${title}"
Și cu descrierea/detaliile: "${description}"

Te rog să generezi texte atractive și persuasive în limba română pentru secțiunile unui landing page.
Returnează STRICT UN JSON VALID care să aibă structura exactă de mai jos:
{
  "heroTitle": "Un titlu principal captivant, scurt și percutant",
  "heroSubtitle": "Un subtitlu care detaliază beneficiul principal (1-2 propoziții)",
  "features": ["Beneficiu scurt 1", "Beneficiu scurt 2", "Beneficiu scurt 3", "Beneficiu scurt 4"],
  "specTitle": "Titlu secțiune specialiști/detalii tehnice",
  "specText": "Un text explicativ care scoate în evidență calitatea, recomandările sau detaliile tehnice ale produsului",
  "storyTitle": "Titlu secțiune povestea produsului",
  "storyText": "Un scurt paragraf (2-3 propoziții) care spune povestea produsului și de ce este esențial pentru client"
}
`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Failed to generate text copy from OpenAI");

  return JSON.parse(content);
}
