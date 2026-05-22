import { useState, useEffect, useRef } from 'react'
import { Globe, Plus, Trash2, BookImage, Eye, EyeOff, Edit3, LayoutGrid, Sparkles } from 'lucide-react'
import ImageLibraryPage from './ImageLibraryPage'

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

const defaultCfg = () => ({
  price: 0, oldPrice: 0, description: '', images: [], features: [], stock: 20,
  bundles: [], reviews: [], productConfig: { showBestSeller: false, showDiscount: true, hasColors: false, colorsList: '' },
  landingConfig: {
    themeColor: '#059669', heroTitle: '', heroSubtitle: '', heroImage: '',
    showSpec: true, specTitle: '', specText: '', specImage: '',
    showDetails: true, detailsTitle: '', detailsImage: '',
    showStory: true, storyTitle: '', storyText: '', storyImgLeft: '', storyImgRight: '',
    showFbReviews: true, showClientReviews: true, showPhotoReviews: true,
    photoReviews: [], photoReviewsBg: '#f1f5f9',
  }
})

function ImgInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [showLib, setShowLib] = useState(false)
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <div className="flex gap-2">
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => setShowLib(true)} className="px-2 py-2 rounded-lg border border-slate-200 hover:bg-slate-50" title="Din librărie"><BookImage size={14} /></button>
      </div>
      {value && <img src={value} className="mt-2 h-16 rounded-lg object-cover border border-slate-100" />}
      {showLib && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowLib(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="font-bold text-slate-800">Selectează din librărie</h3><button onClick={() => setShowLib(false)} className="text-slate-400 hover:text-slate-700">✕</button></div>
            <ImageLibraryPage pickerMode onSelect={url => { onChange(url); setShowLib(false) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', rows }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {rows
        ? <textarea rows={rows} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
        : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />}
    </div>
  )
}

function Toggle({ label, value, onChange }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!value)} className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-teal-600' : 'bg-slate-300'} relative`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-1'}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )
}

export default function LandingBuilderPage() {
  const [products, setProducts] = useState<any[]>([])
  const [landings, setLandings] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [cfg, setCfg] = useState<any>(defaultCfg())
  const [tab, setTab] = useState('hero')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [pubUrl, setPubUrl] = useState('')
  const [newProductId, setNewProductId] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiCopy, setAiCopy] = useState<any>(null)
  const [showAI, setShowAI] = useState(false)
  const previewRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    fetch(`${API}/api/shopify/products`, { credentials: 'include' }).then(r => r.json()).then(d => setProducts(d.products || []))
    fetch(`${API}/api/landings`, { credentials: 'include' }).then(r => r.json()).then(d => setLandings(d.pages || []))
  }, [])

  const loadLanding = async (id: string) => {
    const res = await fetch(`${API}/api/landings/${id}`, { credentials: 'include' })
    const { page } = await res.json()
    setSelected(page)
    setCfg(page.config || defaultCfg())
    setPubUrl(page.publishedUrl || '')
  }

  const [isCreatingWithAI, setIsCreatingWithAI] = useState(false)

  const createNewWithAI = async () => {
    const prod = products.find(p => String(p.id) === newProductId)
    if (!prod) return alert('Selectează un produs!')
    
    setIsCreatingWithAI(true)
    try {
      // 1. Configurare initiala cu poze si pret de pe Shopify
      const imgs = prod.images?.map((i: any) => i.src) || []
      let initCfg = { 
        ...defaultCfg(), 
        price: parseFloat(prod.variants?.[0]?.price || 0), 
        description: prod.body_html?.replace(/<[^>]*>/g, '') || '', 
        images: imgs 
      }
      
      // Auto-asignare imagini la secțiuni
      initCfg.landingConfig = {
        ...initCfg.landingConfig,
        heroImage: imgs[0] || '',
        specImage: imgs[1] || '',
        storyImgLeft: imgs[2] || '',
        storyImgRight: imgs[3] || '',
        detailsImage: imgs[4] || ''
      }
      
      // 2. Generare AI
      const aiRes = await fetch(`${API}/api/landings/generate-copy`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productTitle: prod.title, description: initCfg.description })
      })
      const aiData = await aiRes.json()
      
      // 3. Aplicam textele AI in config
      if (aiData.copy) {
        initCfg = {
          ...initCfg,
          features: aiData.copy.features,
          landingConfig: {
            ...initCfg.landingConfig,
            heroTitle: aiData.copy.heroTitle,
            heroSubtitle: aiData.copy.heroSubtitle,
            specTitle: aiData.copy.specTitle,
            specText: aiData.copy.specText,
            storyTitle: aiData.copy.storyTitle,
            storyText: aiData.copy.storyText,
          }
        }
      }

      // 4. Salvare in backend
      const res = await fetch(`${API}/api/landings`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopifyProductId: String(prod.id), productTitle: prod.title, handle: prod.title, config: initCfg }) })
      const { page } = await res.json()
      
      setLandings(prev => [page, ...prev])
      setSelected(page); 
      setCfg(initCfg);
    } catch (err) {
      alert('A apărut o eroare la crearea paginii cu AI.')
    } finally {
      setIsCreatingWithAI(false)
    }
  }

  const createNew = async () => {
    const prod = products.find(p => String(p.id) === newProductId)
    if (!prod) return alert('Selectează un produs!')
    
    const imgs = prod.images?.map((i: any) => i.src) || []
    const initCfg = { 
      ...defaultCfg(), 
      price: parseFloat(prod.variants?.[0]?.price || 0), 
      description: prod.body_html?.replace(/<[^>]*>/g, '') || '', 
      images: imgs 
    }
    
    initCfg.landingConfig = {
      ...initCfg.landingConfig,
      heroImage: imgs[0] || '',
      specImage: imgs[1] || '',
      storyImgLeft: imgs[2] || '',
      storyImgRight: imgs[3] || '',
      detailsImage: imgs[4] || ''
    }

    const res = await fetch(`${API}/api/landings`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopifyProductId: String(prod.id), productTitle: prod.title, handle: prod.title, config: initCfg }) })
    const { page } = await res.json()
    setLandings(prev => [page, ...prev])
    setSelected(page); setCfg(initCfg)
  }

  const save = async () => {
    if (!selected) return
    setSaving(true)
    await fetch(`${API}/api/landings/${selected.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: cfg }) })
    setSaving(false)
  }

  const publish = async () => {
    if (!selected) return
    setPublishing(true)
    try {
      // Auto-save config înainte de publish
      await fetch(`${API}/api/landings/${selected.id}`, { 
        method: 'PUT', 
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ config: cfg }) 
      })
      
      const res = await fetch(`${API}/api/landings/${selected.id}/publish`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (data.publishedUrl) { setPubUrl(data.publishedUrl); setLandings(prev => prev.map(l => l.id === selected.id ? { ...l, isPublished: true, publishedUrl: data.publishedUrl } : l)); setSelected((prev: any) => ({...prev, isPublished: true})) }
    } finally {
      setPublishing(false)
    }
  }

  const unpublish = async () => {
    if (!selected) return
    if (!confirm('Sigur vrei să anulezi publicarea acestei pagini de pe Shopify?')) return;
    setPublishing(true)
    try {
      const res = await fetch(`${API}/api/landings/${selected.id}/unpublish`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        setPubUrl('')
        setLandings(prev => prev.map(l => l.id === selected.id ? { ...l, isPublished: false, publishedUrl: null } : l))
        setSelected((prev: any) => ({...prev, isPublished: false}))
      }
    } finally {
      setPublishing(false)
    }
  }

  const deleteLanding = async (id: string) => {
    if (!confirm('Ștergi acest landing page?')) return
    await fetch(`${API}/api/landings/${id}`, { method: 'DELETE', credentials: 'include' })
    setLandings(prev => prev.filter(l => l.id !== id))
    if (selected?.id === id) { setSelected(null); setCfg(defaultCfg()); setPubUrl('') }
  }

  const generateAI = async () => {
    if (!selected) return
    setGeneratingAI(true)
    try {
      const res = await fetch(`${API}/api/landings/generate-copy`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productTitle: selected.productTitle, description: cfg.description })
      })
      const data = await res.json()
      if (data.copy) setAiCopy(data.copy)
    } catch (err) {
      alert('Eroare la generarea textelor AI.')
    } finally {
      setGeneratingAI(false)
    }
  }

  const setLc = (key: string, val: any) => setCfg((c: any) => ({ ...c, landingConfig: { ...c.landingConfig, [key]: val } }))
  const lc = cfg.landingConfig || {}

  const tabs = [
    { id: 'hero', label: '🖼️ Hero' },
    { id: 'product', label: '🏷️ Produs' },
    { id: 'spec', label: '👨‍⚕️ Specialiști' },
    { id: 'story', label: '📖 Story' },
    { id: 'reviews', label: '⭐ Recenzii' },
    { id: 'settings', label: '⚙️ Setări' },
  ]

  return (
    <div className="flex flex-col gap-6 soft-enter max-w-[1600px] mx-auto">
      {/* Top bar - Redesigned */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl" />
        
        <div className="flex-1 min-w-0 z-10">
          <span className="hero-chip inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-300 bg-teal-900/50 border border-teal-500/20 shadow-inner mb-2">Landing Builder Pro</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Personalizează & Vinde</h2>
          <p className="text-slate-400 text-sm mt-1">Configurează produsul, ofertele și designul direct aici.</p>
        </div>
        
        <div className="flex items-center gap-3 z-10 flex-wrap">
          <div className="relative group">
            <select onChange={e => e.target.value ? loadLanding(e.target.value) : null} className="appearance-none border-2 border-slate-700 bg-slate-800/80 text-white rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium focus:border-teal-500 focus:ring-0 outline-none hover:bg-slate-800 transition-colors shadow-inner w-56 truncate">
              <option value="">📂 Alege landing existent...</option>
              {landings.map(l => <option key={l.id} value={l.id}>{l.productTitle} {l.isPublished ? '✅ Pub' : '📝 Draft'}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-white transition-colors">▼</div>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-700 mx-2 hidden sm:block" />
          
          <div className="flex gap-2">
            <div className="relative group">
              <select value={newProductId} onChange={e => setNewProductId(e.target.value)} className="appearance-none border-2 border-slate-700 bg-slate-800/80 text-white rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium focus:border-teal-500 focus:ring-0 outline-none hover:bg-slate-800 transition-colors shadow-inner w-48 truncate">
                <option value="">+ Produs nou Shopify</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-white transition-colors">▼</div>
            </div>
            <div className="flex gap-2">
              <button onClick={createNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold shadow-lg shadow-teal-900/50 hover:bg-teal-500 hover:-translate-y-0.5 transition-all"><Plus size={16} /> Crează</button>
              <button onClick={createNewWithAI} disabled={isCreatingWithAI} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-900/50 hover:bg-indigo-500 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                {isCreatingWithAI ? <span className="animate-spin text-lg leading-none">⚙️</span> : <Sparkles size={16} />} 
                {isCreatingWithAI ? 'Se Generează...' : 'Crează cu AI'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ LANDINGS OVERVIEW DASHBOARD ━━━ */}
      {!selected && landings.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/50">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid size={20} className="text-teal-600" />
            <h3 className="font-bold text-slate-900 text-lg">Landing Pages</h3>
            <span className="ml-auto text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{landings.length} total</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {landings.map(l => {
              const thumbImg = l.config?.images?.[0] || l.config?.landingConfig?.heroImage || ''
              const isActive = l.isPublished
              return (
                <div 
                  key={l.id} 
                  className={`rounded-xl overflow-hidden border-2 transition-all hover:shadow-md ${isActive ? 'border-teal-200 bg-teal-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-32 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                    {thumbImg ? (
                      <img src={thumbImg} alt={l.productTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400"><LayoutGrid size={32} /></div>
                    )}
                    
                    {/* Status badge */}
                    <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 ${isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-amber-500 shadow-lg shadow-amber-500/30'}`}>
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-200' : 'bg-amber-200'} animate-pulse`}></span>
                      {isActive ? 'LIVE ✓' : 'DRAFT'}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-3 space-y-3">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm truncate">{l.productTitle}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Produs Shopify</p>
                    </div>
                    
                    {/* Price if exists */}
                    {(l.config?.price > 0) && (
                      <div className="text-xs text-slate-700 font-semibold">
                        💰 {l.config.price} lei {l.config.oldPrice && <span className="line-through text-slate-500">({l.config.oldPrice} lei)</span>}
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-200">
                      <button 
                        onClick={() => loadLanding(l.id)} 
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-bold text-teal-700 bg-teal-100 hover:bg-teal-200 transition-colors"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      
                      {isActive && (
                        <a 
                          href={l.publishedUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors"
                        >
                          <Eye size={12} /> View
                        </a>
                      )}
                      
                      <button 
                        onClick={() => deleteLanding(l.id)} 
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!selected ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
          <Globe size={40} className="mx-auto mb-3 opacity-30" />
          <p>Selectează sau creează un landing page pentru a începe editarea.</p>
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {/* LEFT — Editor */}
          <div className="w-full lg:w-[450px] flex-shrink-0 space-y-4">
            {/* Landing title + actions */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-indigo-500" />
              <div>
                <p className="font-extrabold text-slate-900 text-lg truncate" title={selected.productTitle}>{selected.productTitle}</p>
                {pubUrl ? (
                  <a href={pubUrl} target="_blank" className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 px-2 py-1 rounded-md transition-colors"><Globe size={12}/> Live URL</a>
                ) : (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Nepublicat</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="flex-1 px-2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center">
                  {saving ? '...' : (selected?.isPublished ? 'Salvează' : 'Salvează Draft')}
                </button>
                {selected?.isPublished ? (
                  <div className="flex-1 flex gap-1">
                    <button onClick={publish} disabled={publishing} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-bold hover:bg-emerald-200 transition-all disabled:opacity-50 shadow-sm">
                      <Globe size={14} />{publishing ? '...' : 'Update Live'}
                    </button>
                    <button onClick={unpublish} disabled={publishing} title="Anulează Publicarea" className="px-3 py-2.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all disabled:opacity-50 flex items-center justify-center shadow-sm">
                      <EyeOff size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={publish} disabled={publishing} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-sm font-bold shadow-md shadow-teal-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50">
                    <Globe size={14} />{publishing ? '...' : 'Publică pe Shopify'}
                  </button>
                )}
                <button onClick={() => setShowAI(!showAI)} className={`px-3 py-2.5 rounded-xl transition-colors shadow-sm font-bold flex items-center justify-center gap-1.5 ${showAI ? 'bg-indigo-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'}`}>
                  <Sparkles size={14} /> <span className="hidden sm:inline">AI</span>
                </button>
                <button onClick={() => deleteLanding(selected.id)} className="px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white transition-colors shadow-sm flex items-center justify-center"><Trash2 size={14} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
              <div className="flex border-b border-slate-100 overflow-x-auto">
                {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${tab === t.id ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{t.label}</button>)}
              </div>
              <div className="p-5 space-y-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">

                {tab === 'hero' && <>
                  <Field label="Titlu Hero" value={lc.heroTitle} onChange={(v: string) => setLc('heroTitle', v)} />
                  <Field label="Subtitlu Hero" value={lc.heroSubtitle} onChange={(v: string) => setLc('heroSubtitle', v)} rows={2} />
                  <ImgInput label="Imagine Hero" value={lc.heroImage || ''} onChange={v => setLc('heroImage', v)} />
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Fundal Hero" value={lc.heroBgColor || '#ffffff'} onChange={(v: string) => setLc('heroBgColor', v)} type="color" />
                    <Field label="Culoare titlu" value={lc.heroTitleColor || '#0F172A'} onChange={(v: string) => setLc('heroTitleColor', v)} type="color" />
                    <Field label="Culoare subtitlu" value={lc.heroSubtitleColor || '#64748B'} onChange={(v: string) => setLc('heroSubtitleColor', v)} type="color" />
                  </div>
                </>}

                {tab === 'product' && <>
                  <Field label="Preț (lei)" value={cfg.price} onChange={(v: string) => setCfg((c: any) => ({ ...c, price: parseFloat(v) || 0 }))} type="number" />
                  <Field label="Preț vechi (lei)" value={cfg.oldPrice} onChange={(v: string) => setCfg((c: any) => ({ ...c, oldPrice: parseFloat(v) || 0 }))} type="number" />
                  <Field label="Descriere" value={cfg.description} onChange={(v: string) => setCfg((c: any) => ({ ...c, description: v }))} rows={3} />
                  <Field label="Stoc" value={cfg.stock} onChange={(v: string) => setCfg((c: any) => ({ ...c, stock: parseInt(v) || 0 }))} type="number" />
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Features (unul per linie)</label>
                    <textarea rows={4} value={(cfg.features || []).join('\n')} onChange={e => setCfg((c: any) => ({ ...c, features: e.target.value.split('\n').filter(Boolean) }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
                  </div>
                  <Toggle label="Best Seller badge" value={cfg.productConfig?.showBestSeller} onChange={(v: boolean) => setCfg((c: any) => ({ ...c, productConfig: { ...c.productConfig, showBestSeller: v } }))} />
                  <Toggle label="Discount badge" value={cfg.productConfig?.showDiscount} onChange={(v: boolean) => setCfg((c: any) => ({ ...c, productConfig: { ...c.productConfig, showDiscount: v } }))} />
                  <Toggle label="Culori produs" value={cfg.productConfig?.hasColors} onChange={(v: boolean) => setCfg((c: any) => ({ ...c, productConfig: { ...c.productConfig, hasColors: v } }))} />
                  {cfg.productConfig?.hasColors && <Field label="Lista culori (virgulă)" value={cfg.productConfig?.colorsList} onChange={(v: string) => setCfg((c: any) => ({ ...c, productConfig: { ...c.productConfig, colorsList: v } }))} />}

                  {/* BUNDLES EDITOR */}
                  <div className="border-t border-slate-100 pt-5 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Oferte de Preț (Pachete)</p>
                      <button onClick={() => setCfg((c: any) => ({ ...c, bundles: [...(c.bundles || []), { qty: 1, label: 'Pachet nou', price: 0 }] }))} className="text-xs px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold transition-colors">+ Adaugă ofertă</button>
                    </div>
                    
                    {(cfg.bundles || []).length === 0 && (
                      <p className="text-xs text-slate-400 italic mb-2">Nu ai definit nicio ofertă de preț. Checkout-ul va afișa o singură opțiune default.</p>
                    )}

                    <div className="space-y-3">
                      {(cfg.bundles || []).map((b: any, i: number) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-sm relative group">
                          <button onClick={() => setCfg((c: any) => ({ ...c, bundles: c.bundles.filter((_: any, j: number) => j !== i) }))} className="absolute top-3 right-3 text-red-400 hover:text-red-600 bg-white rounded-md p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <Field label="Nume Pachet (ex: 1x Bucată)" value={b.label} onChange={(v: string) => setCfg((c: any) => { const mb = [...c.bundles]; mb[i] = { ...mb[i], label: v }; return { ...c, bundles: mb } })} />
                            <Field label="Cantitate Produse" value={b.qty} type="number" onChange={(v: string) => setCfg((c: any) => { const mb = [...c.bundles]; mb[i] = { ...mb[i], qty: parseInt(v) || 1 }; return { ...c, bundles: mb } })} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <Field label="Preț Nou (lei)" value={b.price} type="number" onChange={(v: string) => setCfg((c: any) => { const mb = [...c.bundles]; mb[i] = { ...mb[i], price: parseFloat(v) || 0 }; return { ...c, bundles: mb } })} />
                            <Field label="Preț Vechi (Tăiat)" value={b.oldPrice} type="number" onChange={(v: string) => setCfg((c: any) => { const mb = [...c.bundles]; mb[i] = { ...mb[i], oldPrice: parseFloat(v) || 0 }; return { ...c, bundles: mb } })} />
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <Field label="Text Etichetă (ex: Cel Mai Vândut)" value={b.badge} onChange={(v: string) => setCfg((c: any) => { const mb = [...c.bundles]; mb[i] = { ...mb[i], badge: v }; return { ...c, bundles: mb } })} />
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Culoare Etichetă (Tailwind Class)</label>
                              <select value={b.badgeColor || 'bg-slate-500'} onChange={e => setCfg((c: any) => { const mb = [...c.bundles]; mb[i] = { ...mb[i], badgeColor: e.target.value }; return { ...c, bundles: mb } })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="bg-slate-500">Gri (Default)</option>
                                <option value="bg-red-500">Roșu (Red)</option>
                                <option value="bg-emerald-500">Verde (Emerald)</option>
                                <option value="bg-[#0077B6]">Albastru (Brand)</option>
                                <option value="bg-amber-500">Galben/Auriu</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2 pt-3 border-t border-slate-200">
                            <Toggle label="Transport Gratuit" value={b.freeShipping} onChange={(v: boolean) => setCfg((c: any) => { const mb = [...c.bundles]; mb[i] = { ...mb[i], freeShipping: v }; return { ...c, bundles: mb } })} />
                            <div className="flex-1">
                              <Field label="Shopify Variant ID (Opțional)" value={b.shopifyVariantId} onChange={(v: string) => setCfg((c: any) => { const mb = [...c.bundles]; mb[i] = { ...mb[i], shopifyVariantId: v }; return { ...c, bundles: mb } })} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>}

                {tab === 'spec' && <>
                  <Toggle label="Afișează secțiunea" value={lc.showSpec !== false} onChange={(v: boolean) => setLc('showSpec', v)} />
                  <Field label="Titlu" value={lc.specTitle} onChange={(v: string) => setLc('specTitle', v)} />
                  <Field label="Text" value={lc.specText} onChange={(v: string) => setLc('specText', v)} rows={4} />
                  <ImgInput label="Imagine" value={lc.specImage || ''} onChange={v => setLc('specImage', v)} />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Field label="Fundal" value={lc.specBgColor || '#ffffff'} onChange={(v: string) => setLc('specBgColor', v)} type="color" />
                    <Field label="Culoare Titlu" value={lc.specTitleColor || '#0F172A'} onChange={(v: string) => setLc('specTitleColor', v)} type="color" />
                    <Field label="Culoare Text" value={lc.specTextColor || '#64748B'} onChange={(v: string) => setLc('specTextColor', v)} type="color" />
                  </div>
                </>}

                {tab === 'story' && <>
                  <Toggle label="Afișează secțiunea" value={lc.showStory !== false} onChange={(v: boolean) => setLc('showStory', v)} />
                  <Field label="Titlu" value={lc.storyTitle} onChange={(v: string) => setLc('storyTitle', v)} />
                  <Field label="Text poveste" value={lc.storyText} onChange={(v: string) => setLc('storyText', v)} rows={4} />
                  <ImgInput label="Imagine stânga" value={lc.storyImgLeft || ''} onChange={v => setLc('storyImgLeft', v)} />
                  <ImgInput label="Imagine dreapta" value={lc.storyImgRight || ''} onChange={v => setLc('storyImgRight', v)} />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Field label="Fundal" value={lc.storyBgColor || '#ffffff'} onChange={(v: string) => setLc('storyBgColor', v)} type="color" />
                    <Field label="Culoare Titlu" value={lc.storyTitleColor || '#FFFFFF'} onChange={(v: string) => setLc('storyTitleColor', v)} type="color" />
                    <Field label="Culoare Text" value={lc.storyTextColor || '#475569'} onChange={(v: string) => setLc('storyTextColor', v)} type="color" />
                  </div>
                </>}

                {tab === 'reviews' && <>
                  <Toggle label="Recenzii Facebook" value={lc.showFbReviews !== false} onChange={(v: boolean) => setLc('showFbReviews', v)} />
                  <Toggle label="Recenzii Clienți" value={lc.showClientReviews !== false} onChange={(v: boolean) => setLc('showClientReviews', v)} />
                  <Toggle label="Photo Reviews" value={lc.showPhotoReviews !== false} onChange={(v: boolean) => setLc('showPhotoReviews', v)} />
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Field label="Fundal FB Reviews" value={lc.fbReviewsBgColor || '#f0f2f5'} onChange={(v: string) => setLc('fbReviewsBgColor', v)} type="color" />
                    <Field label="Fundal Clienți" value={lc.clientReviewsBgColor || '#ffffff'} onChange={(v: string) => setLc('clientReviewsBgColor', v)} type="color" />
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold text-slate-600 mb-2">Recenzii ({(cfg.reviews || []).length})</p>
                    {(cfg.reviews || []).map((r: any, i: number) => (
                      <div key={i} className="border border-slate-100 rounded-xl p-3 mb-2 space-y-2">
                        <div className="flex justify-between"><span className="text-xs font-semibold text-slate-500">#{i+1} {r.type}</span><button onClick={() => setCfg((c: any) => ({ ...c, reviews: c.reviews.filter((_: any, j: number) => j !== i) }))} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button></div>
                        <Field label="Nume" value={r.name} onChange={(v: string) => setCfg((c: any) => { const rev = [...c.reviews]; rev[i] = { ...rev[i], name: v }; return { ...c, reviews: rev } })} />
                        <Field label="Text" value={r.text} onChange={(v: string) => setCfg((c: any) => { const rev = [...c.reviews]; rev[i] = { ...rev[i], text: v }; return { ...c, reviews: rev } })} rows={2} />
                      </div>
                    ))}
                    <div className="flex gap-2 flex-wrap">
                      {['facebook', 'customer', 'photo_review'].map(type => (
                        <button key={type} onClick={() => setCfg((c: any) => ({ ...c, reviews: [...(c.reviews || []), { type, name: '', text: '', rating: 5 }] }))} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium">+ {type}</button>
                      ))}
                    </div>
                  </div>
                </>}

                {tab === 'settings' && <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Culoare temă generală (THEME)</label>
                    <div className="flex gap-3 items-center">
                      <input type="color" value={lc.themeColor || '#059669'} onChange={e => setLc('themeColor', e.target.value)} className="w-12 h-10 rounded border border-slate-200 cursor-pointer" />
                      <input value={lc.themeColor || '#059669'} onChange={e => setLc('themeColor', e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <p className="text-xs font-bold text-slate-600 mb-3">Culori Secțiuni Suplimentare</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Fundal Trust Strip" value={lc.trustBgColor || '#f8fafc'} onChange={(v: string) => setLc('trustBgColor', v)} type="color" />
                      <Field label="Fundal CTA (Jos)" value={lc.ctaBgColor || '#f8fafc'} onChange={(v: string) => setLc('ctaBgColor', v)} type="color" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Field label="Fundal Detalii Produs" value={lc.detailsBgColor || '#ffffff'} onChange={(v: string) => setLc('detailsBgColor', v)} type="color" />
                      <Field label="Text Detalii Produs" value={lc.detailsTextColor || '#FFFFFF'} onChange={(v: string) => setLc('detailsTextColor', v)} type="color" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Imagini produs (URL-uri)</label>
                    {(cfg.images || []).map((url: string, i: number) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input value={url} onChange={e => { const imgs = [...cfg.images]; imgs[i] = e.target.value; setCfg((c: any) => ({ ...c, images: imgs })) }} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder={`Imagine ${i+1}`} />
                        <button onClick={() => setCfg((c: any) => ({ ...c, images: c.images.filter((_: any, j: number) => j !== i) }))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setCfg((c: any) => ({ ...c, images: [...(c.images || []), ''] }))} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">+ Adaugă imagine</button>
                      <button onClick={() => { if(confirm('Ești sigur că vrei să ștergi toate imaginile din galerie?')) setCfg((c: any) => ({ ...c, images: [] })) }} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">🗑️ Șterge Toate</button>
                    </div>
                  </div>
                </>}

              </div>
            </div>
          </div>

          {/* RIGHT — Preview */}
          <div className="flex-1 min-w-0 h-[calc(100vh-140px)] sticky top-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden h-full flex flex-col relative group">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-3">Live Preview</span>
                </div>
                {selected && (
                  <a href={`/landing-preview/${selected.id}`} target="_blank" className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-teal-600 px-3 py-1.5 rounded-lg shadow-sm transition-all transform hover:scale-105">
                    Deschide <Globe size={12}/>
                  </a>
                )}
              </div>
              {selected ? (
                <div className="flex-1 bg-slate-100 relative">
                  <iframe
                    ref={previewRef}
                    src={`/landing-preview/${selected.id}?preview=1`}
                    onLoad={() => {
                      if (previewRef.current && previewRef.current.contentWindow) {
                        previewRef.current.contentWindow.postMessage({ type: 'UPDATE_CFG', cfg, selected }, '*')
                      }
                    }}
                    className="w-full h-full border-0 absolute inset-0"
                    title="Landing Page Preview"
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Preview disponibil după selectare landing</div>
              )}
            </div>
          </div>

          {/* RIGHT — AI Assistant */}
          {showAI && (
            <div className="w-[350px] flex-shrink-0 h-[calc(100vh-140px)] sticky top-6 flex flex-col gap-4 soft-enter">
              <div className="bg-gradient-to-b from-indigo-900 to-slate-900 rounded-3xl shadow-xl overflow-hidden h-full flex flex-col border border-indigo-500/30">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <div className="flex items-center gap-2 text-indigo-200 font-bold">
                    <Sparkles size={18} className="text-indigo-400" /> AI Copywriter
                  </div>
                  <button onClick={() => setShowAI(false)} className="text-white/50 hover:text-white">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/10">
                  <p className="text-sm text-indigo-200/70 mb-4">
                    Generează texte atractive pentru landing page-ul tău pe baza detaliilor produsului.
                  </p>
                  
                  <button 
                    onClick={generateAI} 
                    disabled={generatingAI}
                    className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                  >
                    {generatingAI ? 'Se generează...' : <><Sparkles size={16}/> Generează Sugestii</>}
                  </button>

                  {aiCopy && (
                    <div className="mt-6 space-y-4">
                      {/* Hero Section */}
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Hero Section</h4>
                          <button onClick={() => {
                            setLc('heroTitle', aiCopy.heroTitle);
                            setLc('heroSubtitle', aiCopy.heroSubtitle);
                          }} className="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 px-2 py-1 rounded">Aplică</button>
                        </div>
                        <p className="text-sm text-white font-semibold">{aiCopy.heroTitle}</p>
                        <p className="text-xs text-white/70 mt-1">{aiCopy.heroSubtitle}</p>
                      </div>

                      {/* Features */}
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Features</h4>
                          <button onClick={() => {
                            setCfg((c: any) => ({ ...c, features: aiCopy.features }));
                          }} className="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 px-2 py-1 rounded">Aplică</button>
                        </div>
                        <ul className="list-disc pl-4 text-xs text-white/80 space-y-1">
                          {(aiCopy.features || []).map((f: string, i: number) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>

                      {/* Specialiști */}
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Specialiști / Info</h4>
                          <button onClick={() => {
                            setLc('specTitle', aiCopy.specTitle);
                            setLc('specText', aiCopy.specText);
                          }} className="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 px-2 py-1 rounded">Aplică</button>
                        </div>
                        <p className="text-sm text-white font-semibold">{aiCopy.specTitle}</p>
                        <p className="text-xs text-white/70 mt-1">{aiCopy.specText}</p>
                      </div>

                      {/* Poveste */}
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Poveste Produs</h4>
                          <button onClick={() => {
                            setLc('storyTitle', aiCopy.storyTitle);
                            setLc('storyText', aiCopy.storyText);
                          }} className="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 px-2 py-1 rounded">Aplică</button>
                        </div>
                        <p className="text-sm text-white font-semibold">{aiCopy.storyTitle}</p>
                        <p className="text-xs text-white/70 mt-1">{aiCopy.storyText}</p>
                      </div>

                      <button onClick={() => {
                        setLc('heroTitle', aiCopy.heroTitle);
                        setLc('heroSubtitle', aiCopy.heroSubtitle);
                        setCfg((c: any) => ({ ...c, features: aiCopy.features }));
                        setLc('specTitle', aiCopy.specTitle);
                        setLc('specText', aiCopy.specText);
                        setLc('storyTitle', aiCopy.storyTitle);
                        setLc('storyText', aiCopy.storyText);
                      }} className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold mt-4 shadow-lg">
                        Aplică Toate Sugestiile
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
