import React, { useState, useEffect, useMemo } from 'react';
import CurrencyConverter from './CurrencyConverter';

interface AuctionsProps {
  realmId: string | null;
}

interface Auction {
  id: number;
  item: { id: number };
  buyout: number;
  itemClassId?: number | null;
  itemName?: string;
}

const Auctions: React.FC<AuctionsProps> = ({ realmId }) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemClasses, setItemClasses] = useState<any[]>([]);
  const [selectedItemClasses, setSelectedItemClasses] = useState<number[]>([]);
  const itemsPerPage = 10;

  const itemDetailsCache = useMemo(() => new Map<number, { itemClassId: number | null; itemName: string }>(), []);

  const filteredAuctions = useMemo(() => {
    if (auctions.length === 0) {
      console.log('Auctions data is empty, skipping filtering.');
      return [];
    }
    // console.log('Auctions state:', auctions);
    return auctions.filter((auction) => {
      const itemClassId = auction.itemClassId;
      return (
        selectedItemClasses.length === 0 ||
        (itemClassId != null && selectedItemClasses.includes(itemClassId))
      );
    });
  }, [auctions, selectedItemClasses]);

  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleItemClassSelection = (id: number) => {
    setSelectedItemClasses((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((classId) => classId !== id)
        : [...prevSelected, id]
    );
  };

  useEffect(() => {
    if (!realmId) return;

    const fetchAuctions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/auctions?realmId=${realmId}`);
        if (!response.ok) {
          const errorDetails = await response.json();
          throw new Error(errorDetails.error || 'Failed to fetch auctions');
        }
        const data = await response.json();
        console.log('Fetched auctions data:', data);
        setAuctions(data.auctions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, [realmId]);

  useEffect(() => {
    const fetchItemDetailsForPage = async () => {
    //   console.log('Filtered auctions:', filteredAuctions);
    //   console.log('Selected item classes:', selectedItemClasses);
    //   console.log('Fetching item details for page:', currentPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = currentPage * itemsPerPage;
      const currentPageAuctions: Auction[] = filteredAuctions.slice(startIndex, endIndex);

      console.log('Current page auctions:', currentPageAuctions);

      if (currentPageAuctions.length === 0) return;

      const uncachedAuctions = currentPageAuctions.filter(
        (auction) => !itemDetailsCache.has(auction.item?.id)
      );

      if (uncachedAuctions.length === 0) {
        console.log('All items for the current page are already cached.');
        return;
      }

      try {
        const auctionsPayload = uncachedAuctions.map((auction: Auction) => ({ item: { id: auction.item?.id } }));
        const itemResponse = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auctions: auctionsPayload }),
        });

        if (!itemResponse.ok) {
          const itemErrorDetails = await itemResponse.json();
          console.error('Failed to fetch item details:', itemErrorDetails);
          throw new Error(itemErrorDetails.error || 'Failed to fetch item details');
        }

        const itemsData = await itemResponse.json();
        console.log('Items API response:', itemsData);
        itemsData.forEach((item: { id: number; name: string; item_class?: { id: number | null } }) => {
          itemDetailsCache.set(item.id, {
            itemClassId: item.item_class?.id || null,
            itemName: item.name,
          });
        });

        setAuctions((prevAuctions: Auction[]) => {
          return prevAuctions.map((auction) => {
            const itemDetails = itemDetailsCache.get(auction.item?.id);
            return {
              ...auction,
              itemClassId: itemDetails?.itemClassId || auction.itemClassId || null,
              itemName: itemDetails?.itemName || auction.itemName || 'Unknown',
            };
          });
        });
      } catch (err) {
        console.error('Error fetching item details for current page:', err);
      }
    };

    fetchItemDetailsForPage();
  }, [currentPage, filteredAuctions, itemDetailsCache]);

  useEffect(() => {
    const fetchItemClasses = async () => {
      try {
        const response = await fetch('/api/item-classes');
        if (!response.ok) {
          throw new Error('Failed to fetch item classes');
        }
        const data = await response.json();
        const sortedItemClasses = data.item_classes.sort((a: any, b: any) => a.id - b.id);
        setItemClasses(sortedItemClasses);
      } catch (error) {
        console.error('Error fetching item classes:', error);
      }
    };

    fetchItemClasses();
  }, []);

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '30%', marginRight: '20px' }}>
        <h3>Item Classes</h3>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Class ID</th>
              <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Name</th>
              <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Select</th>
            </tr>
          </thead>
          <tbody>
            {itemClasses.map((itemClass) => (
              <tr key={itemClass.id}>
                <td style={{ border: '1px solid black', padding: '8px' }}>{itemClass.id}</td>
                <td style={{ border: '1px solid black', padding: '8px' }}>{itemClass.name?.ko_KR || 'Unknown'}</td>
                <td style={{ border: '1px solid black', padding: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedItemClasses.includes(itemClass.id)}
                    onChange={() => handleItemClassSelection(itemClass.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ width: '70%' }}>
        <h2>Auctions</h2>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        <table style={{ marginTop: '20px', borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Auction ID</th>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Buyout</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAuctions.map((auction) => (
              <tr key={auction.id}>
                <td>{auction.id}</td>
                <td>{auction.item?.id}</td>
                <td>{auction.itemName || 'Unknown'}</td>
                <td>{auction.buyout || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Auctions;