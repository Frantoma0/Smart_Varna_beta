// utils/helpers.js
import ngeohash from 'ngeohash';


export function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    if ((lat1 == lat2) && (lon1 == lon2)) return 0;
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export function getFormattedDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} [precision=8]
 * @returns {string|null}
 */

export function getGeohash(latitude, longitude, precision = 8) {
    if (latitude == null || longitude == null) return null;
    return ngeohash.encode(latitude, longitude, precision);
}

/**
 * @param {string} geohash
 * @returns {string[]}
 */

export function getGeohashWithNeighbors(geohash) {
    if (!geohash) return [];
    return [geohash, ...ngeohash.neighbors(geohash)];
}