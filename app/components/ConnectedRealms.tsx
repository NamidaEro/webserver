import React, { useState, useEffect } from 'react';
import Auctions from './Auctions';

const ConnectedRealms: React.FC = () => {
  const [connectedRealms, setConnectedRealms] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRealmId, setSelectedRealmId] = useState<string | null>(null);

  const fetchConnectedRealms = async () => {
    setError(null);
    try {
      const response = await fetch('/api/connected-realms');
      if (!response.ok) {
        const errorDetails = await response.json();
        throw new Error(errorDetails.error || 'Failed to fetch connected realms');
      }
      const data = await response.json();
      // console.log('Fetched data:', data);

      if (data.connectedRealmIds && Array.isArray(data.connectedRealmIds)) {
        const realmDetails = await Promise.all(
          data.connectedRealmIds.map(async (realmId: string) => {
            const realmResponse = await fetch(`/api/connected-realm?connectedRealmId=${realmId}`);
            if (!realmResponse.ok) {
              console.error(`Failed to fetch details for realm ID: ${realmId}`, await realmResponse.text());
              throw new Error(`Failed to fetch details for realm ID: ${realmId}`);
            }            const realmData = await realmResponse.json();
            console.log('Realm Data:', realmData);
            return {
              id: realmData.id,
              name: realmData.realms[0]?.name || 'Unknown',
            };
          })
        );
        setConnectedRealms(realmDetails);
      } else {
        setConnectedRealms([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleAuctionsFetch = (id: string) => {
    // console.log('Fetching auctions for realm ID:', id);
    setSelectedRealmId(id);
  };

  useEffect(() => {
    fetchConnectedRealms();
  }, []);

  return (
    <div>
      <h1>Connected Realms</h1>
      <button onClick={fetchConnectedRealms} style={{ padding: '10px 20px', fontSize: '16px', marginTop: '20px' }}>
        Fetch Connected Realms
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <table style={{ marginTop: '20px', borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Connected Realm ID</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Name</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {connectedRealms.map((realm) => (
            <tr key={realm.id}>
              <td style={{ border: '1px solid black', padding: '8px' }}>{realm.id}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{realm.name}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>
                <button onClick={() => handleAuctionsFetch(realm.id)}>Fetch Auctions</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Auctions realmId={selectedRealmId} />
    </div>
  );
};

export default ConnectedRealms;
