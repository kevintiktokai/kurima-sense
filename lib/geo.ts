
/**
 * Calculates the area of a polygon defined by an array of {lat, lon} points.
 * Uses a spherical earth model (radius 6378137m).
 * Returns area in hectares.
 */
export function calculatePolygonArea(points: { lat: number; lon: number }[]): number {
    if (points.length < 3) return 0;

    const R = 6378137; // Earth radius in meters
    const toRad = (x: number) => (x * Math.PI) / 180;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        // Spherical excess approximation or simple trapezoidal on Mercator?
        // Let's use a standard spherical polygon area formula (Shoelace on sphere projection)
        // Actually, for small areas, the standard planar shoelace on projected coords is easiest 
        // but checking "turf" logic is safer.
        // Let's use the simple spherical approximation:
        // Area = R^2 * sum( (lon2 - lon1) * sin(lat) ) ... wait, that's not quite right.

        // Let's use the formula used by Leaflet.GeometryUtil (which basically converts to radians):
        // area += (p2.lon - p1.lon) * (2 + Math.sin(p1.lat) + Math.sin(p2.lat));
        // This is a known approximation.

        area += toRad(p2.lon - p1.lon) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
    }

    area = (area * R * R) / 2.0;

    // Return absolute value
    const areaSqMeters = Math.abs(area);

    // Convert to Hectares (1 ha = 10,000 sq meters)
    return parseFloat((areaSqMeters / 10000).toFixed(2));
}

/**
 * Calculates the perimeter of a polygon in meters using the Haversine formula.
 */
export function calculatePolygonPerimeter(points: { lat: number; lon: number }[]): number {
    if (points.length < 2) return 0;

    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6378137;
    let perimeter = 0;

    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const dLat = toRad(p2.lat - p1.lat);
        const dLon = toRad(p2.lon - p1.lon);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        perimeter += R * c;
    }

    return Math.round(perimeter);
}

/**
 * Calculate distance between two points in meters (Haversine).
 */
export function distanceBetween(
    p1: { lat: number; lon: number },
    p2: { lat: number; lon: number }
): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6378137;
    const dLat = toRad(p2.lat - p1.lat);
    const dLon = toRad(p2.lon - p1.lon);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function getCentroid(points: { lat: number; lon: number }[]): { lat: number, lon: number } {
    if (points.length === 0) return { lat: 0, lon: 0 };

    let latSum = 0;
    let lonSum = 0;

    points.forEach(p => {
        latSum += p.lat;
        lonSum += p.lon;
    });

    return {
        lat: latSum / points.length,
        lon: lonSum / points.length
    };
}

/**
 * Convert field data to GeoJSON FeatureCollection.
 * Supports single field or array of fields.
 */
export function fieldsToGeoJSON(
    fields: Array<{
        id?: string;
        name?: string;
        crop?: string;
        area?: number;
        ndvi?: number;
        soilMoisture?: number;
        healthStatus?: string;
        coordinates?: { lat: number; lon: number }[];
        plantingDate?: string;
        variety?: string;
    }>
): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = fields
        .filter(f => f.coordinates && f.coordinates.length >= 3)
        .map(field => {
            // GeoJSON uses [lon, lat] order and requires closing the ring
            const ring = field.coordinates!.map(c => [c.lon, c.lat] as [number, number]);
            // Close the polygon ring
            if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
                ring.push(ring[0]);
            }

            return {
                type: 'Feature' as const,
                properties: {
                    id: field.id || undefined,
                    name: field.name || 'Unnamed Field',
                    crop: field.crop || undefined,
                    area_ha: field.area || calculatePolygonArea(field.coordinates!),
                    ndvi: field.ndvi || undefined,
                    soil_moisture: field.soilMoisture || undefined,
                    health_status: field.healthStatus || undefined,
                    planting_date: field.plantingDate || undefined,
                    variety: field.variety || undefined,
                },
                geometry: {
                    type: 'Polygon' as const,
                    coordinates: [ring],
                },
            };
        });

    return {
        type: 'FeatureCollection',
        features,
    };
}

/**
 * Convert GeoJSON to KML format string.
 */
export function fieldsToKML(
    fields: Array<{
        name?: string;
        crop?: string;
        area?: number;
        coordinates?: { lat: number; lon: number }[];
    }>
): string {
    const placemarks = fields
        .filter(f => f.coordinates && f.coordinates.length >= 3)
        .map(field => {
            const coords = field.coordinates!
                .map(c => `${c.lon},${c.lat},0`)
                .join(' ');
            // Close the ring
            const firstCoord = `${field.coordinates![0].lon},${field.coordinates![0].lat},0`;

            return `    <Placemark>
      <name>${escapeXml(field.name || 'Unnamed Field')}</name>
      <description>${escapeXml(field.crop || '')} — ${field.area || 0} ha</description>
      <Style>
        <LineStyle><color>ff00ff00</color><width>2</width></LineStyle>
        <PolyStyle><color>4000ff00</color></PolyStyle>
      </Style>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords} ${firstCoord}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
        })
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>KurimaSense Fields</name>
${placemarks}
  </Document>
</kml>`;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
