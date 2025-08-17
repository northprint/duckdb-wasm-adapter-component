# Spatial Extension

DuckDB WASM Adapter supports spatial data processing through the DuckDB Spatial extension, providing PostGIS-compatible functions for geographic data analysis.

## Overview

The Spatial extension enables:
- Geographic data types (POINT, LINESTRING, POLYGON, etc.)
- Spatial functions (ST_Distance, ST_Within, ST_Intersects, etc.)
- Coordinate system transformations
- Geographic indexing

## Installation

The spatial extension is automatically loaded when needed:

```javascript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

const connection = await createConnection();

// Load spatial extension
await connection.execute("INSTALL spatial");
await connection.execute("LOAD spatial");
```

## Spatial Data Types

### Basic Geometry Types

```sql
-- Point
CREATE TABLE locations (
  id INTEGER,
  name VARCHAR,
  location GEOMETRY
);

-- Insert points
INSERT INTO locations VALUES
  (1, 'Tokyo', ST_Point(139.6917, 35.6895)),
  (2, 'New York', ST_Point(-74.0060, 40.7128)),
  (3, 'London', ST_Point(-0.1276, 51.5074));
```

### Complex Geometries

```sql
-- Polygon (area)
CREATE TABLE regions (
  id INTEGER,
  name VARCHAR,
  boundary GEOMETRY
);

-- Create a polygon
INSERT INTO regions VALUES (
  1,
  'Downtown',
  ST_GeomFromText('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))')
);

-- LineString (route)
CREATE TABLE routes (
  id INTEGER,
  name VARCHAR,
  path GEOMETRY
);

INSERT INTO routes VALUES (
  1,
  'Route A',
  ST_GeomFromText('LINESTRING(0 0, 1 1, 2 1, 2 2)')
);
```

## Spatial Functions

### Distance Calculations

```javascript
// Find distance between two points
const distance = await connection.execute(`
  SELECT ST_Distance(
    ST_Point(139.6917, 35.6895),  -- Tokyo
    ST_Point(-74.0060, 40.7128)    -- New York
  ) as distance
`);

// Find nearby locations
const nearby = await connection.execute(`
  SELECT name, ST_Distance(location, ST_Point(?, ?)) as distance
  FROM locations
  WHERE ST_Distance(location, ST_Point(?, ?)) < ?
  ORDER BY distance
`, [longitude, latitude, longitude, latitude, maxDistance]);
```

### Spatial Relationships

```javascript
// Check if point is within polygon
const within = await connection.execute(`
  SELECT * FROM locations
  WHERE ST_Within(
    location,
    ST_GeomFromText('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))')
  )
`);

// Find intersecting geometries
const intersects = await connection.execute(`
  SELECT a.name, b.name
  FROM regions a, regions b
  WHERE a.id < b.id
    AND ST_Intersects(a.boundary, b.boundary)
`);
```

### Area and Length Calculations

```javascript
// Calculate area of polygon
const area = await connection.execute(`
  SELECT name, ST_Area(boundary) as area
  FROM regions
`);

// Calculate length of route
const length = await connection.execute(`
  SELECT name, ST_Length(path) as length
  FROM routes
`);
```

## GeoJSON Support

### Import GeoJSON

```javascript
// Parse GeoJSON
const geojson = {
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [139.6917, 35.6895]
  },
  properties: {
    name: "Tokyo"
  }
};

await connection.execute(`
  INSERT INTO locations (name, location)
  VALUES (?, ST_GeomFromGeoJSON(?))
`, [geojson.properties.name, JSON.stringify(geojson.geometry)]);
```

### Export to GeoJSON

```javascript
// Export as GeoJSON
const result = await connection.execute(`
  SELECT 
    name,
    ST_AsGeoJSON(location) as geometry
  FROM locations
`);

const features = result.toArray().map(row => ({
  type: "Feature",
  geometry: JSON.parse(row.geometry),
  properties: {
    name: row.name
  }
}));

const featureCollection = {
  type: "FeatureCollection",
  features
};
```

## Coordinate Systems

### Transform Coordinates

```javascript
// Transform from WGS84 to Web Mercator
await connection.execute(`
  SELECT ST_Transform(
    ST_SetSRID(ST_Point(139.6917, 35.6895), 4326),  -- WGS84
    3857  -- Web Mercator
  ) as projected
`);
```

## Spatial Indexing

### Create Spatial Index

```javascript
// Create R-tree index for faster spatial queries
await connection.execute(`
  CREATE INDEX idx_locations_spatial 
  ON locations USING RTREE (location)
`);
```

## Real-world Examples

### Store Locator

```javascript
async function findNearestStores(latitude, longitude, limit = 10) {
  const result = await connection.execute(`
    SELECT 
      name,
      address,
      ST_Distance(
        location,
        ST_Point(?, ?)
      ) * 111.32 as distance_km  -- Convert degrees to km (approximate)
    FROM stores
    ORDER BY distance_km
    LIMIT ?
  `, [longitude, latitude, limit]);
  
  return result.toArray();
}
```

### Geofencing

```javascript
async function checkGeofence(latitude, longitude, fenceId) {
  const result = await connection.execute(`
    SELECT 
      id,
      name,
      ST_Within(
        ST_Point(?, ?),
        boundary
      ) as is_inside
    FROM geofences
    WHERE id = ?
  `, [longitude, latitude, fenceId]);
  
  return result.toArray()[0]?.is_inside || false;
}
```

### Route Analysis

```javascript
async function analyzeRoute(routePoints) {
  // Create LineString from points
  const linestring = `LINESTRING(${routePoints
    .map(p => `${p.lng} ${p.lat}`)
    .join(', ')})`;
  
  const result = await connection.execute(`
    SELECT 
      ST_Length(ST_GeomFromText(?)) * 111.32 as length_km,
      ST_NumPoints(ST_GeomFromText(?)) as num_points,
      ST_StartPoint(ST_GeomFromText(?)) as start_point,
      ST_EndPoint(ST_GeomFromText(?)) as end_point
  `, [linestring, linestring, linestring, linestring]);
  
  return result.toArray()[0];
}
```

## Framework Integration

### React Map Component

```jsx
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

function LocationMap() {
  const { data } = useQuery(`
    SELECT 
      name,
      ST_X(location) as lng,
      ST_Y(location) as lat
    FROM locations
  `);
  
  return (
    <MapContainer center={[35.6895, 139.6917]} zoom={5}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {data?.map(location => (
        <Marker 
          key={location.name}
          position={[location.lat, location.lng]}
        />
      ))}
    </MapContainer>
  );
}
```

### Vue Spatial Query

```vue
<template>
  <div>
    <input v-model.number="center.lat" placeholder="Latitude">
    <input v-model.number="center.lng" placeholder="Longitude">
    <input v-model.number="radius" placeholder="Radius (km)">
    
    <ul v-if="nearbyLocations">
      <li v-for="location in nearbyLocations" :key="location.id">
        {{ location.name }} - {{ location.distance_km.toFixed(2) }} km
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const center = ref({ lat: 35.6895, lng: 139.6917 });
const radius = ref(10);

const query = computed(() => `
  SELECT 
    name,
    ST_Distance(location, ST_Point(${center.value.lng}, ${center.value.lat})) * 111.32 as distance_km
  FROM locations
  WHERE ST_Distance(location, ST_Point(${center.value.lng}, ${center.value.lat})) * 111.32 < ${radius.value}
  ORDER BY distance_km
`);

const { data: nearbyLocations } = useQuery(query);
</script>
```

## Performance Optimization

### Spatial Indexes

```javascript
// Create spatial index for better performance
await connection.execute(`
  CREATE INDEX idx_spatial ON locations USING RTREE (location)
`);

// Query will now use the spatial index
const result = await connection.execute(`
  SELECT * FROM locations
  WHERE ST_Intersects(
    location,
    ST_MakeEnvelope(?, ?, ?, ?)  -- Bounding box
  )
`, [minLng, minLat, maxLng, maxLat]);
```

### Simplify Geometries

```javascript
// Simplify complex geometries for better performance
await connection.execute(`
  UPDATE regions
  SET boundary = ST_Simplify(boundary, 0.001)
  WHERE ST_NumPoints(boundary) > 1000
`);
```

## Common Patterns

### Clustering

```javascript
// Grid-based clustering
const clusters = await connection.execute(`
  SELECT 
    FLOOR(ST_X(location) / ?) * ? as grid_x,
    FLOOR(ST_Y(location) / ?) * ? as grid_y,
    COUNT(*) as count,
    ST_Point(
      AVG(ST_X(location)),
      AVG(ST_Y(location))
    ) as center
  FROM locations
  GROUP BY grid_x, grid_y
  HAVING count > 1
`, [gridSize, gridSize, gridSize, gridSize]);
```

### Buffer Zones

```javascript
// Create buffer zones around points
const buffers = await connection.execute(`
  SELECT 
    name,
    ST_Buffer(location, ?) as buffer_zone
  FROM locations
`, [bufferDistance]);
```

## Troubleshooting

### Extension Not Found

```javascript
try {
  await connection.execute("LOAD spatial");
} catch (error) {
  if (error.message.includes("Extension")) {
    await connection.execute("INSTALL spatial");
    await connection.execute("LOAD spatial");
  }
}
```

### Invalid Geometries

```javascript
// Validate and fix geometries
await connection.execute(`
  UPDATE locations
  SET location = ST_MakeValid(location)
  WHERE NOT ST_IsValid(location)
`);
```

## Best Practices

1. **Use spatial indexes** - Critical for performance
2. **Simplify geometries** - Reduce complexity when possible
3. **Use appropriate SRID** - Match your coordinate system
4. **Validate input** - Check geometry validity
5. **Batch spatial operations** - Process multiple geometries together