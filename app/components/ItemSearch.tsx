import React, { useState, useEffect } from 'react';

const LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'ko_KR';

const ItemSearch: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 10;

  const fetchItems = async () => {
    setError(null);
    try {
      const response = await fetch(`/api/item-search?name.ko_KR=${encodeURIComponent(searchQuery)}&orderby=desc`);
      if (!response.ok) {
        const errorDetails = await response.json();
        throw new Error(errorDetails.error || 'Failed to fetch items');
      }
      const data = await response.json();
      console.log('Fetched data:', data);
      const filteredItems = data.results.filter((item: any) => item.data?.name?.ko_KR?.includes(searchQuery));
      console.log('Filtered Items:', filteredItems);
      setItems(filteredItems); // Store all filtered items locally

      // Calculate totalPages based on the filteredItems length
      const totalFilteredPages = Math.ceil(filteredItems.length / itemsPerPage);
      setTotalPages(totalFilteredPages); // Directly set totalPages based on calculation

      // Reset to the first page on new search
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const getPaginatedItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  useEffect(() => {
    // Removed automatic fetchItems call on searchQuery change
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim() === '') {
      setError('Please enter a search query.');
      return;
    }
    setError(null);
    fetchItems();
  };

  return (
    <div>
      <h1>Item Search</h1>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for an item"
          style={{ padding: '10px', fontSize: '16px', width: '300px' }}
        />
        <button onClick={handleSearch} style={{ padding: '10px 20px', fontSize: '16px', marginLeft: '10px' }}>
          Search
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <table style={{ marginTop: '20px', borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Item Name</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Item ID</th>
          </tr>
        </thead>
        <tbody>
          {getPaginatedItems().map((item, index) => (
            <tr key={item.id || index}>
              <td style={{ border: '1px solid black', padding: '8px' }}>{item.data?.name?.ko_KR}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{item.data?.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ItemSearch;
