import { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemClassId } = req.query;

  if (!itemClassId) {
    return res.status(400).json({ error: 'Missing itemClassId parameter' });
  }

  try {
    const response = await fetch(
      `https://kr.api.blizzard.com/data/wow/item-class/${itemClassId}/item-subclass?namespace=static-kr&locale=ko_KR`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BLIZZARD_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorDetails = await response.json();
      return res.status(response.status).json({ error: errorDetails.error || 'Failed to fetch item subclasses' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching item subclasses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
