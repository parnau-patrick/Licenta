import React, { useState, useEffect, useRef } from 'react'
import CheckoutModal from './CheckoutModal'

/* ═══════════════════════════════════════════════════════════
   UTILITY HOOKS
═══════════════════════════════════════════════════════════ */
function useCountdown(initial = { h: 1, m: 59, s: 59 }) {
  const [timeLeft, setTimeLeft] = useState(initial)
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => {
        let { h, m, s } = prev
        s--
        if (s < 0) { s = 59; m-- }
        if (m < 0) { m = 59; h-- }
        if (h < 0) return { h: 0, m: 0, s: 0 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return timeLeft
}

function useInView(threshold = 0.15): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function CustomLandingPage({ product, landingId }: { product: any; landingId: string }) {
  const [showCheckout, setShowCheckout] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  
  // Default la prima culoare dacă are culori
  const [selectedColor, setSelectedColor] = useState<string | null>(() => {
    if (product.config?.hasColors && product.config?.colorsList) {
      const colors = product.config.colorsList.split(',').map((c: string) => c.trim()).filter(Boolean)
      return colors[0] || null
    }
    return null
  })

  const [viewerCount, setViewerCount] = useState(() => Math.floor(Math.random() * 60) + 40)
  const [viewerFlash, setViewerFlash] = useState(false)

  // Simulate live viewer count — fluctuates ±1-3 every 3-6 seconds
  useEffect(() => {
    const tick = () => {
      setViewerCount(prev => {
        const delta = Math.floor(Math.random() * 5) - 2  // -2 to +2
        return Math.max(30, Math.min(120, prev + delta))
      })
      setViewerFlash(true)
      setTimeout(() => setViewerFlash(false), 600)
      // schedule next tick at random interval 3-7s
      setTimeout(tick, 3000 + Math.random() * 4000)
    }
    const timer = setTimeout(tick, 3000 + Math.random() * 3000)
    return () => clearTimeout(timer)
  }, [])
  const timeLeft = useCountdown()
  const buyBtnRef = useRef<HTMLDivElement>(null)

  const cfg = product.landingConfig || {}
  const reviews = product.reviews || []
  const facebookReviews = reviews.filter((r: any) => r.type === 'facebook')
  const clientReviews = reviews.filter((r: any) => r.type === 'customer')
  // photoReviews displayed from cfg.photoReviews directly

  const THEME = cfg.themeColor || '#059669'
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0
  const savings = product.oldPrice ? (product.oldPrice - product.price).toFixed(2) : 0

  const pad = (n: number) => String(n).padStart(2, '0')

  // Show sticky bar only after hero buy button exits the viewport
  useEffect(() => {
    if (!buyBtnRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    obs.observe(buyBtnRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white font-['Poppins'] text-slate-800 overflow-x-hidden">
      <CheckoutModal
        product={{ ...product, qty: 1, selectedColor }}
        landingId={landingId}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
      />

      {/* ── TOP ANNOUNCEMENT BAR — fresh mint/emerald theme ── */}
      <div className="relative overflow-hidden flex py-2.5 text-white text-[12px] sm:text-[13px] font-semibold whitespace-nowrap"
        style={{ background: 'linear-gradient(90deg, #064e3b 0%, #059669 50%, #064e3b 100%)' }}>
        <div className="animate-marquee flex items-center gap-8 shrink-0 px-4">
          {[
            '🚚 TRANSPORT GRATUIT la comenzi peste 150 LEI',
            '✨ Curățenie Perfectă Garantată',
            discount > 0 ? `⚡ OFERTĂ SPECIALĂ: -${discount}% REDUCERE` : '🛡️ Calitate 100% garantată',
            '🔄 Retur GRATUIT în 30 de zile',
            '💵 Plata la LIVRARE disponibilă',
            '🚚 TRANSPORT GRATUIT la comenzi peste 150 LEI',
            '✨ Curățenie Perfectă Garantată',
            discount > 0 ? `⚡ OFERTĂ SPECIALĂ: -${discount}% REDUCERE` : '🛡️ Calitate 100% garantată',
            '🔄 Retur GRATUIT în 30 de zile',
            '💵 Plata la LIVRARE disponibilă',
          ].map((t, i) => <span key={`m1-${i}`}>{t}</span>)}
        </div>
        <div className="animate-marquee flex items-center gap-8 shrink-0 px-4" aria-hidden="true">
          {[
            '🚚 TRANSPORT GRATUIT la comenzi peste 150 LEI',
            '✨ Curățenie Perfectă Garantată',
            discount > 0 ? `⚡ OFERTĂ SPECIALĂ: -${discount}% REDUCERE` : '🛡️ Calitate 100% garantată',
            '🔄 Retur GRATUIT în 30 de zile',
            '💵 Plata la LIVRARE disponibilă',
            '🚚 TRANSPORT GRATUIT la comenzi peste 150 LEI',
            '✨ Curățenie Perfectă Garantată',
            discount > 0 ? `⚡ OFERTĂ SPECIALĂ: -${discount}% REDUCERE` : '🛡️ Calitate 100% garantată',
            '🔄 Retur GRATUIT în 30 de zile',
            '💵 Plata la LIVRARE disponibilă',
          ].map((t, i) => <span key={`m2-${i}`}>{t}</span>)}
        </div>
      </div>

      {/* Navbar eliminat — Shopify are propriul navbar */}

      <main>

        {/* ═══════════════════╗
            HERO SECTION
        ╚═══════════════════ */}
        <HeroSection
          product={product}
          cfg={cfg}
          THEME={THEME}
          discount={discount}
          savings={savings}
          timeLeft={timeLeft}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          viewerCount={viewerCount}
          viewerFlash={viewerFlash}
          onBuy={() => setShowCheckout(true)}
          pad={pad}
          buyBtnRef={buyBtnRef}
        />

        {/* ── TRUST STRIP ── */}
        <TrustStrip cfg={cfg} />

        {/* ── PHOTO CARD REVIEWS ── (prima secțiune după livrare) */}
        {cfg.showPhotoReviews !== false && cfg.photoReviews?.length > 0 && (
          <PhotoReviewsSection reviews={cfg.photoReviews} bgColor={cfg.photoReviewsBg || '#f1f5f9'} cfg={cfg} />
        )}

        {/* ── SPECIALISTS SECTION ── */}
        {cfg.showSpec !== false && (cfg.specTitle || cfg.specText) && (
          <SpecialistsSection cfg={cfg} THEME={THEME} />
        )}

        {/* ── PRODUCT DETAILS ── */}
        {cfg.showDetails !== false && (product.features?.length > 0 || cfg.detailsImage) && (
          <ProductDetailsSection product={product} cfg={cfg} THEME={THEME} />
        )}

        {/* ── STORY SECTION ── */}
        {cfg.showStory !== false && (cfg.storyTitle || cfg.storyText) && (
          <StorySection cfg={cfg} THEME={THEME} />
        )}

        {/* ── FACEBOOK REVIEWS ── */}
        {cfg.showFbReviews !== false && facebookReviews.length > 0 && (
          <FacebookReviewsSection reviews={facebookReviews} THEME={THEME} cfg={cfg} />
        )}

        {/* ── CLIENT GRID REVIEWS ── */}
        {cfg.showClientReviews !== false && clientReviews.length > 0 && (
          <ClientReviewsSection reviews={clientReviews} THEME={THEME} cfg={cfg} />
        )}

        {/* ── FINAL CTA ── */}
        <FinalCTASection product={product} THEME={THEME} onBuy={() => setShowCheckout(true)} discount={discount} cfg={cfg} />

      </main>

      {/* ══════════════════════════════════════════════════
          STICKY MOBILE BAR
          - Hidden on desktop (lg:hidden)
          - Slides up from bottom only after hero CTA exits screen
          - Fresh emerald / mint palette (clean brand)
      ══════════════════════════════════════════════════ */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-all duration-300 ease-in-out ${stickyVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
      >
        {/* Subtle top separator line with green glow */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #059669, transparent)' }} />
        <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-[0_-6px_32px_rgba(5,150,105,0.18)]">

          {/* Price column */}
          <div className="flex-shrink-0 min-w-0">
            <div className="font-['Outfit'] text-lg font-black text-slate-900 leading-none">
              {Number(product.price || 0).toFixed(2)}
              <span className="text-sm font-semibold text-slate-500 ml-1">lei</span>
            </div>
            {product.oldPrice && (
              <div className="text-[11px] text-slate-400 line-through mt-0.5">
                {Number(product.oldPrice || 0).toFixed(2)} lei
              </div>
            )}
          </div>

          {/* CTA button — full width, bright emerald */}
          <button
            onClick={() => setShowCheckout(true)}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wide active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            <span className="text-base leading-none">🛒</span>
            <span>Comandă Acum</span>
          </button>
        </div>
      </div>

      {/* Bottom padding so content isn't hidden behind sticky bar */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}



/* ═══════════════════════════════════════════════════════════
   HERO SECTION
═══════════════════════════════════════════════════════════ */
function HeroSection({ product, cfg, THEME, discount, savings, timeLeft, selectedColor, setSelectedColor, viewerCount, viewerFlash, onBuy, pad, buyBtnRef }: { product: any; cfg: any; THEME: string; discount: number; savings: string | number; timeLeft: { h: number; m: number; s: number }; selectedColor: string | null; setSelectedColor: (c: string) => void; viewerCount: number; viewerFlash: boolean; onBuy: () => void; pad: (n: number) => string; buyBtnRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: cfg.heroBgColor || '#ffffff' }}>
      {/* Background */}
      <div
        className="absolute inset-0 opacity-8"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${THEME}25, transparent)` }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-8 xl:gap-16 items-center">

          {/* ── Image Side ── */}
          <div className="order-1 lg:order-1">
            <HeroGallery images={product.images} heroImage={cfg.heroImage} name={product.name} THEME={THEME} discount={discount} showDiscount={product.config?.showDiscount !== false} />
          </div>

          {/* ── Info Side ── */}
          <div className="order-2 lg:order-2 space-y-5">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {product.config?.showBestSeller && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200">
                  🏆 BEST SELLER
                </span>
              )}
              {product.config?.showDiscount && discount > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-red-50 text-red-500 border border-red-200">
                  🔥 -{discount}% REDUCERE
                </span>
              )}
              <span className="text-xs text-slate-400 ml-auto hidden sm:block">
                ⭐ 4.9 (127 recenzii)
              </span>
            </div>

            {/* Hero Text */}
            {cfg.heroTitle ? (
              <div>
                <h1 className="font-['Outfit'] text-3xl sm:text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight"
                  style={{ color: cfg.heroTitleColor || '#0F172A' }}>
                  {cfg.heroTitle}
                </h1>
                {cfg.heroSubtitle && (
                  <p className="mt-3 text-base sm:text-lg font-medium"
                    style={{ color: cfg.heroSubtitleColor || '#64748B' }}>
                    {cfg.heroSubtitle}
                  </p>
                )}
              </div>
            ) : (
              <h1 className="font-['Outfit'] text-3xl sm:text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight text-slate-900">
                {product.name}
              </h1>
            )}

            {product.description && (
              <p className="text-slate-500 leading-relaxed text-[15px]">{product.description}</p>
            )}

            {/* Price block */}
            <div className="rounded-2xl p-5 border-2" style={{ borderColor: `${THEME}30`, background: `${THEME}08` }}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-['Outfit'] text-4xl sm:text-5xl font-black text-slate-900">
                  {Number(product.price || 0).toFixed(2)}<span className="text-xl ml-1 text-slate-600">lei</span>
                </span>
                {product.oldPrice && (
                  <span className="text-xl text-slate-300 line-through font-medium">{Number(product.oldPrice || 0).toFixed(2)} lei</span>
                )}
              </div>

              {discount > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-emerald-600">💰 Economisești {savings} lei</span>
                  <span className="text-xs text-slate-300">|</span>
                  <span className="text-sm font-bold text-red-500">
                    ⏰ Ofertă expiră: {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
                  </span>
                </div>
              )}
            </div>

            {/* Features */}
            {product.features?.length > 0 && (
              <ul className="space-y-2.5">
                {product.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[10px] font-black transition-transform group-hover:scale-110"
                      style={{ background: THEME }}
                    >✓</span>
                    <span className="text-[14px] text-slate-600 font-medium leading-snug">{f}</span>
                  </li>
                ))}
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[10px] font-black" style={{ background: THEME }}>✓</span>
                  <span className="text-[14px] text-slate-600 font-medium">🚚 Livrare RAPIDĂ — Plata la livrare (RAMBURS)</span>
                </li>
              </ul>
            )}

            {/* ── SELECȚIE CULOARE ── */}
            {product.config?.hasColors && product.config?.colorsList && (
              <div className="pt-2">
                <label className="block text-sm font-black text-slate-900 mb-3 uppercase tracking-wide">
                  Alege Culoarea:
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {product.config.colorsList.split(',').map((c: string) => c.trim()).filter(Boolean).map((color: string, idx: number) => {
                    const isSelected = selectedColor === color
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedColor(color)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                          isSelected 
                            ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0077B6] scale-105 shadow-md' 
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {color}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Hero CTA — tracked by IntersectionObserver to trigger sticky bar on mobile */}
            <div ref={buyBtnRef} className="pt-2">
              <button
                onClick={onBuy}
                className="w-full py-4 sm:py-5 rounded-2xl text-white text-base sm:text-lg font-black uppercase tracking-wide shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              >
                🛒 Comandă Acum — Plata la Livrare
              </button>
            </div>

            {/* Social proof pills */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  <span
                    className={`inline-block transition-all duration-300 ${viewerFlash ? 'scale-125 text-emerald-500' : 'scale-100 text-emerald-700'
                      }`}
                  >
                    {viewerCount}
                  </span>{' '}privesc acum
                </span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <span className="text-red-500 text-sm">🔴</span>
                <span className="text-xs font-bold text-red-600">Doar {Math.min(product.stock || 20, 20)} buc. rămase</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Hero Gallery ── */
function HeroGallery({ images = [], heroImage, name, THEME, discount, showDiscount = true }: { images?: string[]; heroImage?: string; name: string; THEME: string; discount: number; showDiscount?: boolean }) {
  const [active, setActive] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)
  
  const allImages: string[] = (heroImage && !images.includes(heroImage))
    ? [heroImage, ...images]
    : images

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const idx = Math.round(target.scrollLeft / target.offsetWidth)
    if (idx !== active) setActive(idx)
  }

  const scrollTo = (i: number) => {
    const container = sliderRef.current
    if (container) {
      container.scrollTo({
        left: i * container.offsetWidth,
        behavior: 'smooth'
      })
    }
  }

  if (allImages.length === 0) {
    return (
      <div className="aspect-square rounded-3xl flex items-center justify-center text-8xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200">
        🧴
      </div>
    )
  }

  return (
    <div className="relative group">
      {/* Discount badge */}
      {discount > 0 && showDiscount && (
        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl text-white text-sm font-black shadow-lg"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
          -{discount}%
        </div>
      )}

      {/* Main slider */}
      <div
        ref={sliderRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-3xl shadow-2xl border border-slate-100 bg-slate-50"
        style={{ scrollBehavior: 'smooth' }}
      >
        {allImages.map((img, i) => (
          <div key={i} id={`lp-gallery-${i}`} className="min-w-full aspect-square snap-center flex items-center justify-center overflow-hidden">
            <img src={img} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>

      {/* Dot nav */}
      {allImages.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full">
          {allImages.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${active === i ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}

      {/* Arrows */}
      {allImages.length > 1 && (
        <>
          <button onClick={() => scrollTo(active - 1)} disabled={active === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm shadow-lg items-center justify-center text-slate-700 font-bold opacity-0 group-hover:opacity-100 transition-all disabled:invisible flex hover:bg-white">
            ←
          </button>
          <button onClick={() => scrollTo(active + 1)} disabled={active === allImages.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm shadow-lg items-center justify-center text-slate-700 font-bold opacity-0 group-hover:opacity-100 transition-all disabled:invisible flex hover:bg-white">
            →
          </button>
        </>
      )}

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="mt-4 flex gap-2 justify-center flex-wrap">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => { scrollTo(i); setActive(i) }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all ${active === i ? 'border-[var(--theme)] scale-105 shadow-md' : 'border-slate-200 opacity-60 hover:opacity-100'}`}
              style={{ '--theme': THEME, borderColor: active === i ? THEME : undefined } as React.CSSProperties}
            >
              <img src={img} alt={`thumb ${i}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   TRUST STRIP
═══════════════════════════════════════════════════════════ */
function TrustStrip({ cfg }: { cfg?: any }) {
  const [ref, inView] = useInView()
  const items = [
    { icon: '🚚', title: 'Livrare Rapidă', desc: '24-48h în toată România' },
    { icon: '💵', title: 'Plata la Livrare', desc: 'Ramburs' },
    { icon: '🔄', title: 'Garanție 30 Zile', desc: 'Returnare fără întrebări' },
    { icon: '🛡️', title: 'Produs Original', desc: 'Calitate 100% garantată' },
  ]
  return (
    <section ref={ref} className="py-10 border-y border-slate-100" style={{ backgroundColor: cfg?.trustBgColor || '#f8fafc' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className={`text-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="text-3xl sm:text-4xl block mb-2">{item.icon}</span>
              <strong className="text-xs sm:text-sm font-bold text-slate-800 block mb-1">{item.title}</strong>
              <span className="text-[11px] sm:text-xs text-slate-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   SPECIALISTS SECTION
═══════════════════════════════════════════════════════════ */
function SpecialistsSection({ cfg, THEME }: { cfg: any; THEME: string }) {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 overflow-hidden" style={{ backgroundColor: cfg.specBgColor || '#ffffff' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-20 items-center">

          {/* Text */}
          <div className={`text-center lg:text-left transition-all duration-700 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 text-white"
              style={{ background: THEME }}>
              👨‍⚕️ CE SPUN SPECIALIȘTII
            </div>
            <h2 className="font-['Outfit'] text-3xl sm:text-4xl lg:text-[2.6rem] font-black leading-tight tracking-tight mb-6"
              style={{ color: cfg.specTitleColor || '#0F172A' }}>
              {cfg.specTitle || 'Recomandați de Experți'}
            </h2>
            <p className="leading-relaxed text-base sm:text-lg whitespace-pre-wrap"
              style={{ color: cfg.specTextColor || '#64748B' }}>
              {cfg.specText || 'Produsele noastre sunt testate și recomandate de specialiști cu experiență.'}
            </p>
            <div className="mt-8 flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xl flex-shrink-0">
                👨‍⚕️
              </div>
              <div className="text-left">
                <div className="font-bold text-sm" style={{ color: cfg.specVerifiedTitle || '#1e293b' }}>Specialiști Verificați</div>
                <div className="text-xs mt-0.5" style={{ color: cfg.specVerifiedSub || '#94a3b8' }}>Recomandare bazată pe rezultate reale</div>
              </div>
              <div className="ml-auto flex">
                {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-lg">★</span>)}
              </div>
            </div>
          </div>

          {/* Image */}
          <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            {cfg.specImage ? (
              <div className="relative">
                <div className="absolute -inset-3 rounded-[2.5rem] opacity-20 blur-xl" style={{ background: THEME }} />
                <img
                  src={cfg.specImage}
                  alt="Specialists"
                  className="relative w-full h-auto rounded-3xl shadow-2xl border-4 border-white block"
                />
              </div>
            ) : (
              <div className="w-full aspect-square rounded-3xl flex items-center justify-center text-8xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200">
                🧴
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT DETAILS SECTION
═══════════════════════════════════════════════════════════ */
function ProductDetailsSection({ product, cfg, THEME }: { product: any; cfg: any; THEME: string }) {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 overflow-hidden" style={{ background: cfg.detailsBgColor || `linear-gradient(135deg, ${THEME}f0, ${THEME})` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-black tracking-tight"
            style={{ color: cfg.detailsTitleColor || '#FFFFFF' }}>
            {cfg.detailsTitle || 'Detalii Produs 📋'}
          </h2>
          <p className="mt-3 text-base sm:text-lg"
            style={{ color: cfg.detailsSubtitleColor || 'rgba(255,255,255,0.7)' }}>
            {cfg.detailsSubtitle || `Tot ce trebuie să știi despre ${product.name}`}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-center">
          {/* Features list */}
          <div className={`transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/20">
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</span>
                Beneficii Principale
              </h3>
              <ul className="space-y-4">
                {product.features?.map((f: string, i: number) => (
                  <li key={i} className={`flex items-start gap-3 transition-all duration-500 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                    style={{ transitionDelay: `${200 + i * 80}ms` }}>
                    <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5">✓</span>
                    <span className="leading-relaxed text-[15px]" style={{ color: cfg.detailsTextColor || '#FFFFFF' }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Image — natural size, no cropping */}
          <div className={`transition-all duration-700 delay-300 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            {cfg.detailsImage ? (
              <img
                src={cfg.detailsImage}
                alt="Detalii Produs"
                className="w-full h-auto rounded-3xl shadow-2xl border-4 border-white/20"
              />
            ) : (
              product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-auto rounded-3xl shadow-2xl border-4 border-white/20"
                />
              )
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   STORY SECTION
═══════════════════════════════════════════════════════════ */
function StorySection({ cfg, THEME }: { cfg: any; THEME: string }) {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 overflow-hidden" style={{ backgroundColor: cfg.storyBgColor || '#ffffff' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className={`text-center mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-block px-6 py-3 rounded-2xl font-black text-lg sm:text-xl mb-4"
            style={{ background: THEME, color: cfg.storyTitleColor || '#FFFFFF' }}>
            🥰 {cfg.storyTitle || 'Povestea unui Client'}
          </div>
          <p className="leading-relaxed max-w-2xl mx-auto text-base sm:text-lg mt-4"
            style={{ color: cfg.storyTextColor || '#475569' }}>
            {cfg.storyText || ''}
          </p>
        </div>

        {/* Images grid */}
        {(cfg.storyImgLeft || cfg.storyImgRight) && (
          <div className="grid sm:grid-cols-2 gap-6 mt-8">
            {cfg.storyImgLeft && (
              <div className={`transition-all duration-700 delay-100 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="relative">
                  <div className="absolute -inset-2 rounded-[2rem] blur-xl opacity-20" style={{ background: THEME }} />
                  <div className="relative rounded-3xl shadow-2xl border-4 border-slate-100 overflow-hidden">
                    <img
                      src={cfg.storyImgLeft}
                      alt="Rezultat Client"
                      className="w-full h-auto block"
                    />
                  </div>
                </div>
              </div>
            )}
            {cfg.storyImgRight && (
              <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="relative">
                  <div className="absolute -inset-2 rounded-[2rem] blur-xl opacity-20" style={{ background: THEME }} />
                  <div className="relative rounded-3xl shadow-2xl border-4 border-slate-100 overflow-hidden">
                    <img
                      src={cfg.storyImgRight}
                      alt="Instrucțiuni Utilizare"
                      className="w-full h-auto block"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FACEBOOK REVIEWS
═══════════════════════════════════════════════════════════ */
function FacebookReviewsSection({ reviews, THEME: _THEME, cfg }: { reviews: any[]; THEME: string; cfg?: any }) {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: cfg?.fbReviewsBgColor || '#f0f2f5' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-10 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <h2 className="font-['Outfit'] text-2xl sm:text-3xl font-black text-slate-900">Recenzii Facebook</h2>
          </div>
          <div className="flex justify-center text-amber-400 text-xl gap-0.5 mb-1">★★★★★</div>
          <p className="text-sm text-slate-500">Ce spun clienții pe Facebook</p>
        </div>

        <div className="space-y-5">
          {reviews.map((r, i) => (
            <div
              key={i}
              className={`flex gap-3 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <img
                src={r.avatar || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(r.name)}&size=48`}
                alt={r.name}
                className="w-11 h-11 rounded-full flex-shrink-0 object-cover border-2 border-white shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-slate-100 relative">
                  <span className="font-bold text-sm text-slate-800 block mb-1">{r.name}</span>
                  <span className="text-sm text-slate-600 leading-relaxed">{r.text}</span>
                  <div className="absolute -bottom-3 right-3 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                    <span className="text-base">❤️</span>
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-bold text-slate-400 mt-2 px-4">
                  <span className="text-[#1877F2] cursor-pointer hover:underline">👍 Îmi place</span>
                  <span className="text-red-500">Adoră</span>
                  <span className="cursor-pointer hover:underline">Răspunde</span>
                  <span className="text-slate-300">{r.date || '2min'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   CLIENT GRID REVIEWS
═══════════════════════════════════════════════════════════ */
function ClientReviewsSection({ reviews, THEME, cfg }: { reviews: any[]; THEME: string; cfg?: any }) {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 overflow-hidden" style={{ backgroundColor: cfg?.clientReviewsBgColor || '#ffffff' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Recenzii Clienți Reali 🤩
          </h2>
          <p className="text-slate-400 mt-3 text-base">Rezultate reale de la clienții noștri</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {reviews.map((r, i) => (
            <div
              key={i}
              className={`bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {/* Photo — natural proportions, zero cropping */}
              <div className="overflow-hidden">
                {r.image
                  ? <img src={r.image} alt={r.name} className="w-full h-auto block" />
                  : <div className="w-full flex items-center justify-center text-5xl py-12">📸</div>
                }
              </div>

              <div className="p-5">
                {/* Stars */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className={`text-lg ${j < r.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-600 text-sm leading-relaxed italic mb-4">
                  "{r.text.length > 100 ? r.text.substring(0, 97) + '...' : r.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${THEME}, ${THEME}80)` }}
                  >
                    {r.name?.[0] || 'C'}
                  </div>
                  <span className="font-bold text-sm text-slate-700">{r.name}</span>
                  <span className="ml-auto text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px]">✓</span>
                    Verificat
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FINAL CTA SECTION
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   PHOTO CARD REVIEWS
═══════════════════════════════════════════════════════════ */
function PhotoReviewsSection({ reviews, bgColor, cfg }: { reviews: any[]; bgColor: string; cfg: any }) {
  const [ref, inView] = useInView()
  const [active, setActive] = React.useState(0)
  const trackRef = React.useRef<HTMLDivElement>(null)

  const scrollTo = (idx: number) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[idx]
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    setActive(idx)
  }

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const center = track.scrollLeft + track.clientWidth / 2
    let closest = 0
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement
      const cardCenter = el.offsetLeft + el.offsetWidth / 2
      const closestEl = track.children[closest] as HTMLElement
      if (Math.abs(cardCenter - center) < Math.abs(closestEl.offsetLeft + closestEl.offsetWidth / 2 - center)) {
        closest = i
      }
    })
    setActive(closest)
  }

  return (
    <section ref={ref} className="py-14 sm:py-20 overflow-hidden" style={{ background: bgColor || '#f1f5f9' }}>

      {/* Header */}
      <div className={`text-center mb-12 px-4 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        {/* Badge pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200 mb-5">
          <span className="text-amber-500 text-sm">★</span>
          <span className="text-amber-700 text-[11px] font-black uppercase tracking-widest">Recenzii Verificate</span>
          <span className="text-amber-500 text-sm">★</span>
        </div>

        {/* Main title */}
        <h2
          className="font-['Outfit'] text-4xl sm:text-5xl font-black tracking-tight leading-[1.1]"
          style={{ color: cfg?.photoReviewsHeadingColor || '#0f172a' }}
        >
          Ce spun clienții
          <br />
          <span className="relative inline-block">
            <span className="relative z-10">noștri 💬</span>
            <span
              className="absolute bottom-1 left-0 right-0 h-3 -z-10 opacity-30 rounded"
              style={{ background: cfg?.photoReviewsHeadingColor || '#fbbf24' }}
            />
          </span>
        </h2>

        {/* Stars row */}
        <div className="flex items-center justify-center gap-1 mt-4">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="text-amber-400 text-xl">★</span>
          ))}
          <span className="ml-2 text-sm font-bold text-slate-500">4.9 / 5 din recenzii reale</span>
        </div>
      </div>

      {/* Carousel track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-4 overflow-x-auto pb-4 px-4 sm:px-8"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Spacer left */}
        <div className="flex-shrink-0 w-[calc(50vw-140px)] sm:w-[calc(50vw-160px)]" />

        {reviews.map((r, i) => (
          <div
            key={i}
            onClick={() => scrollTo(i)}
            className="flex-shrink-0 bg-white rounded-3xl overflow-hidden shadow-xl border border-white/80 transition-all duration-300 cursor-pointer"
            style={{
              width: '280px',
              scrollSnapAlign: 'center',
              transform: active === i ? 'scale(1.02)' : 'scale(0.97)',
              opacity: active === i ? 1 : 0.75,
            }}
          >
            {/* Photo */}
            {r.image && (
              <img src={r.image} alt={r.name || 'Review'} className="w-full h-auto block" draggable={false} />
            )}

            {/* Content */}
            <div className="p-5 text-center">
              {r.title && (
                <h3 className="font-['Outfit'] font-black text-lg mb-2"
                  style={{ color: cfg?.photoReviewsCardTitleColor || '#0f172a' }}>{r.title}</h3>
              )}
              <div className="flex justify-center gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <span key={j} className={`text-xl ${j < (r.rating || 5) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                ))}
              </div>
              {r.text && (
                <p className="text-sm leading-relaxed mb-4"
                  style={{ color: cfg?.photoReviewsCardTextColor || '#475569' }}>{r.text}</p>
              )}
              <p className="font-bold text-sm mb-3"
                style={{ color: cfg?.photoReviewsCardNameColor || '#1e293b' }}>- {r.name}</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">✓</span>
                <span className="text-xs text-emerald-600 font-semibold">Cumpărător verificat</span>
              </div>
            </div>
          </div>
        ))}

        {/* Spacer right */}
        <div className="flex-shrink-0 w-[calc(50vw-140px)] sm:w-[calc(50vw-160px)]" />
      </div>

      {/* Dot indicators */}
      {reviews.length > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: active === i ? '24px' : '8px',
                height: '8px',
                background: active === i ? '#0077B6' : '#cbd5e1',
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FINAL CTA
═══════════════════════════════════════════════════════════ */
function FinalCTASection({ product, THEME, onBuy, discount, cfg }: { product: any; THEME: string; onBuy: () => void; discount: number; cfg?: any }) {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 overflow-hidden" style={{ background: cfg?.ctaBgColor || `linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)` }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Glow circle */}
          <div className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center text-5xl shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${THEME}, ${THEME}80)`, boxShadow: `0 0 60px ${THEME}60` }}>
            🛒
          </div>

          <h2 className="font-['Outfit'] text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
            Convins? Comandă <span style={{ color: THEME }}>Acum!</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Livrare rapidă prin curier. Plata la livrare. Garanție 30 de zile sau banii înapoi.
          </p>

          {/* Price display */}
          <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
            <span className="font-['Outfit'] text-4xl sm:text-5xl font-black text-white">
              {Number(product.price || 0).toFixed(2)} <span className="text-xl text-slate-400">lei</span>
            </span>
            {product.oldPrice && (
              <span className="text-2xl text-slate-600 line-through">{Number(product.oldPrice || 0).toFixed(2)} lei</span>
            )}
            {discount > 0 && (
              <span className="px-3 py-1.5 rounded-xl text-white text-sm font-black" style={{ background: '#ef4444' }}>
                -{discount}%
              </span>
            )}
          </div>

          <button
            onClick={onBuy}
            className="inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-white text-base sm:text-lg font-black uppercase tracking-wide shadow-2xl hover:shadow-[0_20px_60px_rgba(239,68,68,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            🛒 Comandă Acum
            <span className="text-sm font-medium opacity-80">— Plata la Livrare</span>
          </button>

          <p className="mt-6 text-slate-500 text-sm">
            🔒 Tranzacție securizată &nbsp;·&nbsp; 🚚 Livrare 24-48h &nbsp;·&nbsp; ⭐ +5.000 clienți mulțumiți
          </p>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   EXPORT: LandingSections (kept for backward compat)
═══════════════════════════════════════════════════════════ */
export function LandingSections({ product }: { product: any }) {
  const cfg = product.landingConfig || {}
  const reviews = product.reviews || []
  const facebookReviews = reviews.filter((r: any) => r.type === 'facebook')
  const clientReviews = reviews.filter((r: any) => r.type === 'customer')
  const THEME = cfg.themeColor || '#0077B6'

  return (
    <div>
      {(cfg.specTitle || cfg.specText) && <SpecialistsSection cfg={cfg} THEME={THEME} />}
      {(product.features?.length > 0 || cfg.detailsImage) && <ProductDetailsSection product={product} cfg={cfg} THEME={THEME} />}
      {(cfg.storyTitle || cfg.storyText) && <StorySection cfg={cfg} THEME={THEME} />}
      {facebookReviews.length > 0 && <FacebookReviewsSection reviews={facebookReviews} THEME={THEME} />}
      {clientReviews.length > 0 && <ClientReviewsSection reviews={clientReviews} THEME={THEME} />}
    </div>
  )
}
