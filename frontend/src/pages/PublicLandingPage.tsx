import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import CustomLandingPage from '../components/landing/CustomLandingPage'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

interface LandingConfig {
  id: string
  shopDomain: string
  productTitle: string
  shopifyProductId: string
  config: Record<string, any>
}

export default function PublicLandingPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<LandingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/api/public/landing/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Landing page negăsit sau nepublicat.')
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // Trimiterea înălțimii către Shopify parent window prin postMessage pentru a redimensiona iframe-ul
  useEffect(() => {
    if (loading || !data || !id) return;

    const sendHeight = () => {
      // Calculăm înălțimea totală a documentului din iframe într-un mod super robust
      const height = Math.max(
        document.body.scrollHeight || 0,
        document.body.offsetHeight || 0,
        document.documentElement.clientHeight || 0,
        document.documentElement.scrollHeight || 0,
        document.documentElement.offsetHeight || 0
      );
      window.parent.postMessage({
        type: 'landing-height',
        landingId: id,
        height: height
      }, '*');
    };

    // Trimitem înălțimea inițială
    sendHeight();

    // Utilizăm ResizeObserver pentru a asculta modificările de înălțime (ex: când se încarcă imagini sau componente)
    const resizeObserver = new ResizeObserver(() => {
      sendHeight();
    });
    resizeObserver.observe(document.body);

    // Fallback-uri suplimentare după câteva milisecunde pentru a asigura randarea completă a imaginilor
    const t1 = setTimeout(sendHeight, 500);
    const t2 = setTimeout(sendHeight, 1500);
    const t3 = setTimeout(sendHeight, 3000);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading, data, id])

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'UPDATE_CFG') {
        setData(prev => {
          if (prev) return { ...prev, config: e.data.cfg }
          if (e.data.selected) {
            return {
              id: e.data.selected.id,
              shopDomain: '',
              productTitle: e.data.selected.productTitle,
              shopifyProductId: e.data.selected.shopifyProductId,
              config: e.data.cfg
            }
          }
          return null
        })
        setError(null)
        setLoading(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Se încarcă...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-500">{error || 'Eroare necunoscută.'}</p>
      </div>
    )
  }

  // Construim obiectul product din config
  const cfg = data.config as any
  const product = {
    id: data.shopifyProductId,
    name: data.productTitle,
    price: cfg.price || 0,
    oldPrice: cfg.oldPrice || null,
    images: cfg.images || [],
    features: cfg.features || [],
    description: cfg.description || '',
    stock: cfg.stock || 20,
    reviews: cfg.reviews || [],
    landingConfig: cfg.landingConfig || cfg,
    config: cfg.productConfig || {},
    bundles: cfg.bundles || [],
  }

  return (
    <CustomLandingPage
      product={product}
      landingId={data.id}
    />
  )
}
