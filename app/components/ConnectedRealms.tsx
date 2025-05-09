import React, { useState } from 'react';

const ConnectedRealms: React.FC = () => {
  const [connectedRealms, setConnectedRealms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectedRealms = async () => {
    setError(null);
    try {
      const response = await fetch('/api/connected-realms');
      if (!response.ok) {
        const errorDetails = await response.json();
        throw new Error(errorDetails.error || 'Failed to fetch connected realms');
      }
      const data = await response.json();
      setConnectedRealms(data.connectedRealmIds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

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
          </tr>
        </thead>
        <tbody>
          {connectedRealms.map((realm) => (
            <tr key={realm}>
              <td style={{ border: '1px solid black', padding: '8px' }}>{realm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConnectedRealms;
