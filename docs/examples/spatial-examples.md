# Spatial Examples

Examples of working with spatial data and GIS functionality in DuckDB WASM.

## Spatial Extension Setup

### Loading Spatial Extension

```javascript
// React - Initialize with spatial extension
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  const spatialConfig = {
    extensions: ['spatial'],
    onConnect: async (connection) => {
      // Load spatial extension
      await connection.execute("INSTALL spatial");
      await connection.execute("LOAD spatial");
      
      // Verify installation
      const result = await connection.execute("SELECT ST_Version()");
      console.log('Spatial extension version:', result[0]);
    }
  };

  return (
    <DuckDBProvider config={spatialConfig}>
      <SpatialApp />
    </DuckDBProvider>
  );
}
```

## Basic Geometry Operations

### Creating Geometries

```javascript
// Create points, lines, and polygons
const geometryExamples = {
  // Point geometry
  createPoint: `
    SELECT 
      ST_Point(longitude, latitude) as location,
      name
    FROM locations
  `,
  
  // Line geometry
  createLine: `
    SELECT 
      ST_MakeLine(
        ST_Point(start_lon, start_lat),
        ST_Point(end_lon, end_lat)
      ) as route
    FROM routes
  `,
  
  // Polygon geometry
  createPolygon: `
    SELECT 
      ST_MakePolygon(
        ST_MakeLine(ARRAY[
          ST_Point(0, 0),
          ST_Point(10, 0),
          ST_Point(10, 10),
          ST_Point(0, 10),
          ST_Point(0, 0)
        ])
      ) as boundary
  `,
  
  // From WKT (Well-Known Text)
  fromWKT: `
    SELECT 
      ST_GeomFromText('POINT(-122.4194 37.7749)') as sf_location,
      ST_GeomFromText('LINESTRING(0 0, 1 1, 2 0)') as path,
      ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0))') as square
  `,
  
  // From GeoJSON
  fromGeoJSON: `
    SELECT ST_GeomFromGeoJSON('{
      "type": "Point",
      "coordinates": [-122.4194, 37.7749]
    }') as location
  `
};
```

### Geometry Properties

```javascript
// Vue - Display geometry properties
<template>
  <div>
    <h3>Geometry Analysis</h3>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="prop in geometryProps" :key="prop.name">
          <td>{{ prop.name }}</td>
          <td>{{ prop.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useConnection } from '@northprint/duckdb-wasm-adapter-vue';

const { connection } = useConnection();
const geometryProps = ref([]);

onMounted(async () => {
  const result = await connection.execute(`
    WITH geom AS (
      SELECT ST_GeomFromText('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))') as g
    )
    SELECT 
      'Area' as property, ST_Area(g) as value FROM geom
    UNION ALL
    SELECT 
      'Perimeter', ST_Perimeter(g) FROM geom
    UNION ALL
    SELECT 
      'Centroid', ST_AsText(ST_Centroid(g)) FROM geom
    UNION ALL
    SELECT 
      'Envelope', ST_AsText(ST_Envelope(g)) FROM geom
    UNION ALL
    SELECT 
      'Is Valid', ST_IsValid(g)::VARCHAR FROM geom
  `);
  
  geometryProps.value = result.map(row => ({
    name: row.property,
    value: row.value
  }));
});
</script>
```

## Spatial Relationships

### Distance Calculations

```javascript
// Calculate distances between points
function DistanceCalculator() {
  const [origin, setOrigin] = useState({ lat: 37.7749, lon: -122.4194 });
  const [destinations, setDestinations] = useState([]);

  const calculateDistances = async () => {
    const result = await connection.execute(`
      WITH origin AS (
        SELECT ST_Point(?, ?) as point
      ),
      destinations AS (
        SELECT 
          name,
          ST_Point(longitude, latitude) as point
        FROM locations
      )
      SELECT 
        d.name,
        ST_Distance(o.point, d.point) as euclidean_distance,
        ST_DistanceSphere(o.point, d.point) as sphere_distance_meters,
        ST_DistanceSphere(o.point, d.point) / 1000 as sphere_distance_km
      FROM origin o, destinations d
      ORDER BY sphere_distance_meters
    `, [origin.lon, origin.lat]);
    
    setDestinations(result);
  };

  return (
    <div>
      <h3>Distance from San Francisco</h3>
      <input 
        type="number" 
        value={origin.lat} 
        onChange={(e) => setOrigin({...origin, lat: e.target.value})}
        placeholder="Latitude"
      />
      <input 
        type="number" 
        value={origin.lon} 
        onChange={(e) => setOrigin({...origin, lon: e.target.value})}
        placeholder="Longitude"
      />
      <button onClick={calculateDistances}>Calculate</button>
      
      <table>
        <thead>
          <tr>
            <th>Destination</th>
            <th>Distance (km)</th>
          </tr>
        </thead>
        <tbody>
          {destinations.map(dest => (
            <tr key={dest.name}>
              <td>{dest.name}</td>
              <td>{dest.sphere_distance_km.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Spatial Predicates

```javascript
// Spatial relationship queries
const spatialRelationships = {
  // Points within polygon
  pointsInPolygon: `
    SELECT 
      p.id,
      p.name,
      ST_AsText(p.location) as location
    FROM points p, boundaries b
    WHERE ST_Within(p.location, b.geometry)
      AND b.name = 'Downtown'
  `,
  
  // Intersecting geometries
  intersections: `
    SELECT 
      a.name as area_a,
      b.name as area_b,
      ST_Area(ST_Intersection(a.geometry, b.geometry)) as overlap_area
    FROM regions a, regions b
    WHERE a.id < b.id  -- Avoid duplicate pairs
      AND ST_Intersects(a.geometry, b.geometry)
  `,
  
  // Buffer zones
  bufferAnalysis: `
    SELECT 
      name,
      ST_Buffer(location, 1000) as buffer_1km,
      COUNT(*) FILTER (
        WHERE ST_DWithin(location, other.location, 1000)
      ) as nearby_count
    FROM facilities
    CROSS JOIN facilities other
    WHERE facilities.id != other.id
    GROUP BY facilities.id, facilities.name, facilities.location
  `,
  
  // Nearest neighbors
  nearestNeighbors: `
    WITH target AS (
      SELECT ST_Point(-122.4194, 37.7749) as point
    )
    SELECT 
      name,
      ST_Distance(location, target.point) as distance
    FROM stores, target
    ORDER BY distance
    LIMIT 5
  `
};
```

## Geospatial Data Import

### GeoJSON Import

```javascript
// Svelte - Import GeoJSON data
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  let geojsonFile = null;
  let features = [];

  async function importGeoJSON(file) {
    const text = await file.text();
    const geojson = JSON.parse(text);
    
    // Create table for features
    await db.connection.execute(`
      CREATE TABLE IF NOT EXISTS geo_features (
        id INTEGER,
        geometry GEOMETRY,
        properties JSON
      )
    `);
    
    // Import each feature
    for (let i = 0; i < geojson.features.length; i++) {
      const feature = geojson.features[i];
      
      await db.connection.execute(`
        INSERT INTO geo_features VALUES (?, ST_GeomFromGeoJSON(?), ?)
      `, [
        i,
        JSON.stringify(feature.geometry),
        JSON.stringify(feature.properties)
      ]);
    }
    
    // Query imported data
    const result = await db.connection.execute(`
      SELECT 
        id,
        ST_GeometryType(geometry) as geom_type,
        json_extract(properties, '$.name') as name
      FROM geo_features
    `);
    
    features = result;
  }

  function handleFileSelect(event) {
    geojsonFile = event.target.files[0];
    if (geojsonFile) {
      importGeoJSON(geojsonFile);
    }
  }
</script>

<div>
  <h3>Import GeoJSON</h3>
  <input type="file" accept=".geojson,.json" on:change={handleFileSelect} />
  
  {#if features.length > 0}
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Type</th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        {#each features as feature}
          <tr>
            <td>{feature.id}</td>
            <td>{feature.geom_type}</td>
            <td>{feature.name}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
```

### Shapefile Processing

```javascript
// Process shapefile data (converted to GeoJSON)
async function processShapefile(shapefileData) {
  // Assume shapefile has been converted to GeoJSON format
  // using a library like shapefile.js
  
  // Create spatial index
  await connection.execute(`
    CREATE TABLE spatial_data (
      fid INTEGER PRIMARY KEY,
      geometry GEOMETRY,
      name VARCHAR,
      category VARCHAR,
      area DOUBLE
    )
  `);
  
  // Batch insert with geometry validation
  const batch = [];
  for (const feature of shapefileData.features) {
    batch.push({
      geometry: JSON.stringify(feature.geometry),
      name: feature.properties.name,
      category: feature.properties.category,
      area: feature.properties.area
    });
    
    if (batch.length === 100) {
      await insertBatch(batch);
      batch.length = 0;
    }
  }
  
  if (batch.length > 0) {
    await insertBatch(batch);
  }
  
  // Create spatial index
  await connection.execute(`
    CREATE INDEX idx_spatial_geometry ON spatial_data USING GIST (geometry)
  `);
}

async function insertBatch(batch) {
  const values = batch.map(item => 
    `(ST_GeomFromGeoJSON('${item.geometry}'), '${item.name}', '${item.category}', ${item.area})`
  ).join(',');
  
  await connection.execute(`
    INSERT INTO spatial_data (geometry, name, category, area) 
    VALUES ${values}
  `);
}
```

## Spatial Analysis

### Clustering Analysis

```javascript
// Spatial clustering with DBSCAN-like approach
function SpatialClustering() {
  const [clusters, setClusters] = useState([]);
  const [epsilon, setEpsilon] = useState(0.01); // Distance threshold
  const [minPoints, setMinPoints] = useState(5);

  const performClustering = async () => {
    // Simple distance-based clustering
    const result = await connection.execute(`
      WITH RECURSIVE clusters AS (
        -- Initial clusters
        SELECT 
          id,
          location,
          id as cluster_id,
          1 as iteration
        FROM points
        
        UNION ALL
        
        -- Expand clusters
        SELECT 
          p.id,
          p.location,
          CASE 
            WHEN COUNT(*) FILTER (
              WHERE ST_DWithin(p.location, c.location, ?)
            ) >= ?
            THEN MIN(c.cluster_id)
            ELSE p.id
          END as cluster_id,
          c.iteration + 1
        FROM points p, clusters c
        WHERE c.iteration < 10  -- Max iterations
        GROUP BY p.id, p.location, c.iteration
      )
      SELECT 
        cluster_id,
        COUNT(*) as point_count,
        ST_AsText(ST_Centroid(ST_Collect(location))) as centroid,
        ST_Area(ST_ConvexHull(ST_Collect(location))) as hull_area
      FROM clusters
      WHERE iteration = (SELECT MAX(iteration) FROM clusters)
      GROUP BY cluster_id
      HAVING COUNT(*) >= ?
      ORDER BY point_count DESC
    `, [epsilon, minPoints, minPoints]);
    
    setClusters(result);
  };

  return (
    <div>
      <h3>Spatial Clustering</h3>
      <div>
        <label>
          Epsilon (distance):
          <input 
            type="number" 
            value={epsilon} 
            onChange={(e) => setEpsilon(e.target.value)}
            step="0.001"
          />
        </label>
        <label>
          Min Points:
          <input 
            type="number" 
            value={minPoints} 
            onChange={(e) => setMinPoints(e.target.value)}
          />
        </label>
        <button onClick={performClustering}>Cluster</button>
      </div>
      
      <div className="clusters">
        {clusters.map(cluster => (
          <div key={cluster.cluster_id} className="cluster">
            <h4>Cluster {cluster.cluster_id}</h4>
            <p>Points: {cluster.point_count}</p>
            <p>Centroid: {cluster.centroid}</p>
            <p>Hull Area: {cluster.hull_area?.toFixed(4)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Spatial Aggregation

```javascript
// Grid-based aggregation
const gridAggregation = `
  WITH grid AS (
    SELECT 
      x.val as x,
      y.val as y,
      ST_MakeEnvelope(
        x.val, y.val,
        x.val + 0.01, y.val + 0.01
      ) as cell
    FROM 
      generate_series(-180, 180, 0.01) as x(val),
      generate_series(-90, 90, 0.01) as y(val)
  )
  SELECT 
    g.x,
    g.y,
    COUNT(p.id) as point_count,
    AVG(p.value) as avg_value,
    SUM(p.value) as sum_value
  FROM grid g
  LEFT JOIN points p ON ST_Within(p.location, g.cell)
  GROUP BY g.x, g.y
  HAVING COUNT(p.id) > 0
`;

// Hexagonal binning
const hexBinning = `
  WITH hex_grid AS (
    SELECT 
      ST_HexagonGrid(0.1, ST_MakeEnvelope(-180, -90, 180, 90)) as hex
  )
  SELECT 
    hex,
    COUNT(p.id) as count,
    AVG(p.value) as avg_value
  FROM hex_grid h
  JOIN points p ON ST_Within(p.location, h.hex)
  GROUP BY hex
`;
```

## Map Visualization

### Interactive Map Component

```javascript
// React - Map visualization with Leaflet
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function SpatialMap({ query }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const { data, loading } = useQuery(query);

  useEffect(() => {
    // Initialize map
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current).setView([37.7749, -122.4194], 10);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current);
    }
  }, []);

  useEffect(() => {
    if (data && mapInstance.current) {
      // Clear existing layers
      mapInstance.current.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
          mapInstance.current.removeLayer(layer);
        }
      });
      
      // Add new data
      data.forEach(row => {
        if (row.geojson) {
          const geojson = JSON.parse(row.geojson);
          L.geoJSON(geojson, {
            style: {
              color: row.color || '#3388ff',
              weight: 2,
              opacity: 0.7,
              fillOpacity: 0.3
            },
            onEachFeature: (feature, layer) => {
              if (row.popup) {
                layer.bindPopup(row.popup);
              }
            }
          }).addTo(mapInstance.current);
        }
      });
    }
  }, [data]);

  return (
    <div>
      <div ref={mapRef} style={{ height: '500px', width: '100%' }} />
      {loading && <div>Loading spatial data...</div>}
    </div>
  );
}

// Usage
function MapExample() {
  const query = `
    SELECT 
      ST_AsGeoJSON(geometry) as geojson,
      name as popup,
      CASE 
        WHEN category = 'park' THEN '#00ff00'
        WHEN category = 'water' THEN '#0000ff'
        ELSE '#ff0000'
      END as color
    FROM spatial_features
    WHERE ST_Within(
      geometry,
      ST_MakeEnvelope(-122.5, 37.7, -122.3, 37.8)
    )
  `;
  
  return <SpatialMap query={query} />;
}
```

## Routing and Networks

### Shortest Path Analysis

```javascript
// Network routing with spatial data
const routingAnalysis = `
  WITH RECURSIVE paths AS (
    -- Start from origin
    SELECT 
      n.id,
      n.location,
      ARRAY[n.id] as path,
      0.0 as total_distance
    FROM nodes n
    WHERE n.id = ?  -- Start node
    
    UNION ALL
    
    -- Explore connected nodes
    SELECT 
      e.to_node as id,
      n.location,
      p.path || e.to_node as path,
      p.total_distance + e.distance as total_distance
    FROM paths p
    JOIN edges e ON p.id = e.from_node
    JOIN nodes n ON e.to_node = n.id
    WHERE NOT (e.to_node = ANY(p.path))  -- Avoid cycles
      AND p.total_distance < 10000  -- Max distance limit
  )
  SELECT 
    path,
    total_distance,
    ST_MakeLine(ARRAY(
      SELECT location 
      FROM nodes 
      WHERE id = ANY(path)
      ORDER BY array_position(path, id)
    )) as route_geometry
  FROM paths
  WHERE id = ?  -- End node
  ORDER BY total_distance
  LIMIT 1
`;
```

### Service Area Analysis

```javascript
// Calculate service areas (isochrones)
function ServiceAreaAnalysis() {
  const [center, setCenter] = useState({ lat: 37.7749, lon: -122.4194 });
  const [timeIntervals, setTimeIntervals] = useState([5, 10, 15]); // minutes
  const [serviceAreas, setServiceAreas] = useState([]);

  const calculateServiceAreas = async () => {
    const result = await connection.execute(`
      WITH center_point AS (
        SELECT ST_Point(?, ?) as location
      ),
      reachable_points AS (
        SELECT 
          p.id,
          p.location,
          ST_Distance(c.location, p.location) / 1.4 as walking_time_minutes
        FROM points p, center_point c
      )
      SELECT 
        ? as time_interval,
        ST_AsGeoJSON(
          ST_ConvexHull(
            ST_Collect(location)
          )
        ) as service_area,
        COUNT(*) as points_covered
      FROM reachable_points
      WHERE walking_time_minutes <= ?
      GROUP BY time_interval
    `, [center.lon, center.lat, ...timeIntervals.flatMap(t => [t, t])]);
    
    setServiceAreas(result);
  };

  return (
    <div>
      <h3>Service Area Analysis</h3>
      <button onClick={calculateServiceAreas}>Calculate</button>
      
      {serviceAreas.map(area => (
        <div key={area.time_interval}>
          <h4>{area.time_interval} Minute Walk</h4>
          <p>Points Covered: {area.points_covered}</p>
        </div>
      ))}
    </div>
  );
}
```

## Spatial Optimization

### Facility Location Problem

```javascript
// Optimal facility placement
const facilityLocation = `
  WITH candidate_locations AS (
    SELECT 
      id,
      location,
      capacity
    FROM potential_sites
  ),
  demand_points AS (
    SELECT 
      id,
      location,
      demand
    FROM customers
  ),
  distances AS (
    SELECT 
      c.id as site_id,
      d.id as customer_id,
      ST_Distance(c.location, d.location) as distance,
      c.capacity,
      d.demand
    FROM candidate_locations c
    CROSS JOIN demand_points d
  ),
  assignments AS (
    SELECT 
      customer_id,
      site_id,
      distance,
      demand,
      ROW_NUMBER() OVER (
        PARTITION BY customer_id 
        ORDER BY distance
      ) as rank
    FROM distances
  )
  SELECT 
    site_id,
    COUNT(customer_id) as customers_served,
    SUM(demand) as total_demand,
    AVG(distance) as avg_distance,
    SUM(demand * distance) as total_cost
  FROM assignments
  WHERE rank = 1
  GROUP BY site_id
  HAVING SUM(demand) <= capacity
  ORDER BY total_cost
  LIMIT 5
`;
```

## Spatial Data Export

### Export to GeoJSON

```javascript
// Export query results as GeoJSON
async function exportToGeoJSON(query) {
  const result = await connection.execute(query);
  
  const featureCollection = {
    type: "FeatureCollection",
    features: result.map(row => ({
      type: "Feature",
      geometry: JSON.parse(row.geometry_geojson),
      properties: Object.fromEntries(
        Object.entries(row).filter(([key]) => key !== 'geometry_geojson')
      )
    }))
  };
  
  // Download as file
  const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'spatial_data.geojson';
  a.click();
  URL.revokeObjectURL(url);
  
  return featureCollection;
}

// Usage
const exportQuery = `
  SELECT 
    ST_AsGeoJSON(geometry) as geometry_geojson,
    name,
    category,
    area
  FROM spatial_features
  WHERE area > 1000
`;

await exportToGeoJSON(exportQuery);
```

## Best Practices

1. **Use spatial indexes** for performance
2. **Validate geometries** before operations
3. **Choose appropriate coordinate systems**
4. **Optimize complex spatial queries** with CTEs
5. **Cache computed geometries** when possible
6. **Use appropriate precision** for coordinates
7. **Test with realistic data volumes**

## Next Steps

- [Full Apps](/examples/full-apps) - Complete application examples
- [Performance Guide](/guide/performance) - Optimize spatial queries
- [API Reference](/api/) - Complete API documentation