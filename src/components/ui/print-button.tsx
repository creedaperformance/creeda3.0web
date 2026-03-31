'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="flex items-center text-sm font-semibold bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors"
    >
       <Printer className="w-4 h-4 mr-2" /> Print Tear-Sheet
    </button>
  )
}
