import { BottomNav } from '@/components/BottomNav';

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#04070A] text-white">
      <div className="pb-24">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
