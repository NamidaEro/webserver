import React from 'react';
import CategorySidebar from '@/components/auction/sidebar/CategorySidebar';

export default function AuctionPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white p-4 shadow-md">
        <CategorySidebar />
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 