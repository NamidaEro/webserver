import React from 'react';
import CategorySidebar from '@/components/auction/sidebar/CategorySidebar';

export default function AuctionPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 