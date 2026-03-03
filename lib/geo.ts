
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
