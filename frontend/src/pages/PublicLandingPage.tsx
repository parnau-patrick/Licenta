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

  // Stiluri pentru iframe: fără overflow intern, html/body se extind natural
  // Shopify-ul de afară e cel care scrollează, nu iframe-ul intern
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      html {
        overflow: visible !important;
        height: auto !important;
      }
      body {
        overflow: visible !important;
        height: auto !important;
        min-height: 0 !important;
      }
      #root {
        min-height: 0 !important;
        height: auto !important;
        overflow: visible !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);

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

  // Trimiterea înălțimii reale către Shopify parent window prin postMessage
  useEffect(() => {
    if (loading || !data || !id) return;

    const getHeight = () => {
      // Măsurăm wrapper-ul direct — el conține tot landing page-ul randat
      const wrapper = document.getElementById('lp-iframe-wrapper');
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        // offsetHeight e cel mai fiabil pentru elementele care se extind natural
        return Math.max(
          wrapper.offsetHeight || 0,
          wrapper.scrollHeight || 0,
          rect.height || 0
        );
      }
      // Fallback la document
      return Math.max(
        document.body.offsetHeight || 0,
        document.body.scrollHeight || 0,
        document.documentElement.offsetHeight || 0,
        document.documentElement.scrollHeight || 0
      );
    };

    const sendHeight = () => {
      const height = getHeight();
      if (height > 0) {
        window.parent.postMessage({ type: 'landing-height', landingId: id, height }, '*');
      }
    };

    // Prima trimitere
    sendHeight();

    // ResizeObserver pe wrapper și body
    const ro = new ResizeObserver(() => sendHeight());
    ro.observe(document.body);
    const wrapper = document.getElementById('lp-iframe-wrapper');
    if (wrapper) ro.observe(wrapper);

    // Interval de securitate: trimitem periodic timp de 10 secunde (pentru imagini care se încarcă lent)
    let ticks = 0;
    const interval = setInterval(() => {
      sendHeight();
      ticks++;
      if (ticks >= 10) clearInterval(interval);
    }, 1000);

    // Fallback-uri rapide la start
    const t1 = setTimeout(sendHeight, 300);
    const t2 = setTimeout(sendHeight, 800);
    const t3 = setTimeout(sendHeight, 2000);
    const t4 = setTimeout(sendHeight, 5000);

    return () => {
      ro.disconnect();
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '4px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Se încarcă...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
        <p style={{ color: '#ef4444' }}>{error || 'Eroare necunoscută.'}</p>
      </div>
    )
  }

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
    // Wrapper fără overflow-hidden — se extinde natural la toată înălțimea conținutului
    <div
      id="lp-iframe-wrapper"
      style={{ width: '100%', display: 'block', overflow: 'visible', height: 'auto' }}
    >
      <CustomLandingPage
        product={product}
        landingId={data.id}
      />
    </div>
  )
}
