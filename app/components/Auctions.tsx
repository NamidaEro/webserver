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

interface ItemSubclass {
  id: number;
  name: string;
}

const Auctions: React.FC<AuctionsProps> = ({ realmId }) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemClasses, setItemClasses] = useState<any[]>([]);
  const [selectedItemClasses, setSelectedItemClasses] = useState<number[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [subclasses, setSubclasses] = useState<ItemSubclass[]>([]);
  const [loadingSubclasses, setLoadingSubclasses] = useState<boolean>(false);
  const itemsPerPage = 10;

  const itemDetailsCache = useMemo(() => new Map<number, { itemClassId: number | null; itemName: string }>(), []);

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

  const handleItemClassClick = async (classId: number) => {
    if (selectedClassId === classId) {
      // 이미 선택된 클래스 ID를 다시 클릭한 경우 접기
      setSelectedClassId(null);
      setSubclasses([]);
      return;
    }

    setSelectedClassId(classId);
    setLoadingSubclasses(true);
    
    try {
      const response = await fetch(`/api/item-subclasses?itemClassId=${classId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch item subclasses');
      }
      const data = await response.json();
      
      if (data && data.item_subclasses && Array.isArray(data.item_subclasses)) {
        const formattedSubclasses = data.item_subclasses.map((subclass: any) => ({
          id: subclass.id,
          name: typeof subclass.name === 'string' ? subclass.name : 
               (subclass.name && subclass.name.ko_KR ? subclass.name.ko_KR : 'Unknown')
        }));
        
        setSubclasses(formattedSubclasses);
      } else {
        setSubclasses([]);
      }
    } catch (error) {
      console.error('Error fetching item subclasses:', error);
      setSubclasses([]);
    } finally {
      setLoadingSubclasses(false);
    }
  };

  const handleItemClassSelection = async (id: number) => {
    setSelectedItemClasses((prevSelected) => {
      const updatedSelection = prevSelected.includes(id)
        ? prevSelected.filter((classId) => classId !== id)
        : [...prevSelected, id];

      // Update filtered auctions based on the new selection
      const updatedFilteredAuctions = auctions.filter((auction) => {
        const itemClassId = auction.itemClassId;
        return (
          updatedSelection.length === 0 ||
          (itemClassId != null && updatedSelection.includes(itemClassId))
        );
      });

      setFilteredAuctions(updatedFilteredAuctions);
      return updatedSelection;
    });

    // Fetch item names for filtered auctions
    const filteredAuctionIds = auctions
      .filter((auction) => selectedItemClasses.includes(auction.itemClassId || -1))
      .map((auction) => auction.item.id);

    const uncachedIds = filteredAuctionIds.filter((id) => !itemDetailsCache.has(id));

    if (uncachedIds.length > 0) {
      try {
        const itemResponse = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auctions: uncachedIds.map((id) => ({ item: { id } })) }),
        });

        if (!itemResponse.ok) {
          console.error('Failed to fetch item details for filtered auctions');
          return;
        }

        const itemsData = await itemResponse.json();
        itemsData.forEach((item: { id: number; name: string; classid: number | null }) => {
          itemDetailsCache.set(item.id, {
            itemClassId: item.classid || null,
            itemName: item.name,
          });
        });

        setFilteredAuctions((prevFiltered) =>
          prevFiltered.map((auction) => {
            const itemDetails = itemDetailsCache.get(auction.item.id);
            return {
              ...auction,
              itemName: itemDetails?.itemName || auction.itemName || 'Unknown',
            };
          })
        );
      } catch (err) {
        console.error('Error fetching item details for filtered auctions:', err);
      }
    }
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
        setFilteredAuctions(data.auctions || []);
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
        itemsData.forEach((item: { id: number; name: string; classid: number | null }) => {
          itemDetailsCache.set(item.id, {
            itemClassId: item.classid || null,
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

  useEffect(() => {
    const updatedFilteredAuctions = auctions.filter((auction) => {
      const itemClassId = auction.itemClassId;
      return (
        selectedItemClasses.length === 0 ||
        (itemClassId != null && selectedItemClasses.includes(itemClassId))
      );
    });
    setFilteredAuctions(updatedFilteredAuctions);
  }, [auctions, selectedItemClasses]);

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '30%', marginRight: '20px' }}>
        <h3>Item Classes</h3>        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Class ID</th>
              <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Name</th>
            </tr>
          </thead>
          <tbody>
            {itemClasses.map((itemClass) => (
              <React.Fragment key={itemClass.id}>
                <tr>
                  <td style={{ border: '1px solid black', padding: '8px' }}>{itemClass.id}</td>
                  <td 
                    style={{ 
                      border: '1px solid black', 
                      padding: '8px', 
                      cursor: 'pointer',
                      backgroundColor: selectedClassId === itemClass.id ? '#f0f0f0' : 'transparent'
                    }}
                    onClick={() => handleItemClassClick(itemClass.id)}
                  >
                    {itemClass.name || 'Unknown'}
                  </td>
                </tr>
                
                {selectedClassId === itemClass.id && (
                  <tr>
                    <td colSpan={2} style={{ padding: '0' }}>
                      {loadingSubclasses ? (
                        <div style={{ padding: '8px', textAlign: 'center' }}>로딩 중...</div>
                      ) : subclasses.length > 0 ? (
                        <table style={{ borderCollapse: 'collapse', width: '100%', marginLeft: '20px' }}>
                          <thead>
                            <tr>
                              <th style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'left', backgroundColor: '#f8f8f8' }}>Subclass ID</th>
                              <th style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'left', backgroundColor: '#f8f8f8' }}>Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subclasses.map((subclass) => (
                              <tr key={subclass.id}>
                                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{subclass.id}</td>
                                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{subclass.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{ padding: '8px', textAlign: 'center' }}>서브클래스가 없습니다</div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
                <td>
                  <CurrencyConverter copper={auction.buyout} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Auctions;