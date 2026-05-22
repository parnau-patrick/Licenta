import { useEffect, useState, useRef } from 'react'
import { Upload, Download, Trash2, BookImage, X, AlertCircle } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

interface SavedImage {
  id: string
  url: string
  filename: string
  label?: string
  sourceType: 'generated' | 'uploaded'
  createdAt: string
}

interface ImageLibraryPageProps {
  pickerMode?: boolean
  onSelect?: (url: string) => void
}

export default function ImageLibraryPage({ pickerMode = false, onSelect }: ImageLibraryPageProps) {
  const [images, setImages] = useState<SavedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchImages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/images/library`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 404 && data.error === "No shop connected.") {
          setImages([])
          setError("Trebuie să conectezi un magazin Shopify pentru a folosi librăria de imagini.")
          return
        }
        throw new Error(data.error || 'Eroare la încărcarea imaginilor.')
      }
      setImages(data.images || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchImages() }, [])

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/images/library/upload`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            label: file.name.replace(/\.[^.]+$/, ''),
            dataUrl: reader.result,
          }),
        })
        if (!res.ok) throw new Error('Upload eșuat.')
        await fetchImages()
      } catch (e: any) {
        setError(e.message)
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Ștergi imaginea din librărie?')) return
    try {
      await fetch(`${API_BASE}/api/images/library/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setImages(prev => prev.filter(img => img.id !== id))
    } catch {
      setError('Eroare la ștergere.')
    }
  }

  const handleDownload = (img: SavedImage) => {
    // Dacă e data URL, descarcă direct
    if (img.url.startsWith('data:')) {
      const a = document.createElement('a')
      a.href = img.url
      a.download = img.filename
      a.click()
      return
    }
    // Altfel, deschide în tab nou (URL extern)
    window.open(`${API_BASE}/api/images/library/${img.id}/download`, '_blank')
  }

  return (
    <section className="space-y-6 soft-enter">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${pickerMode ? '' : 'glass-card rounded-3xl p-6 md:p-8'}`}>
        <div>
          {!pickerMode && (
            <span className="hero-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800 mb-3 block">
              My Images
            </span>
          )}
          <h2 className={`font-bold text-slate-900 ${pickerMode ? 'text-xl' : 'text-3xl md:text-4xl'}`}>
            📁 Librărie Imagini
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Imagini generate sau uploadate — refolosește-le în Landing Builder
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !!error}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
          >
            <Upload size={16} />
            {uploading ? 'Se uploadează...' : 'Upload Imagine'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            {error}
          </div>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-slate-500">
          Se încarcă imaginile...
        </div>
      ) : images.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <BookImage className="mx-auto mb-4 text-slate-300" size={48} />
          <p className="text-slate-500 font-medium">Nicio imagine salvată încă.</p>
          <p className="text-slate-400 text-sm mt-1">
            Generează imagini în Image Studio și salvează-le aici, sau uploadează de pe calculator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map(img => (
            <div
              key={img.id}
              onClick={() => pickerMode && onSelect?.(img.url)}
              className={`group relative bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 ${pickerMode ? 'cursor-pointer hover:border-teal-500 hover:ring-2 hover:ring-teal-500/30' : ''}`}
            >
              {/* Thumbnail */}
              <div className="aspect-square overflow-hidden bg-slate-50">
                <img
                  src={img.url}
                  alt={img.label || img.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs font-semibold text-slate-700 truncate" title={img.label || img.filename}>
                  {img.label || img.filename}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {img.sourceType === 'generated' ? '🤖 Generată' : '📤 Uploadată'}
                </p>
              </div>

              {/* Actions (hidden in picker mode) */}
              {!pickerMode && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); handleDownload(img) }}
                    className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-slate-600 hover:text-teal-700 hover:bg-white transition-colors"
                    title="Descarcă"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(img.id) }}
                    className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-slate-600 hover:text-red-600 hover:bg-white transition-colors"
                    title="Șterge"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* Picker overlay */}
              {pickerMode && (
                <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity">
                    Selectează
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
