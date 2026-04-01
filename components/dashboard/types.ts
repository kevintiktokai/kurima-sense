export enum CropType {
    MAIZE = 'Maize',
    WHEAT = 'Wheat',
    SOYBEAN = 'Soybeans',
    TOBACCO = 'Tobacco',
    COTTON = 'Cotton',
    POTATO = 'Potato',
    TOMATO = 'Tomato',
    ONION = 'Onion',
    CABBAGE = 'Cabbage',
    GROUNDNUTS = 'Groundnuts',
    SORGHUM = 'Sorghum',
    SUNFLOWER = 'Sunflower',
    SUGAR_BEANS = 'Sugar Beans',
    SWEET_POTATO = 'Sweet Potato',
    FINGER_MILLET = 'Finger Millet',
    PEARL_MILLET = 'Pearl Millet',
    COWPEAS = 'Cowpeas',
    BAMBARA_NUTS = 'Bambara Nuts',
    BUTTERNUT = 'Butternut',
    PAPRIKA = 'Paprika',
    PEAS = 'Peas',
    SNOW_PEAS = 'Snow Peas',
    BLUEBERRIES = 'Blueberries',
    GREEN_BEANS = 'Green Beans',
    TEA = 'Tea',
    SESAME = 'Sesame',
    CASSAVA = 'Cassava',
    GARLIC = 'Garlic',
    STRAWBERRIES = 'Strawberries',
    GREEN_PEPPER = 'Green Pepper',
    AVOCADO = 'Avocado',
    BANANA = 'Banana',
    COFFEE = 'Coffee',
    CITRUS = 'Citrus',
    MACADAMIA = 'Macadamia',
    COVO = 'Covo',
    MUSTARD = 'Mustard',
    RAPE = 'Rape',
    CARROT = 'Carrot'
}

export interface FieldData {
    id: string;
    name: string;
    crop: CropType;
    area: number;
    ndvi: number;
    soilMoisture: number;
    healthStatus: 'Excellent' | 'Good' | 'Critical';
    lastSatellitePass: string;
    location?: {
        lat: number;
        lon: number;
    };
    coordinates?: {
        lat: number;
        lon: number;
    }[];
    plantingDate?: string;
    planting_date?: string;
    variety?: string;
    fertilizerHistory?: string;
    projected_yield?: number; // tonnes
    yield_potential?: number; // tonnes
    last_analysis?: string;
    latestInsight?: string; // AI generated insight
}

export interface UserProfile {
    name: string;
    email: string;
    region: string;
    role: string;
    crops: string[];
    full_name?: string;
    phone_number?: string;
    preferred_language?: string;
    whatsapp_notifications?: boolean;
}
