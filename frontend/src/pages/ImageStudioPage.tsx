import { useState } from "react";
import type { FormEvent } from "react";
import CanvaEditorModal from "../components/CanvaEditorModal";
import {
  generateImageVariants,
  importAlibabaImages,
  generateMarketingCopy,
  type MarketingCopy,
  type GeneratedVariant,
  type ImportedImage
} from "../lib/api";

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

type ConceptCardState = {
  id: string;
  label: string;
  prompt: string;
  isGenerating: boolean;
  error: string | null;
  resultUrl: string | null;
};

const DEFAULT_CONCEPTS: ConceptCardState[] = [
  { id: "var-1", label: "Concept 1", prompt: "", isGenerating: false, error: null, resultUrl: null },
  { id: "var-2", label: "Concept 2", prompt: "", isGenerating: false, error: null, resultUrl: null },
  { id: "var-3", label: "Concept 3", prompt: "", isGenerating: false, error: null, resultUrl: null },
  { id: "var-4", label: "Concept 4", prompt: "", isGenerating: false, error: null, resultUrl: null },
  { id: "var-5", label: "Concept 5", prompt: "", isGenerating: false, error: null, resultUrl: null },
  { id: "var-6", label: "Concept 6", prompt: "", isGenerating: false, error: null, resultUrl: null },
];

function ImageStudioPage() {
  const [alibabaUrl, setAlibabaUrl] = useState("");
  const [importedImages, setImportedImages] = useState<ImportedImage[]>([]);
  const [importedTitle, setImportedTitle] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState("");
  
  const [concepts, setConcepts] = useState<ConceptCardState[]>(DEFAULT_CONCEPTS);
  const [marketingCopy, setMarketingCopy] = useState<MarketingCopy | null>(null);
  const [activeModalVariant, setActiveModalVariant] = useState<GeneratedVariant | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const saveToLibrary = async (concept: ConceptCardState) => {
    if (!concept.resultUrl || savedIds[concept.id]) return;
    try {
      await fetch(`${API}/api/images/library/save`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: concept.resultUrl, filename: `${concept.label}.jpg`, label: concept.label, sourceType: 'generated' }),
      });
      setSavedIds(prev => ({ ...prev, [concept.id]: true }));
    } catch { /* ignore */ }
  };

  const updateConcept = (index: number, updates: Partial<ConceptCardState>) => {
    setConcepts(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  async function handleImportAlibaba(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!alibabaUrl) {
      setError("Te rog introdu un URL Alibaba valid.");
      return;
    }
    try {
      setIsImporting(true);
      setError(null);
      const data = await importAlibabaImages(alibabaUrl);
      setImportedImages(data.images);
      setImportedTitle(data.title ?? null);
      setSelectedImageId(data.images[0]?.id ?? "");
      
      // Dacă avem imagini, generăm automat copy marketing-ul ca să fie gata pentru editor
      generateMarketingCopy(data.title || "Produs Alibaba", "").then(setMarketingCopy).catch(console.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import images");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleGenerateSingleConcept(index: number) {
    if (!selectedImageId) {
      setError("Selectează o imagine înainte de generare.");
      return;
    }

    const concept = concepts[index];
    if (!concept.prompt.trim()) return;

    const selectedImage = importedImages.find(img => img.id === selectedImageId);
    if (!selectedImage) return;

    try {
      updateConcept(index, { isGenerating: true, error: null });

      const data = await generateImageVariants({
        imageId: selectedImageId,
        imageUrl: selectedImage.url,
        concepts: [{ id: concept.id, label: concept.label, prompt: concept.prompt }] // Trimitem doar acest concept
      });

      const generatedVariant = data.variants.find(v => v.id === concept.id);
      
      if (generatedVariant) {
        updateConcept(index, { resultUrl: generatedVariant.url });
        setCutoutUrl(data.cutoutUrl); // cutout-ul e același, îl păstrăm pentru editor
      } else {
        throw new Error("Nu s-a returnat nicio imagine pentru acest concept.");
      }

    } catch (err) {
      updateConcept(index, { error: err instanceof Error ? err.message : "Eroare la generare" });
    } finally {
      updateConcept(index, { isGenerating: false });
    }
  }

  return (
    <section className="space-y-6 soft-enter md:space-y-8">
      
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <span className="hero-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
          Image Engine
        </span>
        <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">Alibaba Image Studio</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
          Importă produsul, scrie propriul prompt pentru fiecare concept și generează imagini independent.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {/* Step 1 — Import Alibaba */}
      <div className="glass-card rounded-2xl p-5 md:p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-black mr-2">1</span>
          Import Produs Alibaba
        </h3>
        <form onSubmit={handleImportAlibaba} className="space-y-3">
          <input
            id="alibaba-url"
            type="url"
            placeholder="https://www.alibaba.com/product-detail/..."
            className="w-full rounded-xl border border-slate-300/90 bg-white px-3 py-2.5 text-sm"
            value={alibabaUrl}
            onChange={(e) => setAlibabaUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={isImporting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isImporting ? "Se importă..." : "Import Imagini"}
          </button>
        </form>
      </div>

      {/* Step 2 — Selectează imaginea */}
      <div className={`glass-card rounded-2xl p-5 md:p-6 transition-opacity ${importedImages.length === 0 ? 'opacity-50 grayscale' : ''}`}>
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-black mr-2">2</span>
          Selectează Imaginea Produsului
        </h3>
        {importedImages.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center border-2 border-dashed border-slate-200 rounded-xl">
            Importă un link de pe Alibaba mai întâi pentru a vedea imaginile aici.
          </p>
        ) : (
          <>
            {importedTitle && <p className="text-sm text-slate-500 mb-3">Produs: <span className="font-medium text-slate-700">{importedTitle}</span></p>}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {importedImages.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  className={`overflow-hidden rounded-2xl border-2 transition ${
                    selectedImageId === image.id
                      ? "border-teal-600 ring-2 ring-teal-600/25"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <img src={image.url} alt={`Imported ${image.id}`} className="h-40 w-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Step 3 — Workspace cu Carduri Independente */}
      <div className={`glass-card rounded-2xl p-5 md:p-6 transition-opacity ${importedImages.length === 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-black mr-2">3</span>
            Spațiu de Lucru Concepte
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Scrie promptul pentru conceptul dorit și dă click pe "Generează". Fiecare card e independent.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {concepts.map((concept, index) => (
            <div
              key={concept.id}
              className={`flex flex-col overflow-hidden rounded-2xl border transition-all ${
                concept.resultUrl ? "border-indigo-200 bg-white shadow-md" : 
                concept.prompt.trim() ? "border-teal-200 bg-teal-50/30" : "border-slate-200 bg-slate-50/50"
              }`}
            >
              {/* Partea de Sus - Controale */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={concept.label}
                    onChange={(e) => updateConcept(index, { label: e.target.value })}
                    className="flex-1 bg-transparent text-sm font-semibold text-slate-800 border-0 outline-none focus:underline underline-offset-2"
                    placeholder={`Concept ${index + 1}`}
                  />
                </div>

                <textarea
                  rows={3}
                  value={concept.prompt}
                  onChange={(e) => updateConcept(index, { prompt: e.target.value })}
                  placeholder="Ex: Un studio minimalist alb, lumini calde..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                />

                {concept.error && (
                  <p className="mt-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                    {concept.error}
                  </p>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleGenerateSingleConcept(index)}
                    disabled={concept.isGenerating || !concept.prompt.trim() || !selectedImageId}
                    className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition flex items-center gap-2 ${
                      concept.resultUrl 
                        ? "bg-slate-700 hover:bg-slate-800" // Buton gri pt Regenereaza
                        : "bg-teal-600 hover:bg-teal-700"  // Buton teal pt Generare noua
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {concept.isGenerating ? (
                      <>
                        <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Se procesează...
                      </>
                    ) : (
                      <>{concept.resultUrl ? "↻ Regenerează" : "✦ Generează"}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Partea de Jos - Rezultatul */}
              {concept.resultUrl && (
                <div className="relative group bg-slate-100 flex-1 min-h-[250px]">
                  <img src={concept.resultUrl} alt={concept.label} className="w-full h-full object-cover absolute inset-0" />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                    <button
                      onClick={() => setActiveModalVariant({ id: concept.id, label: concept.label, url: concept.resultUrl! })}
                      className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-xl hover:bg-indigo-500 transition hover:scale-105 flex items-center gap-2"
                    >
                      <span>✨ Deschide în Canva Editor</span>
                    </button>
                    <button
                      onClick={() => saveToLibrary(concept)}
                      className={`px-5 py-2.5 text-sm font-bold rounded-xl shadow-xl transition hover:scale-105 flex items-center gap-2 ${
                        savedIds[concept.id]
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {savedIds[concept.id] ? '✅ Salvată în librărie' : '💾 Salvează în librărie'}
                    </button>
                  </div>
                </div>
              )}
              
              {!concept.resultUrl && concept.isGenerating && (
                <div className="bg-slate-100 flex-1 min-h-[250px] flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-8 h-8 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin mb-3"></div>
                  <p className="text-sm font-medium text-slate-600">NanoBanana procesează...</p>
                  <p className="text-xs text-slate-400 mt-1">Poate dura 20-40 secunde</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editorul Canva */}
      {activeModalVariant && (
        <CanvaEditorModal
          variantId={activeModalVariant.id}
          variantLabel={activeModalVariant.label}
          backgroundUrl={activeModalVariant.url}
          cutoutUrl={cutoutUrl}
          copy={marketingCopy}
          onClose={() => setActiveModalVariant(null)}
        />
      )}
    </section>
  );
}

export default ImageStudioPage;
