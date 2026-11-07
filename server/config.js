export const LIMITS = {
  usernameMin: 6, usernameMax: 40, passwordMin: 6, passwordMax: 15,
  photosPerListing: 8, photoBytes: 700 * 1024, attachmentBytes: 25 * 1024 * 1024, smallStoreBytes: 1500 * 1024, thumbBytes: 150 * 1024,
  listingsPerHour: 10, signupsPerHour: 10, loginsPer10Min: 15, messagesPerMinute: 30,
  totalLiveListings: 1000, reportsToHide: 3, messageLength: 2000,
  auctionMs: 72 * 3600e3, conversationIdleMs: 7 * 24 * 3600e3, sessionMs: 30 * 24 * 3600e3,
};
export const AUCTION = { thresholdShare: 0.85, feeRate: 0.08 };
export const CITIES = ['Lynden', 'Everson', 'Sumas', 'Ferndale', 'Blaine', 'Bellingham', 'Burlington', 'Mount Vernon', 'Anacortes', 'Arlington', 'Marysville', 'Everett'];
export const PART_CATEGORIES = ['Audio', 'Brakes', 'Drivetrain', 'Electrical', 'Engine', 'Exterior', 'Interior', 'Lighting', 'Maintenance', 'Suspension', 'Wheels & Tires'];
export const CAR_CATEGORIES = ['Parts Car', 'Beater', 'Daily', 'Weekend', 'Built'];
export const CONDITIONS = ['New', 'Like new', 'Excellent', 'Good', 'Fair', 'Parts only'];
export const HANDOFFS = ['Meet up or pick up', 'Pick up only', 'Test drive by appointment', 'Bring a trailer'];
export const MESSAGE_TEMPLATE = ['attachment', 'id', 'text', 'time'];
export const BID_TEMPLATE = ['account', 'amount', 'sent'];

// Map: the middle of each town, used for listings without a pin. [latitude, longitude]
export const TOWN_SPOTS = {
  Lynden: [48.9465, -122.4521], Everson: [48.9201, -122.3426], Sumas: [49.0001, -122.2649], Ferndale: [48.8465, -122.5910],
  Blaine: [48.9937, -122.7471], Bellingham: [48.7519, -122.4787], Burlington: [48.4757, -122.3254], 'Mount Vernon': [48.4212, -122.3340],
  Anacortes: [48.5126, -122.6127], Arlington: [48.1987, -122.1251], Marysville: [48.0518, -122.1771], Everett: [47.9790, -122.2021],
};
// Pins have to land in this area, so the map stays local.
export const MAP_AREA = { south: 47.6, north: 49.2, west: -123.4, east: -121.4 };
// Placeholder businesses for the map until business accounts exist. Delete this list then.
export const EXAMPLE_BUSINESSES = [
  { id: 'example-1', name: 'Example business', city: 'Lynden', lat: 48.9512, lng: -122.4605 },
  { id: 'example-2', name: 'Example business', city: 'Blaine', lat: 48.9902, lng: -122.7378 },
  { id: 'example-3', name: 'Example business', city: 'Ferndale', lat: 48.8501, lng: -122.5869 },
  { id: 'example-4', name: 'Example business', city: 'Everson', lat: 48.9188, lng: -122.3391 },
  { id: 'example-5', name: 'Example business', city: 'Bellingham', lat: 48.7623, lng: -122.4870 },
];
