import { Boxes } from 'lucide-react'

import ModuleRegistryOverview from '../components/ModuleRegistryOverview'

export default function SystemArchitecture() {
  return <div className="max-w-6xl mx-auto space-y-5">
    <header className="flex items-start gap-3">
      <Boxes className="text-slate-600 shrink-0 mt-1" size={28}/>
      <div><h1 className="text-2xl font-bold text-slate-800">系統架構</h1><p className="text-sm text-slate-500 mt-1">正式模組登錄中心 · 建置與驗收分離</p></div>
    </header>
    <ModuleRegistryOverview/>
  </div>
}
