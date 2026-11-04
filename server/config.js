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
