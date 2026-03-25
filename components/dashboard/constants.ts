import { FieldData, CropType } from './types';

export const MOCK_FIELDS: FieldData[] = [
    {
        id: 'f1',
        name: 'Golden Harvest East',
        crop: CropType.MAIZE,
        area: 12.5,
        ndvi: 0.68,
        soilMoisture: 42,
        healthStatus: 'Good',
        lastSatellitePass: '2024-05-15'
    },
    {
        id: 'f2',
        name: 'Central Plains 2',
        crop: CropType.TOBACCO,
        area: 8.2,
        ndvi: 0.45,
        soilMoisture: 18,
        healthStatus: 'Critical',
        lastSatellitePass: '2024-05-14'
    },
    {
        id: 'f3',
        name: 'North Terrace',
        crop: CropType.WHEAT,
        area: 25.0,
        ndvi: 0.72,
        soilMoisture: 55,
        healthStatus: 'Excellent',
        lastSatellitePass: '2024-05-15'
    }
];
