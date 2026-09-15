import fs from 'node:fs';

async function run() {
  const url = 'https://raw.githubusercontent.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces/main/GeoJSON/indonesia-38-provinces.geojson';
  console.log("Fetching 38 provinces GeoJSON from:", url);
  const res = await fetch(url);
  const data = await res.json();

  const targetProvinces = [
    { key: 'aceh', name: 'Provinsi Aceh', match: 'ACEH', color: '#EF4444', capital: 'Banda Aceh', center: [96.8, 4.2] },
    { key: 'sumut', name: 'Provinsi Sumatera Utara', match: 'SUMATERA UTARA', color: '#F97316', capital: 'Medan', center: [99.0, 2.3] },
    { key: 'sumbar', name: 'Provinsi Sumatera Barat', match: 'SUMATERA BARAT', color: '#EAB308', capital: 'Padang', center: [100.5, -0.8] },
    { key: 'riau', name: 'Provinsi Riau', match: 'RIAU', color: '#10B981', capital: 'Pekanbaru', center: [101.5, 0.5] },
    { key: 'kepri', name: 'Provinsi Kepulauan Riau', match: 'KEPULAUAN RIAU', color: '#06B6D4', capital: 'Tanjungpinang', center: [104.5, 1.0] },
    { key: 'jambi', name: 'Provinsi Jambi', match: 'JAMBI', color: '#3B82F6', capital: 'Jambi', center: [103.5, -1.6] },
    { key: 'sumsel', name: 'Provinsi Sumatera Selatan', match: 'SUMATERA SELATAN', color: '#8B5CF6', capital: 'Palembang', center: [104.2, -3.1] },
    { key: 'babel', name: 'Provinsi Kepulauan Bangka Belitung', match: 'BANGKA BELITUNG', color: '#EC4899', capital: 'Pangkalpinang', center: [106.3, -2.5] }
  ];

  console.log("Total features in source GeoJSON:", data.features.length);
  
  const extractedFeatures = [];

  for (const item of targetProvinces) {
    const found = data.features.find(f => {
      const propName = String(
        f.properties.Propinsi || 
        f.properties.PROVINSI || 
        f.properties.name || 
        f.properties.NAME_1 || 
        f.properties.state || ''
      ).toUpperCase();

      if (item.key === 'riau') {
        return propName === 'RIAU';
      }
      return propName.includes(item.match);
    });

    if (found) {
      console.log(`FOUND match for ${item.name}:`, found.properties);
      extractedFeatures.push({
        type: "Feature",
        id: item.key,
        properties: {
          id: item.key,
          name: item.name,
          color: item.color,
          capital: item.capital,
          center: item.center
        },
        geometry: found.geometry
      });
    } else {
      console.warn(`WARNING: Match not found for ${item.name}`);
    }
  }

  const resultGeoJSON = {
    type: "FeatureCollection",
    features: extractedFeatures
  };

  fs.writeFileSync('./backend/src/provinces-data.json', JSON.stringify(resultGeoJSON, null, 2));
  console.log(`Successfully wrote ${extractedFeatures.length} province features to backend/src/provinces-data.json`);
}

run();
