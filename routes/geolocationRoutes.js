import express from 'express';

const router = express.Router();
const OPENCAGE_KEY = process.env.OPENCAGE_API_KEY;
const LOCATIONIQ_KEY = process.env.LOCATIONIQ_API_KEY;
const OPENCAGE_API_URL = process.env.OPENCAGE_URL || 'https://api.opencagedata.com/geocode/v1/json';

router.get('/get-address', async (req, res) => {
  const { lat, lng } = req.query;
  if (!OPENCAGE_KEY) return res.status(500).json({ error: 'OpenCage ключът не е конфигуриран на сървъра.' });
  const apiUrl = `${OPENCAGE_API_URL}?q=${lat}+${lng}&key=${OPENCAGE_KEY}&language=bg&pretty=1`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Autocomplete address
router.get('/autocomplete-address', async (req, res) => {
    const { query } = req.query;
    if (!LOCATIONIQ_KEY) return res.status(500).json({ error: 'LocationIQ ключът не е конфигуриран.' });
    if (!query) return res.status(400).json({ error: 'Липсва заявка за търсене.' });

    const baseUrl = 'https://api.locationiq.com/v1/autocomplete.php';
    const viewBox = '27.75,43.35,28.1,43.15';
    const apiUrl = `${baseUrl}?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&limit=5&format=json&accept-language=bg&viewbox=${viewBox}&bounded=1`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`LocationIQ API грешка: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Грешка при търсене на адрес.' });
    }
});

export default router;