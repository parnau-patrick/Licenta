import { useNavigate } from 'react-router-dom'
import { Lock, Zap, Crown, ArrowRight } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

type PlanLevel = 'FREE' | 'STARTER' | 'PRO'

interface PlanGateProps {
  requiredPlan: PlanLevel
  children: React.ReactNode
  /** Numele funcționalității afișat în overlay (ex: "Landing Builder") */
  featureName?: string
}

const PLAN_ORDER: Record<PlanLevel, number> = { FREE: 0, STARTER: 1, PRO: 2 }

const PLAN_INFO: Record<PlanLevel, { label: string; color: string; gradient: string; icon: React.ReactNode }> = {
  FREE:    { label: 'Free',    color: 'text-slate-600',  gradient: 'from-slate-400 to-slate-600',    icon: null },
  STARTER: { label: 'Starter', color: 'text-teal-600',   gradient: 'from-teal-400 to-emerald-500',   icon: <Zap size={18} className="text-teal-500" /> },
  PRO:     { label: 'Pro',     color: 'text-violet-600', gradient: 'from-violet-500 to-purple-600',  icon: <Crown size={18} className="text-violet-500" /> },
}

export default function PlanGate({ requiredPlan, children, featureName }: PlanGateProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const userPlan = (user?.plan ?? 'FREE') as PlanLevel
  const hasAccess = PLAN_ORDER[userPlan] >= PLAN_ORDER[requiredPlan]

  // User are acces → randăm conținutul normal
  if (hasAccess) return <>{children}</>

  const planInfo = PLAN_INFO[requiredPlan]

  return (
    <div className="relative w-full h-full min-h-[60vh]">
      {/* Conținut blurat în fundal */}
      <div className="select-none pointer-events-none" style={{ filter: 'blur(6px)', opacity: 0.45 }}>
        {children}
      </div>

      {/* Overlay centrat */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 max-w-md w-full mx-4 text-center"
          style={{ boxShadow: '0 25px 60px -10px rgba(0,0,0,0.18)' }}
        >
          {/* Icon lacat */}
          <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${planInfo.gradient} flex items-center justify-center shadow-lg`}>
            <Lock size={36} className="text-white" />
          </div>

          {/* Titlu */}
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2 font-heading">
            {featureName ? `${featureName} necesită` : 'Necesită'}{' '}
            <span className={planInfo.color}>Planul {planInfo.label}</span>
          </h2>

          {/* Descriere */}
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Ești pe planul <strong className="text-slate-700">Free</strong>.{' '}
            {requiredPlan === 'STARTER'
              ? 'Fă upgrade la Starter sau Pro pentru a debloca această funcționalitate.'
              : 'Fă upgrade la Pro pentru acces complet la această funcționalitate premium.'}
          </p>

          {/* Ce include planul */}
          <div className={`bg-gradient-to-br ${planInfo.gradient} rounded-2xl p-px mb-8`}>
            <div className="bg-white rounded-2xl px-5 py-4 text-left space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {planInfo.label} include
              </p>
              {requiredPlan === 'STARTER' && (
                <>
                  <Feature>✅ Creare landing pages nelimitate</Feature>
                  <Feature>✅ Publicare pe Shopify</Feature>
                  <Feature>✅ Image Studio cu AI</Feature>
                  <Feature>✅ Import produse Alibaba</Feature>
                  <Feature>✅ Generare text AI</Feature>
                </>
              )}
              {requiredPlan === 'PRO' && (
                <>
                  <Feature>✅ Tot ce include Starter</Feature>
                  <Feature>✅ Price Intelligence AI</Feature>
                  <Feature>✅ Analiză competitori în timp real</Feature>
                  <Feature>✅ Rapoarte avansate</Feature>
                </>
              )}
            </div>
          </div>

          {/* CTA Buttons */}
          <button
            onClick={() => navigate('/pricing')}
            className={`w-full py-4 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 bg-gradient-to-r ${planInfo.gradient} hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`}
          >
            {planInfo.icon}
            Fă upgrade la {planInfo.label}
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => navigate('/pricing')}
            className="mt-3 w-full py-3 rounded-2xl text-slate-400 text-sm font-semibold hover:text-slate-600 transition-colors"
          >
            Vezi toate planurile
          </button>
        </div>
      </div>
    </div>
  )
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
      {children}
    </div>
  )
}
