import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
interface Bundle {
  qty: number
  label: string
  price: number
  oldPrice?: number
  badge?: string | null
  badgeColor?: string
  freeShipping?: boolean
  shopifyVariantId?: string | number | null
}

interface Product {
  id?: string
  name: string
  price: number
  oldPrice?: number
  images?: string[]
  stock?: number
  qty?: number
  selectedColor?: string | null
  shopifyVariantId?: string | number | null
  bundles?: Bundle[]
}

interface CheckoutModalProps {
  product: Product
  landingId: string
  isOpen: boolean
  onClose: () => void
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const JUDETE = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila',
  'Brașov', 'București', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța',
  'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara',
  'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt',
  'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea',
  'Vaslui', 'Vâlcea', 'Vrancea'
]

const TRANSPORT_COST = 20
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function CheckoutModal({ product, landingId, isOpen, onClose }: CheckoutModalProps) {
  const [selectedBundle, setSelectedBundle] = useState(0)
  const [form, setForm] = useState({ name: '', phone: '', address: '', judet: '', localitate: '' })
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const lastDataRef = useRef<string | null>(null)

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const bundles: Bundle[] = (product?.bundles && product.bundles.length > 0)
    ? product.bundles
    : [{ qty: 1, label: '1x buc', price: product?.price || 0, oldPrice: product?.oldPrice, badge: null, badgeColor: 'bg-slate-500' }]

  const currentBundle = bundles[selectedBundle] || bundles[0]
  const subtotal = Number(currentBundle?.price || 0)
  const currentShippingCost = currentBundle?.freeShipping ? 0 : TRANSPORT_COST
  const total = subtotal + currentShippingCost

  const buildPayload = (currentForm = form) => ({
    landingId,
    subtotal,
    items: [{
      productId: product.id,
      productName: product.name,
      bundleLabel: currentBundle.label || '1x buc',
      color: product.selectedColor || null,
      qty: currentBundle.qty || 1,
      price: currentBundle.price,
      originalUnitPrice: currentBundle.oldPrice
        ? (currentBundle.oldPrice / (currentBundle.qty || 1))
        : (currentBundle.price / (currentBundle.qty || 1)),
      shopifyVariantId: currentBundle.shopifyVariantId || null,
      productShopifyVariantId: product.shopifyVariantId || null,
    }],
    shipping: currentShippingCost,
    total,
    customer: {
      firstName: currentForm.name.split(' ')[0] || '',
      lastName: currentForm.name.split(' ').slice(1).join(' ') || '',
      phone: currentForm.phone,
      address: currentForm.address,
      city: currentForm.localitate,
      county: currentForm.judet,
    }
  })

  const updateDraft = (currentForm = form) => {
    const phone = (currentForm.phone || '').replace(/\s/g, '')
    const name = (currentForm.name || '').trim()
    if (phone.length < 10 || !name) return

    const dataString = JSON.stringify({ phone, name, bundleId: currentBundle.label, productId: product.id })
    if (lastDataRef.current === dataString) return
    lastDataRef.current = dataString

    fetch(`${API_BASE}/api/checkout/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(currentForm)),
    }).catch(() => {})
  }

  // Debounce tracking la 3s
  useEffect(() => {
    const timer = setTimeout(() => updateDraft(), 3000)
    return () => clearTimeout(timer)
  }, [form, selectedBundle])

  const handleClose = () => {
    const phone = (form.phone || '').replace(/\s/g, '')
    const name = (form.name || '').trim()
    if (phone.length >= 10 && name) {
      navigator.sendBeacon(`${API_BASE}/api/checkout/track`, new Blob(
        [JSON.stringify(buildPayload(form))],
        { type: 'application/json' }
      ))
    }
    onClose()
  }

  useEffect(() => {
    if (!isOpen) lastDataRef.current = null
  }, [isOpen])

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  if (!isOpen || !product) return null

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Introduceți numele'
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Număr de telefon invalid'
    if (!form.address.trim()) newErrors.address = 'Introduceți adresa'
    if (!form.judet) newErrors.judet = 'Selectați județul'
    if (!form.localitate.trim()) newErrors.localitate = 'Introduceți localitatea'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const orderPayload = {
      ...buildPayload(),
      items: [{
        productId: product.id,
        productName: product.name,
        bundleLabel: currentBundle.label || '1x buc',
        color: product.selectedColor || null,
        qty: currentBundle.qty,
        price: currentBundle.price,
        originalUnitPrice: currentBundle.oldPrice
          ? (currentBundle.oldPrice / (currentBundle.qty || 1))
          : (currentBundle.price / (currentBundle.qty || 1)),
        subtotal,
        shopifyVariantId: currentBundle.shopifyVariantId || null,
        productShopifyVariantId: product.shopifyVariantId || null,
      }],
      shippingMethod: 'Transport RAPID',
    }

    // SUCCESS instant
    setShowSuccess(true)

    // Facebook Pixel
    if ((window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        currency: 'RON',
        value: total,
        content_name: product.name,
        content_ids: [product.id]
      })
    }

    // Fire & forget
    fetch(`${API_BASE}/api/checkout/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    }).catch(err => console.error('Background order error:', err))
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowSuccess(false); onClose() }} />
        <div className="relative bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl animate-[fadeInUp_0.3s_ease]">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">✅</span>
          </div>
          <h3 className="font-['Outfit'] text-2xl font-[900] text-slate-800 mb-3">Comanda a fost plasată!</h3>
          <p className="text-slate-400 mb-2">Mulțumim, {form.name}!</p>
          <p className="text-slate-400 mb-6 text-sm">Vei fi contactat telefonic la <strong>{form.phone}</strong> pentru confirmarea comenzii.</p>
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Produs</span>
              <span className="font-semibold text-right">
                {currentBundle.qty}x {product.name}
                {product.selectedColor && ` (${product.selectedColor})`}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Total</span><span className="font-bold text-emerald-600">{total.toFixed(2)} lei</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Plata</span><span className="font-semibold">Ramburs la livrare</span></div>
          </div>
          <button onClick={() => { setShowSuccess(false); onClose() }} className="w-full py-4 bg-gradient-to-r from-[#0077B6] to-[#2EC4B6] text-white font-bold rounded-2xl hover:-translate-y-0.5 transition-all">
            Înapoi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl [scrollbar-width:none]">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-7 pt-7 pb-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl">
          <h2 className="font-['Outfit'] text-xl font-[900] text-slate-800">Completați formularul pentru a comanda!</h2>
          <button onClick={handleClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors text-lg flex-shrink-0 ml-3">✕</button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Form Fields */}
          {[
            { key: 'name', label: 'Nume și prenume', icon: '👤', type: 'text', placeholder: 'Nume și prenume' },
            { key: 'phone', label: 'Telefon', icon: '📞', type: 'tel', placeholder: 'Telefon' },
            { key: 'address', label: 'Adresa', icon: '📍', type: 'text', placeholder: 'Adresă' },
          ].map(field => (
            <div key={field.key}>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                {field.label} <span className="text-red-400">*</span>
              </label>
              <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-colors ${errors[field.key] ? 'border-red-300 bg-red-50/50' : 'border-slate-200 hover:border-[#0077B6]/30 focus-within:border-[#0077B6]'}`}>
                <span className="text-slate-400 text-base">{field.icon}</span>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={(form as any)[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  onBlur={() => updateDraft()}
                  className="flex-1 outline-none bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-500"
                />
              </div>
              {errors[field.key] && <p className="text-xs text-red-500 mt-1 ml-1">{errors[field.key]}</p>}
            </div>
          ))}

          {/* Județ */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">Județ <span className="text-red-400">*</span></label>
            <select
              value={form.judet}
              onChange={e => handleChange('judet', e.target.value)}
              onBlur={() => updateDraft()}
              className={`w-full border-2 rounded-xl px-4 py-3.5 text-sm font-semibold outline-none appearance-none bg-white transition-colors cursor-pointer ${errors.judet ? 'border-red-300 bg-red-50/50' : 'border-slate-200 hover:border-[#0077B6]/30 focus:border-[#0077B6]'} ${!form.judet ? 'text-slate-500' : 'text-slate-900'}`}
            >
              <option value="">Județ</option>
              {JUDETE.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            {errors.judet && <p className="text-xs text-red-500 mt-1 ml-1">{errors.judet}</p>}
          </div>

          {/* Localitate */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">Localitate <span className="text-red-400">*</span></label>
            <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-colors ${errors.localitate ? 'border-red-300 bg-red-50/50' : 'border-slate-200 hover:border-[#0077B6]/30 focus-within:border-[#0077B6]'}`}>
              <span className="text-slate-400 text-base">📍</span>
              <input
                type="text"
                placeholder="Localitate"
                value={form.localitate}
                onChange={e => handleChange('localitate', e.target.value)}
                onBlur={() => updateDraft()}
                className="flex-1 outline-none bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-500"
              />
            </div>
            {errors.localitate && <p className="text-xs text-red-500 mt-1 ml-1">{errors.localitate}</p>}
          </div>

          {/* Bundle Selector */}
          <div className="space-y-3 pt-2">
            {bundles.map((bundle, i) => (
              <button
                key={i}
                onClick={() => setSelectedBundle(i)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left ${selectedBundle === i
                  ? 'border-[#0077B6] bg-[#0077B6]/5 shadow-[0_0_0_1px_#0077B6]'
                  : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${selectedBundle === i ? 'bg-[#0077B6]/10 border border-[#0077B6]/20' : 'bg-slate-100'}`}>
                  {product.images && product.images.length > 0
                    ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl">🧴</span>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <span className="font-bold text-slate-800 text-[15px]">{bundle.label}</span>
                  {bundle.badge && (
                    <span className={`self-start px-3 py-1 text-[12px] font-extrabold uppercase rounded-lg text-white whitespace-nowrap ${bundle.badgeColor || 'bg-slate-500'}`}>
                      {bundle.badge}
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {bundle.oldPrice && bundle.oldPrice !== bundle.price && (
                    <span className="text-xs text-slate-300 line-through block">{bundle.oldPrice.toFixed(2)} lei</span>
                  )}
                  <span className={`font-extrabold text-lg ${selectedBundle === i ? 'text-[#0077B6]' : 'text-slate-800'}`}>{bundle.price.toFixed(2)} lei</span>
                </div>
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-2xl p-5 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Produs</span>
              <span className="font-semibold text-slate-700 text-right">
                {currentBundle.qty}x {product.name}
                {product.selectedColor && <span className="block text-xs text-[#0077B6] mt-0.5">Culoare: {product.selectedColor}</span>}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-semibold text-slate-700">{subtotal.toFixed(2)} lei</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Transport</span>
              <span className={`font-semibold ${currentShippingCost === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                {currentShippingCost === 0 ? 'GRATUIT' : `${currentShippingCost.toFixed(2)} lei`}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2.5 flex justify-between">
              <span className="font-bold text-slate-800">Total</span>
              <span className="font-extrabold text-lg text-slate-800">{total.toFixed(2)} lei</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            className="w-full py-5 bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white text-lg font-extrabold rounded-2xl hover:-translate-y-0.5 transition-transform duration-300 uppercase tracking-wide"
          >
            CUMPĂRĂ ACUM – {total.toFixed(2)} lei
          </button>

          {/* Shipping Method */}
          <div className="pb-2">
            <h4 className="font-bold text-sm text-slate-700 mb-3">Metoda de livrare</h4>
            <div className="flex items-center gap-4 p-4 border-2 border-[#0077B6] rounded-2xl bg-[#0077B6]/5">
              <div className="w-5 h-5 rounded-full border-2 border-[#0077B6] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0077B6]" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-sm text-slate-800 block">Transport RAPID</span>
                <span className="text-xs text-slate-400">1-2 zile lucrătoare</span>
              </div>
              <span className={`font-bold text-sm ${currentShippingCost === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                {currentShippingCost === 0 ? 'GRATUIT' : `${currentShippingCost.toFixed(2)} lei`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
