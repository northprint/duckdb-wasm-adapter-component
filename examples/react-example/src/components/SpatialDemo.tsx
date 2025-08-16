import React, { useState, useEffect } from 'react';
import { useDuckDB, useMutation, useQuery } from '@duckdb-wasm-adapter/react';

interface Location {
  id: number;
  name: string;
  lat: number;
  lon: number;
  geom?: string;
}

export default function SpatialDemo() {
  const { connection, isConnected } = useDuckDB();
  const [spatialLoaded, setSpatialLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setupMutation = useMutation();
  
  // Load spatial extension
  useEffect(() => {
    if (isConnected && connection) {
      loadSpatialExtension();
    }
  }, [isConnected, connection]);

  const loadSpatialExtension = async () => {
    try {
      // Install and load spatial extension
      await setupMutation.mutate('INSTALL spatial');
      await setupMutation.mutate('LOAD spatial');
      
      // Create sample table with spatial data
      await setupMutation.mutate(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY,
          name VARCHAR,
          lat DOUBLE,
          lon DOUBLE,
          geom GEOMETRY
        )
      `);
      
      // Insert sample data (major cities)
      await setupMutation.mutate(`
        DELETE FROM locations;
        INSERT INTO locations (id, name, lat, lon, geom) VALUES
        (1, 'Tokyo', 35.6762, 139.6503, ST_Point(139.6503, 35.6762)),
        (2, 'New York', 40.7128, -74.0060, ST_Point(-74.0060, 40.7128)),
        (3, 'London', 51.5074, -0.1278, ST_Point(-0.1278, 51.5074)),
        (4, 'Paris', 48.8566, 2.3522, ST_Point(2.3522, 48.8566)),
        (5, 'Sydney', -33.8688, 151.2093, ST_Point(151.2093, -33.8688)),
        (6, 'São Paulo', -23.5505, -46.6333, ST_Point(-46.6333, -23.5505)),
        (7, 'Mumbai', 19.0760, 72.8777, ST_Point(72.8777, 19.0760)),
        (8, 'Cairo', 30.0444, 31.2357, ST_Point(31.2357, 30.0444)),
        (9, 'Beijing', 39.9042, 116.4074, ST_Point(116.4074, 39.9042)),
        (10, 'Los Angeles', 34.0522, -118.2437, ST_Point(-118.2437, 34.0522))
      `);
      
      setSpatialLoaded(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spatial extension');
      setSpatialLoaded(false);
    }
  };

  // Query all locations
  const allLocations = useQuery<Location>(
    'SELECT id, name, lat, lon, ST_AsText(geom) as geom FROM locations ORDER BY name',
    undefined,
    { enabled: spatialLoaded }
  );

  // Distance from Tokyo
  const distancesFromTokyo = useQuery(
    `
    SELECT 
      l2.name,
      l2.lat,
      l2.lon,
      ST_Distance_Sphere(l1.geom, l2.geom) / 1000 as distance_km
    FROM locations l1, locations l2
    WHERE l1.name = 'Tokyo' AND l2.name != 'Tokyo'
    ORDER BY distance_km
    `,
    undefined,
    { enabled: spatialLoaded }
  );

  // Locations within radius (Northern Hemisphere)
  const northernHemisphere = useQuery(
    `
    SELECT name, lat, lon
    FROM locations
    WHERE lat > 0
    ORDER BY lon
    `,
    undefined,
    { enabled: spatialLoaded }
  );

  // Bounding box query
  const boundingBoxQuery = useQuery(
    `
    SELECT 
      name,
      lat,
      lon,
      CASE 
        WHEN ST_Within(
          geom, 
          ST_MakeEnvelope(-180, -60, 180, 60)
        ) THEN 'Within Tropics/Temperate'
        ELSE 'Polar Region'
      END as zone
    FROM locations
    ORDER BY zone, name
    `,
    undefined,
    { enabled: spatialLoaded }
  );

  // Nearest neighbor query
  const nearestNeighbors = useQuery(
    `
    WITH distances AS (
      SELECT 
        l1.name as from_city,
        l2.name as to_city,
        ST_Distance_Sphere(l1.geom, l2.geom) / 1000 as distance_km
      FROM locations l1, locations l2
      WHERE l1.id != l2.id
    )
    SELECT 
      from_city,
      to_city,
      distance_km
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY from_city ORDER BY distance_km) as rn
      FROM distances
    )
    WHERE rn = 1
    ORDER BY from_city
    `,
    undefined,
    { enabled: spatialLoaded }
  );

  if (!isConnected) {
    return (
      <div className="spatial-demo">
        <p>Please connect to the database first</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spatial-demo">
        <div className="error-message">
          <h3>Error Loading Spatial Extension</h3>
          <p>{error}</p>
          <button onClick={loadSpatialExtension}>Retry</button>
        </div>
      </div>
    );
  }

  if (!spatialLoaded) {
    return (
      <div className="spatial-demo">
        <p>Loading spatial extension...</p>
      </div>
    );
  }

  return (
    <div className="spatial-demo">
      <h2>Spatial Extension Demo</h2>
      
      <div className="demo-section">
        <h3>All Locations</h3>
        {allLocations.loading && <p>Loading...</p>}
        {allLocations.data && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Geometry</th>
              </tr>
            </thead>
            <tbody>
              {allLocations.data.map((loc) => (
                <tr key={loc.id}>
                  <td>{loc.name}</td>
                  <td>{loc.lat.toFixed(4)}</td>
                  <td>{loc.lon.toFixed(4)}</td>
                  <td className="geom">{loc.geom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="demo-section">
        <h3>Distance from Tokyo (km)</h3>
        {distancesFromTokyo.loading && <p>Loading...</p>}
        {distancesFromTokyo.data && (
          <table>
            <thead>
              <tr>
                <th>City</th>
                <th>Distance (km)</th>
                <th>Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {distancesFromTokyo.data.map((row: any) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{Math.round(row.distance_km).toLocaleString()}</td>
                  <td>{row.lat.toFixed(2)}, {row.lon.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="demo-section">
        <h3>Northern Hemisphere Cities</h3>
        {northernHemisphere.loading && <p>Loading...</p>}
        {northernHemisphere.data && (
          <div className="city-list">
            {northernHemisphere.data.map((city: any) => (
              <div key={city.name} className="city-chip">
                {city.name} ({city.lat.toFixed(1)}°N)
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="demo-section">
        <h3>Climate Zones</h3>
        {boundingBoxQuery.loading && <p>Loading...</p>}
        {boundingBoxQuery.data && (
          <table>
            <thead>
              <tr>
                <th>City</th>
                <th>Zone</th>
                <th>Latitude</th>
              </tr>
            </thead>
            <tbody>
              {boundingBoxQuery.data.map((row: any) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.zone}</td>
                  <td>{row.lat.toFixed(2)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="demo-section">
        <h3>Nearest Neighbors</h3>
        {nearestNeighbors.loading && <p>Loading...</p>}
        {nearestNeighbors.data && (
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>Nearest City</th>
                <th>Distance (km)</th>
              </tr>
            </thead>
            <tbody>
              {nearestNeighbors.data.map((row: any) => (
                <tr key={row.from_city}>
                  <td>{row.from_city}</td>
                  <td>{row.to_city}</td>
                  <td>{Math.round(row.distance_km).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .spatial-demo {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .demo-section {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .demo-section h3 {
          margin-top: 0;
          color: #333;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
        }

        th {
          background: #2563eb;
          color: white;
          padding: 10px;
          text-align: left;
        }

        td {
          padding: 10px;
          border-bottom: 1px solid #e5e5e5;
        }

        tr:hover {
          background: #f9f9f9;
        }

        .geom {
          font-family: monospace;
          font-size: 0.9em;
          color: #666;
        }

        .city-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .city-chip {
          background: white;
          padding: 8px 16px;
          border-radius: 20px;
          border: 2px solid #2563eb;
          color: #2563eb;
          font-weight: 500;
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 8px;
          padding: 20px;
          color: #c00;
        }

        .error-message button {
          margin-top: 10px;
          padding: 8px 16px;
          background: #c00;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .error-message button:hover {
          background: #a00;
        }
      `}</style>
    </div>
  );
}