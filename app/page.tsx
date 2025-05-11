"use client";

import ConnectedRealms from './components/ConnectedRealms';
import ItemSearch from './components/ItemSearch';
import Auctions from './components/Auctions';

export default function ItemSearchPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <ConnectedRealms />
      {/* <ItemSearch /> */}
    </div>
  );
}
