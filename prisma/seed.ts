import { PrismaClient, LocationType, AssetCondition, AssetStatus, WorkOrderStatus, Priority, LogType, UserRole } from "@prisma/client"

const prisma = new PrismaClient()

// Helpers
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

// ─── DATA DEFINITIONS ───

const FURNITURE_TYPES = [
  { type: "PANEL", descriptions: ["PANEL-ENHANCED, TACKABLE, ACOUSTICAL", "PANEL-POWERED, SEGMENTED", "PANEL-STACKABLE, FABRIC", "PANEL-GLASS TOP, FRAMELESS"], category: "MODULAR FURNITURE", manufacturer: "Steelcase", materials: ["Fabric", "Acoustical"], colors: ["Charcoal", "Graphite", "Taupe", "Navy"] },
  { type: "WORKSURFACE", descriptions: ["WORKSURFACE-RECTANGULAR", "WORKSURFACE-CORNER, L-SHAPED", "WORKSURFACE-PENINSULA", "WORKSURFACE-BRIDGE"], category: "MODULAR FURNITURE", manufacturer: "Steelcase", materials: ["Laminate", "Veneer"], colors: ["Medium Tone", "Light Tone", "Walnut", "Maple"] },
  { type: "CHAIR", descriptions: ["CHAIR-TASK, ERGONOMIC, ADJ ARMS", "CHAIR-GUEST, 4-LEG, UPHOLSTERED", "CHAIR-CONFERENCE, HIGH-BACK", "CHAIR-STOOL, COUNTER HEIGHT"], category: "SEATING", manufacturer: "Herman Miller", materials: ["Mesh", "Fabric", "Leather"], colors: ["Black", "Graphite", "Blue", "Burgundy"] },
  { type: "DESK", descriptions: ["DESK-SIT/STAND, ELECTRIC", "DESK-SINGLE PEDESTAL", "DESK-DOUBLE PEDESTAL", "DESK-CREDENZA"], category: "FREESTANDING FURNITURE", manufacturer: "Haworth", materials: ["Laminate", "Wood", "Metal"], colors: ["Walnut", "White", "Gray", "Espresso"] },
  { type: "TABLE", descriptions: ["TABLE-CONFERENCE, RECTANGULAR", "TABLE-ROUND, CAFÉ", "TABLE-FOLDING, 6FT", "TABLE-TRAINING, FLIP-TOP"], category: "FREESTANDING FURNITURE", manufacturer: "Knoll", materials: ["Laminate", "Wood", "Metal"], colors: ["Walnut", "White", "Gray", "Natural"] },
  { type: "FILING", descriptions: ["FILING-LATERAL, 2-DRAWER", "FILING-LATERAL, 3-DRAWER", "FILING-LATERAL, 4-DRAWER", "FILING-VERTICAL, 4-DRAWER"], category: "STORAGE", manufacturer: "Steelcase", materials: ["Metal"], colors: ["Putty", "Black", "Gray", "White"] },
  { type: "STORAGE", descriptions: ["STORAGE-OVERHEAD BIN, FLIPPER", "STORAGE-BOOKCASE, 3-SHELF", "STORAGE-WARDROBE/TOWER", "STORAGE-PEDESTAL, MOBILE BOX/FILE"], category: "STORAGE", manufacturer: "Steelcase", materials: ["Metal", "Laminate"], colors: ["Putty", "Black", "Gray", "White"] },
  { type: "CUBICLE", descriptions: ["CUBICLE-6x8 COMPLETE STATION", "CUBICLE-8x8 MANAGER STATION", "CUBICLE-6x6 STANDARD STATION"], category: "MODULAR FURNITURE", manufacturer: "Steelcase", materials: ["Fabric", "Laminate"], colors: ["Charcoal/Gray", "Taupe/Walnut", "Navy/Maple"] },
]

const CA_CITIES = ["Los Angeles","San Francisco","San Diego","Sacramento","Fresno","Long Beach","Oakland","Bakersfield","Anaheim","Santa Ana","Riverside","Stockton","Irvine","Chula Vista","Fremont","San Bernardino","Modesto","Fontana","Moreno Valley","Glendale","Huntington Beach","Santa Clarita","Garden Grove","Oceanside","Rancho Cucamonga","Ontario","Santa Rosa","Elk Grove","Corona","Lancaster","Palmdale","Salinas","Pomona","Escondido","Torrance","Pasadena","Orange","Fullerton","Roseville","Visalia","Concord","Thousand Oaks","Simi Valley","Santa Maria","Victorville","Vallejo","Berkeley","El Monte","Downey","Costa Mesa","Inglewood","Carlsbad","Fairfield","Temecula","Antioch","Murrieta","Richmond","Norwalk","West Covina","Daly City","El Cajon","Burbank","Rialto","Clovis","Compton","Vista","South Gate","Mission Viejo","Vacaville","Carson","Hesperia","Redding","Santa Cruz","Lake Forest","San Marcos","Westminster"]
const TX_CITIES = ["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington","Corpus Christi","Plano","Laredo","Lubbock","Garland","Irving","Amarillo","Grand Prairie","McKinney","Frisco","Brownsville","Pasadena","Killeen","McAllen","Mesquite","Midland","Denton","Waco","Carrollton","Round Rock","Abilene","Pearland","Richardson","Odessa","Sugar Land","Beaumont","Coppell"]
const MO_CITIES = ["Kansas City","St. Louis","Springfield","Columbia","Independence","Lee's Summit","O'Fallon","St. Joseph","St. Charles","Blue Springs","Joplin","Florissant","Chesterfield","Jefferson City","Cape Girardeau","Wildwood","Ballwin","University City","Wentzville","Maryland Heights"]
const AZ_CITIES = ["Phoenix","Tucson","Mesa","Chandler","Scottsdale","Glendale","Gilbert","Tempe","Peoria","Surprise","Goodyear","Avondale","Flagstaff","Yuma","Lake Havasu City"]
const NV_CITIES = ["Las Vegas","Henderson","Reno","North Las Vegas","Sparks","Carson City","Fernley","Elko","Mesquite","Boulder City"]
const CO_CITIES = ["Denver","Colorado Springs","Aurora","Fort Collins","Lakewood","Thornton","Arvada","Westminster","Pueblo","Centennial","Boulder","Greeley","Longmont","Loveland","Castle Rock"]

// ─── REAL CITY COORDINATES ───
// Accurate lat/lng for every branch city across all 6 states
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // ── California (76 cities) ──
  "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
  "San Diego, CA": { lat: 32.7157, lng: -117.1611 },
  "Sacramento, CA": { lat: 38.5816, lng: -121.4944 },
  "Fresno, CA": { lat: 36.7378, lng: -119.7871 },
  "Long Beach, CA": { lat: 33.7701, lng: -118.1937 },
  "Oakland, CA": { lat: 37.8044, lng: -122.2712 },
  "Bakersfield, CA": { lat: 35.3733, lng: -119.0187 },
  "Anaheim, CA": { lat: 33.8366, lng: -117.9143 },
  "Santa Ana, CA": { lat: 33.7455, lng: -117.8677 },
  "Riverside, CA": { lat: 33.9533, lng: -117.3962 },
  "Stockton, CA": { lat: 37.9577, lng: -121.2908 },
  "Irvine, CA": { lat: 33.6846, lng: -117.8265 },
  "Chula Vista, CA": { lat: 32.6401, lng: -117.0842 },
  "Fremont, CA": { lat: 37.5485, lng: -121.9886 },
  "San Bernardino, CA": { lat: 34.1083, lng: -117.2898 },
  "Modesto, CA": { lat: 37.6391, lng: -120.9969 },
  "Fontana, CA": { lat: 34.0922, lng: -117.4350 },
  "Moreno Valley, CA": { lat: 33.9425, lng: -117.2297 },
  "Glendale, CA": { lat: 34.1425, lng: -118.2551 },
  "Huntington Beach, CA": { lat: 33.6595, lng: -117.9988 },
  "Santa Clarita, CA": { lat: 34.3917, lng: -118.5426 },
  "Garden Grove, CA": { lat: 33.7739, lng: -117.9414 },
  "Oceanside, CA": { lat: 33.1959, lng: -117.3795 },
  "Rancho Cucamonga, CA": { lat: 34.1064, lng: -117.5931 },
  "Ontario, CA": { lat: 34.0633, lng: -117.6509 },
  "Santa Rosa, CA": { lat: 38.4405, lng: -122.7141 },
  "Elk Grove, CA": { lat: 38.4088, lng: -121.3716 },
  "Corona, CA": { lat: 33.8753, lng: -117.5664 },
  "Lancaster, CA": { lat: 34.6868, lng: -118.1542 },
  "Palmdale, CA": { lat: 34.5794, lng: -118.1165 },
  "Salinas, CA": { lat: 36.6777, lng: -121.6555 },
  "Pomona, CA": { lat: 34.0551, lng: -117.7500 },
  "Escondido, CA": { lat: 33.1192, lng: -117.0864 },
  "Torrance, CA": { lat: 33.8358, lng: -118.3406 },
  "Pasadena, CA": { lat: 34.1478, lng: -118.1445 },
  "Orange, CA": { lat: 33.7879, lng: -117.8531 },
  "Fullerton, CA": { lat: 33.8703, lng: -117.9242 },
  "Roseville, CA": { lat: 38.7521, lng: -121.2880 },
  "Visalia, CA": { lat: 36.3302, lng: -119.2921 },
  "Concord, CA": { lat: 37.9780, lng: -122.0311 },
  "Thousand Oaks, CA": { lat: 34.1706, lng: -118.8376 },
  "Simi Valley, CA": { lat: 34.2694, lng: -118.7815 },
  "Santa Maria, CA": { lat: 34.9530, lng: -120.4357 },
  "Victorville, CA": { lat: 34.5362, lng: -117.2928 },
  "Vallejo, CA": { lat: 38.1041, lng: -122.2566 },
  "Berkeley, CA": { lat: 37.8716, lng: -122.2727 },
  "El Monte, CA": { lat: 34.0686, lng: -118.0276 },
  "Downey, CA": { lat: 33.9401, lng: -118.1332 },
  "Costa Mesa, CA": { lat: 33.6412, lng: -117.9187 },
  "Inglewood, CA": { lat: 33.9617, lng: -118.3531 },
  "Carlsbad, CA": { lat: 33.1581, lng: -117.3506 },
  "Fairfield, CA": { lat: 38.2494, lng: -122.0400 },
  "Temecula, CA": { lat: 33.4936, lng: -117.1484 },
  "Antioch, CA": { lat: 38.0049, lng: -121.8058 },
  "Murrieta, CA": { lat: 33.5539, lng: -117.2139 },
  "Richmond, CA": { lat: 37.9358, lng: -122.3477 },
  "Norwalk, CA": { lat: 33.9022, lng: -118.0818 },
  "West Covina, CA": { lat: 34.0686, lng: -117.9390 },
  "Daly City, CA": { lat: 37.6879, lng: -122.4702 },
  "El Cajon, CA": { lat: 32.7948, lng: -116.9625 },
  "Burbank, CA": { lat: 34.1808, lng: -118.3090 },
  "Rialto, CA": { lat: 34.1064, lng: -117.3703 },
  "Clovis, CA": { lat: 36.8252, lng: -119.7029 },
  "Compton, CA": { lat: 33.8958, lng: -118.2201 },
  "Vista, CA": { lat: 33.2000, lng: -117.2426 },
  "South Gate, CA": { lat: 33.9547, lng: -118.2120 },
  "Mission Viejo, CA": { lat: 33.6000, lng: -117.6720 },
  "Vacaville, CA": { lat: 38.3566, lng: -121.9877 },
  "Carson, CA": { lat: 33.8317, lng: -118.2820 },
  "Hesperia, CA": { lat: 34.4264, lng: -117.3009 },
  "Redding, CA": { lat: 40.5865, lng: -122.3917 },
  "Santa Cruz, CA": { lat: 36.9741, lng: -122.0308 },
  "Lake Forest, CA": { lat: 33.6470, lng: -117.6890 },
  "San Marcos, CA": { lat: 33.1434, lng: -117.1661 },
  "Westminster, CA": { lat: 33.7514, lng: -117.9940 },
  // ── Texas (34 cities) ──
  "Houston, TX": { lat: 29.7604, lng: -95.3698 },
  "San Antonio, TX": { lat: 29.4241, lng: -98.4936 },
  "Dallas, TX": { lat: 32.7767, lng: -96.7970 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "Fort Worth, TX": { lat: 32.7555, lng: -97.3308 },
  "El Paso, TX": { lat: 31.7619, lng: -106.4850 },
  "Arlington, TX": { lat: 32.7357, lng: -97.1081 },
  "Corpus Christi, TX": { lat: 27.8006, lng: -97.3964 },
  "Plano, TX": { lat: 33.0198, lng: -96.6989 },
  "Laredo, TX": { lat: 27.5036, lng: -99.5076 },
  "Lubbock, TX": { lat: 33.5779, lng: -101.8552 },
  "Garland, TX": { lat: 32.9126, lng: -96.6389 },
  "Irving, TX": { lat: 32.8140, lng: -96.9489 },
  "Amarillo, TX": { lat: 35.2220, lng: -101.8313 },
  "Grand Prairie, TX": { lat: 32.7460, lng: -96.9978 },
  "McKinney, TX": { lat: 33.1972, lng: -96.6397 },
  "Frisco, TX": { lat: 33.1507, lng: -96.8236 },
  "Brownsville, TX": { lat: 25.9017, lng: -97.4975 },
  "Pasadena, TX": { lat: 29.6911, lng: -95.2091 },
  "Killeen, TX": { lat: 31.1171, lng: -97.7278 },
  "McAllen, TX": { lat: 26.2034, lng: -98.2300 },
  "Mesquite, TX": { lat: 32.7668, lng: -96.5992 },
  "Midland, TX": { lat: 31.9973, lng: -102.0779 },
  "Denton, TX": { lat: 33.2148, lng: -97.1331 },
  "Waco, TX": { lat: 31.5493, lng: -97.1467 },
  "Carrollton, TX": { lat: 32.9537, lng: -96.8903 },
  "Round Rock, TX": { lat: 30.5083, lng: -97.6789 },
  "Abilene, TX": { lat: 32.4487, lng: -99.7331 },
  "Pearland, TX": { lat: 29.5636, lng: -95.2860 },
  "Richardson, TX": { lat: 32.9483, lng: -96.7299 },
  "Odessa, TX": { lat: 31.8457, lng: -102.3676 },
  "Sugar Land, TX": { lat: 29.6197, lng: -95.6349 },
  "Beaumont, TX": { lat: 30.0802, lng: -94.1266 },
  "Coppell, TX": { lat: 32.9546, lng: -97.0150 },
  // ── Missouri (20 cities) ──
  "Kansas City, MO": { lat: 39.0997, lng: -94.5786 },
  "St. Louis, MO": { lat: 38.6270, lng: -90.1994 },
  "Springfield, MO": { lat: 37.2090, lng: -93.2923 },
  "Columbia, MO": { lat: 38.9517, lng: -92.3341 },
  "Independence, MO": { lat: 39.0911, lng: -94.4155 },
  "Lee's Summit, MO": { lat: 38.9108, lng: -94.3822 },
  "O'Fallon, MO": { lat: 38.8106, lng: -90.6998 },
  "St. Joseph, MO": { lat: 39.7675, lng: -94.8467 },
  "St. Charles, MO": { lat: 38.7881, lng: -90.4974 },
  "Blue Springs, MO": { lat: 39.0169, lng: -94.2816 },
  "Joplin, MO": { lat: 37.0842, lng: -94.5133 },
  "Florissant, MO": { lat: 38.7892, lng: -90.3226 },
  "Chesterfield, MO": { lat: 38.6631, lng: -90.5771 },
  "Jefferson City, MO": { lat: 38.5767, lng: -92.1735 },
  "Cape Girardeau, MO": { lat: 37.3059, lng: -89.5182 },
  "Wildwood, MO": { lat: 38.5828, lng: -90.6629 },
  "Ballwin, MO": { lat: 38.5953, lng: -90.5462 },
  "University City, MO": { lat: 38.6592, lng: -90.3093 },
  "Wentzville, MO": { lat: 38.8114, lng: -90.8529 },
  "Maryland Heights, MO": { lat: 38.7131, lng: -90.4297 },
  // ── Arizona (15 cities) ──
  "Phoenix, AZ": { lat: 33.4484, lng: -112.0740 },
  "Tucson, AZ": { lat: 32.2226, lng: -110.9747 },
  "Mesa, AZ": { lat: 33.4152, lng: -111.8315 },
  "Chandler, AZ": { lat: 33.3062, lng: -111.8413 },
  "Scottsdale, AZ": { lat: 33.4942, lng: -111.9261 },
  "Glendale, AZ": { lat: 33.5387, lng: -112.1860 },
  "Gilbert, AZ": { lat: 33.3528, lng: -111.7890 },
  "Tempe, AZ": { lat: 33.4255, lng: -111.9400 },
  "Peoria, AZ": { lat: 33.5806, lng: -112.2374 },
  "Surprise, AZ": { lat: 33.6292, lng: -112.3680 },
  "Goodyear, AZ": { lat: 33.4353, lng: -112.3585 },
  "Avondale, AZ": { lat: 33.4356, lng: -112.3496 },
  "Flagstaff, AZ": { lat: 35.1983, lng: -111.6513 },
  "Yuma, AZ": { lat: 32.6927, lng: -114.6277 },
  "Lake Havasu City, AZ": { lat: 34.4839, lng: -114.3225 },
  // ── Nevada (10 cities) ──
  "Las Vegas, NV": { lat: 36.1699, lng: -115.1398 },
  "Henderson, NV": { lat: 36.0395, lng: -114.9817 },
  "Reno, NV": { lat: 39.5296, lng: -119.8138 },
  "North Las Vegas, NV": { lat: 36.1989, lng: -115.1175 },
  "Sparks, NV": { lat: 39.5349, lng: -119.7527 },
  "Carson City, NV": { lat: 39.1638, lng: -119.7674 },
  "Fernley, NV": { lat: 39.6080, lng: -119.2518 },
  "Elko, NV": { lat: 40.8324, lng: -115.7631 },
  "Mesquite, NV": { lat: 36.8055, lng: -114.0672 },
  "Boulder City, NV": { lat: 35.9788, lng: -114.8329 },
  // ── Colorado (15 cities) ──
  "Denver, CO": { lat: 39.7392, lng: -104.9903 },
  "Colorado Springs, CO": { lat: 38.8339, lng: -104.8214 },
  "Aurora, CO": { lat: 39.7294, lng: -104.8319 },
  "Fort Collins, CO": { lat: 40.5853, lng: -105.0844 },
  "Lakewood, CO": { lat: 39.7047, lng: -105.0814 },
  "Thornton, CO": { lat: 39.8680, lng: -104.9719 },
  "Arvada, CO": { lat: 39.8028, lng: -105.0875 },
  "Westminster, CO": { lat: 39.8367, lng: -105.0372 },
  "Pueblo, CO": { lat: 38.2544, lng: -104.6091 },
  "Centennial, CO": { lat: 39.5807, lng: -104.8772 },
  "Boulder, CO": { lat: 40.0150, lng: -105.2705 },
  "Greeley, CO": { lat: 40.4233, lng: -104.7091 },
  "Longmont, CO": { lat: 40.1672, lng: -105.1019 },
  "Loveland, CO": { lat: 40.3978, lng: -105.0750 },
  "Castle Rock, CO": { lat: 39.3722, lng: -104.8561 },
  // ── Washington (10 cities) ──
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Kirkland, WA": { lat: 47.6815, lng: -122.2087 },
  "Bellevue, WA": { lat: 47.6101, lng: -122.2015 },
  "Redmond, WA": { lat: 47.6740, lng: -122.1215 },
  "Tacoma, WA": { lat: 47.2529, lng: -122.4443 },
  "Olympia, WA": { lat: 47.0379, lng: -122.9007 },
  "Spokane, WA": { lat: 47.6588, lng: -117.4260 },
  "Vancouver, WA": { lat: 45.6387, lng: -122.6615 },
  "Everett, WA": { lat: 47.9790, lng: -122.2021 },
  "Renton, WA": { lat: 47.4829, lng: -122.2171 },
  // ── Oregon (5 cities) ──
  "Portland, OR": { lat: 45.5152, lng: -122.6784 },
  "Salem, OR": { lat: 44.9429, lng: -123.0351 },
  "Eugene, OR": { lat: 44.0521, lng: -123.0868 },
  "Beaverton, OR": { lat: 45.4871, lng: -122.8037 },
  "Hillsboro, OR": { lat: 45.5229, lng: -122.9898 },
  // ── New York (8 cities) ──
  "New York, NY": { lat: 40.7128, lng: -74.0060 },
  "Brooklyn, NY": { lat: 40.6782, lng: -73.9442 },
  "Queens, NY": { lat: 40.7282, lng: -73.7949 },
  "Bronx, NY": { lat: 40.8448, lng: -73.8648 },
  "Staten Island, NY": { lat: 40.5795, lng: -74.1502 },
  "Albany, NY": { lat: 42.6526, lng: -73.7562 },
  "Buffalo, NY": { lat: 42.8864, lng: -78.8784 },
  "Rochester, NY": { lat: 43.1566, lng: -77.6088 },
  // ── Additional CA cities for Google/KP ──
  "Mountain View, CA": { lat: 37.3861, lng: -122.0839 },
  "San Jose, CA": { lat: 37.3382, lng: -121.8863 },
  "Sunnyvale, CA": { lat: 37.3688, lng: -122.0363 },
  "Palo Alto, CA": { lat: 37.4419, lng: -122.1430 },
  "San Bruno, CA": { lat: 37.6305, lng: -122.4111 },
  "Santa Monica, CA": { lat: 34.0195, lng: -118.4912 },
  "Redwood City, CA": { lat: 37.4852, lng: -122.2364 },
  "Santa Clara, CA": { lat: 37.3541, lng: -121.9552 },
  "Walnut Creek, CA": { lat: 37.9101, lng: -122.0652 },
}

async function main() {
  console.log("Seeding database...")

  // Clean existing data
  await prisma.workOrderItem.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.workOrder.deleteMany()
  await prisma.assetPhoto.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.facility.deleteMany()
  await prisma.clientUser.deleteMany()
  await prisma.clientConfig.deleteMany()
  await prisma.location.deleteMany()
  await prisma.client.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // ─── ORGANIZATION ───
  const org = await prisma.organization.create({
    data: {
      name: "Corovan Moving & Storage",
      slug: "corovan",
      logoUrl: null,
    },
  })
  console.log("Created organization:", org.name)

  // ─── PARTNERS ───
  const partnersData = [
    { name: "Corovan Moving & Storage", region: "California", states: ["CA"], contactName: "Max Schmitz", contactEmail: "max@corovan.com", contactPhone: "(714) 555-0100", slaTarget: 99.2 },
    { name: "Armstrong Relocation", region: "Texas", states: ["TX"], contactName: "James Armstrong", contactEmail: "james@armstrong.com", contactPhone: "(214) 555-0200", slaTarget: 97.5 },
    { name: "Dodge Moving & Storage", region: "Missouri", states: ["MO"], contactName: "Robert Dodge", contactEmail: "robert@dodgemoving.com", contactPhone: "(314) 555-0300", slaTarget: 98.1 },
    { name: "Desert Moving & Storage", region: "Arizona", states: ["AZ"], contactName: "Maria Santos", contactEmail: "maria@desertmoving.com", contactPhone: "(602) 555-0400", slaTarget: 96.8 },
    { name: "Silver State Moving", region: "Nevada", states: ["NV"], contactName: "David Chen", contactEmail: "david@silverstatemov.com", contactPhone: "(702) 555-0500", slaTarget: 97.2 },
    { name: "Rocky Mountain Relocation", region: "Colorado", states: ["CO"], contactName: "Sarah Johnson", contactEmail: "sarah@rockymtnrelo.com", contactPhone: "(303) 555-0600", slaTarget: 98.5 },
  ]

  const partners: Record<string, string> = {}
  for (const p of partnersData) {
    const partner = await prisma.partner.create({
      data: { orgId: org.id, ...p },
    })
    partners[p.states[0]] = partner.id
  }
  console.log("Created", partnersData.length, "partners")

  // ─── USERS ───
  const maxUser = await prisma.user.create({
    data: { orgId: org.id, email: "max@corovan.com", name: "Max Schmitz", role: UserRole.ORG_ADMIN },
  })
  const winnieUser = await prisma.user.create({
    data: { orgId: org.id, email: "winnie.pham@cushwake.com", name: "Winnie Pham", role: UserRole.FM_USER },
  })
  const mattUser = await prisma.user.create({
    data: { orgId: org.id, email: "matt.mckinley@cushwake.com", name: "Matt McKinley", role: UserRole.CLIENT_ADMIN },
  })
  console.log("Created 3 users")

  // ─── CLIENT ───
  const client = await prisma.client.create({
    data: {
      orgId: org.id,
      name: "AAA",
      fullName: "Automobile Club of Southern California",
      fmCompany: "Cushman & Wakefield",
      fmContactName: "Winnie Pham",
      fmContactEmail: "winnie.pham@cushwake.com",
      fmContactPhone: "(714) 555-1234",
      acctDirector: "Matt McKinley",
      customerKey: "AAA",
      isActive: true,
    },
  })

  await prisma.clientConfig.create({
    data: {
      clientId: client.id,
      isRequestEnabled: true,
      isRequestClassEnabled: true,
      isBillingEnabled: true,
      isNotificationsEnabled: true,
      isBudgetEnabled: false,
      isApprovalRequired: true,
      showPictures: true,
      showPicturesAsIcons: false,
      imageSize: 35,
      useTagNumber: true,
      rowsPerPage: 100,
    },
  })

  await prisma.clientUser.create({ data: { clientId: client.id, userId: winnieUser.id, role: "ONSITE_REQUESTOR" } })
  await prisma.clientUser.create({ data: { clientId: client.id, userId: mattUser.id, role: "ONSITE_CONTACT" } })
  console.log("Created client:", client.name)

  // ─── LOCATIONS ───
  const allLocationIds: string[] = []

  // Primary offices
  const primaryOffices = [
    { name: "Costa Mesa Administrative Office", city: "Costa Mesa", state: "CA", code: "AOCM", lat: 33.6633, lng: -117.9033, capacity: 800 },
    { name: "Los Angeles Headquarters", city: "Los Angeles", state: "CA", code: "LAHQ", lat: 34.0522, lng: -118.2437, capacity: 1200 },
    { name: "Coppell Regional Office", city: "Coppell", state: "TX", code: "CPTX", lat: 32.9546, lng: -97.0150, capacity: 600 },
    { name: "St. Louis Regional Office", city: "St. Louis", state: "MO", code: "STLMO", lat: 38.6270, lng: -90.1994, capacity: 500 },
  ]

  for (const loc of primaryOffices) {
    const statePartner = partners[loc.state]
    const location = await prisma.location.create({
      data: {
        clientId: client.id,
        partnerId: statePartner,
        name: loc.name,
        city: loc.city,
        state: loc.state,
        code: loc.code,
        lat: loc.lat,
        lng: loc.lng,
        capacity: loc.capacity,
        locationType: LocationType.PRIMARY,
      },
    })
    allLocationIds.push(location.id)

    // Add facilities for primary offices
    await prisma.facility.createMany({
      data: [
        { locationId: location.id, name: `${loc.name} - Main Building`, type: "CAMPUS/OFFICE_BLDG" },
        { locationId: location.id, name: `${loc.name} - Storage`, type: "OTHER/STORAGE_BLDG" },
      ],
    })
  }
  console.log("Created 4 primary offices with facilities")

  // Branch offices - distribute across states
  const stateConfig: { state: string; cities: string[]; count: number }[] = [
    { state: "CA", cities: CA_CITIES, count: 80 },
    { state: "TX", cities: TX_CITIES, count: 34 },
    { state: "MO", cities: MO_CITIES, count: 20 },
    { state: "AZ", cities: AZ_CITIES, count: 15 },
    { state: "NV", cities: NV_CITIES, count: 10 },
    { state: "CO", cities: CO_CITIES, count: 21 },
  ]

  // Validate all city coordinates exist
  for (const sc of stateConfig) {
    for (const city of sc.cities) {
      const key = `${city}, ${sc.state}`
      if (!CITY_COORDS[key]) {
        throw new Error(`Missing coordinates for: ${key}`)
      }
    }
  }

  let branchNum = 1
  for (const sc of stateConfig) {
    for (let i = 0; i < sc.count; i++) {
      const city = sc.cities[i % sc.cities.length]
      const code = `BR${String(branchNum).padStart(3, "0")}`
      const coords = CITY_COORDS[`${city}, ${sc.state}`]
      const location = await prisma.location.create({
        data: {
          clientId: client.id,
          partnerId: partners[sc.state],
          name: `${city} Branch Office`,
          city,
          state: sc.state,
          code,
          lat: coords.lat,
          lng: coords.lng,
          capacity: randInt(20, 120),
          locationType: LocationType.BRANCH,
        },
      })
      allLocationIds.push(location.id)
      branchNum++
    }
  }
  console.log("Created", branchNum - 1, "branch offices")

  // ─── ASSETS ───
  const TARGET_ASSETS = 4214
  let tagCounter = 100001
  const assetBatch = []

  for (let i = 0; i < TARGET_ASSETS; i++) {
    const ft = pick(FURNITURE_TYPES)
    const desc = pick(ft.descriptions)
    const locationId = pick(allLocationIds)
    const dims = ft.type === "PANEL"
      ? { width: pick([24, 30, 36, 42, 48]), height: pick([42, 53, 65, 67, 85]), depth: pick([2, 2.5, 3]) }
      : ft.type === "WORKSURFACE"
      ? { width: pick([24, 30, 36, 48, 60, 72]), height: 29, depth: pick([24, 30, 36]) }
      : ft.type === "CHAIR"
      ? { width: pick([24, 26, 28]), height: pick([36, 40, 42, 46]), depth: pick([24, 26, 28]) }
      : ft.type === "DESK"
      ? { width: pick([48, 60, 66, 72]), height: pick([29, 30]), depth: pick([24, 30, 36]) }
      : ft.type === "TABLE"
      ? { width: pick([36, 48, 60, 72, 96]), height: pick([29, 30, 42]), depth: pick([36, 48]) }
      : ft.type === "FILING"
      ? { width: pick([30, 36, 42]), height: pick([28, 40, 52, 65]), depth: pick([18, 20]) }
      : { width: pick([24, 30, 36]), height: pick([42, 53, 65, 72, 84]), depth: pick([15, 18, 24]) }

    const condition = pick([AssetCondition.EXCELLENT, AssetCondition.EXCELLENT, AssetCondition.GOOD, AssetCondition.GOOD, AssetCondition.GOOD, AssetCondition.FAIR, AssetCondition.POOR])
    const status = pick([AssetStatus.IN_STORAGE, AssetStatus.IN_STORAGE, AssetStatus.IN_STORAGE, AssetStatus.DEPLOYED, AssetStatus.AVAILABLE, AssetStatus.RESERVED])

    assetBatch.push({
      clientId: client.id,
      locationId,
      tagNumber: `COR-${tagCounter++}`,
      description: `${desc} ${dims.width}X${dims.height}`,
      type: ft.type,
      category: ft.category,
      manufacturer: ft.manufacturer,
      width: dims.width,
      height: dims.height,
      depth: dims.depth,
      primaryMaterial: pick(ft.materials),
      primaryColor: pick(ft.colors),
      originalCost: randFloat(150, 2500),
      currentValue: randFloat(50, 1800),
      quantity: ft.type === "CHAIR" || ft.type === "FILING" ? randInt(1, 4) : 1,
      condition,
      status,
      dateReceived: new Date(2020 + randInt(0, 5), randInt(0, 11), randInt(1, 28)),
    })
  }

  // Batch create in chunks of 500
  for (let i = 0; i < assetBatch.length; i += 500) {
    await prisma.asset.createMany({ data: assetBatch.slice(i, i + 500) })
    console.log(`  Created assets ${i + 1}-${Math.min(i + 500, assetBatch.length)}`)
  }
  console.log(`Created ${TARGET_ASSETS} assets`)

  // ─── WORK ORDERS ───
  const sampleAssets = await prisma.asset.findMany({ take: 50 })

  const workOrdersData = [
    { requestType: "Storage", requestCategory: "Storage-In", status: WorkOrderStatus.COMPLETED, priority: Priority.MEDIUM, requestedBy: "Winnie Pham", jobName: "Q1 Office Furniture Storage", description: "Store excess furniture from Costa Mesa renovation", fromIdx: 0, toIdx: 0, daysAgo: 45 },
    { requestType: "Storage", requestCategory: "Storage-Out", status: WorkOrderStatus.IN_PROGRESS, priority: Priority.HIGH, requestedBy: "Winnie Pham", jobName: "LA Office Restocking", description: "Pull 24 chairs and 12 desks from storage for LA HQ expansion", fromIdx: 0, toIdx: 1, daysAgo: 5 },
    { requestType: "Move", requestCategory: "Furniture Move", status: WorkOrderStatus.SCHEDULED, priority: Priority.MEDIUM, requestedBy: "Matt McKinley", jobName: "Branch Consolidation - Anaheim", description: "Move all furniture from Anaheim branch to Irvine branch", fromIdx: 4, toIdx: 5, daysAgo: 3 },
    { requestType: "Move", requestCategory: "Furniture Move", status: WorkOrderStatus.APPROVED, priority: Priority.LOW, requestedBy: "Winnie Pham", jobName: "TX Regional Rebalance", description: "Transfer panels and worksurfaces from Coppell to Houston branch", fromIdx: 2, toIdx: 6, daysAgo: 7 },
    { requestType: "Reconfigure", requestCategory: "Install", status: WorkOrderStatus.PENDING_APPROVAL, priority: Priority.MEDIUM, requestedBy: "Matt McKinley", jobName: "Costa Mesa 3rd Floor Reconfigure", description: "Reconfigure 3rd floor from 8x8 stations to 6x6 open plan", fromIdx: 0, toIdx: 0, daysAgo: 2 },
    { requestType: "Storage", requestCategory: "Storage-In", status: WorkOrderStatus.DRAFT, priority: Priority.LOW, requestedBy: "Winnie Pham", jobName: "Surplus Chair Collection", description: "Collect 40 surplus task chairs from branches for storage", fromIdx: 7, toIdx: 0, daysAgo: 1 },
    { requestType: "Event", requestCategory: "Event Setup", status: WorkOrderStatus.COMPLETED, priority: Priority.URGENT, requestedBy: "Matt McKinley", jobName: "Annual Meeting Setup", description: "Set up conference tables and 200 chairs for annual meeting at LAHQ", fromIdx: 0, toIdx: 1, daysAgo: 30 },
    { requestType: "Walk-Through", requestCategory: "Site Survey", status: WorkOrderStatus.COMPLETED, priority: Priority.LOW, requestedBy: "Winnie Pham", jobName: "Denver Inventory Audit", description: "Walk-through and physical count of all assets at Denver location", fromIdx: 8, toIdx: 8, daysAgo: 60 },
    { requestType: "Supplies", requestCategory: "Packing Materials", status: WorkOrderStatus.APPROVED, priority: Priority.LOW, requestedBy: "Winnie Pham", jobName: "Packing Supplies - St. Louis", description: "Deliver packing supplies for upcoming St. Louis office move", fromIdx: 3, toIdx: 3, daysAgo: 4 },
    { requestType: "Move", requestCategory: "Office Move", status: WorkOrderStatus.IN_PROGRESS, priority: Priority.HIGH, requestedBy: "Matt McKinley", jobName: "Phoenix Branch Relocation", description: "Full office move from old Phoenix location to new facility", fromIdx: 9, toIdx: 10, daysAgo: 8 },
    { requestType: "Reconfigure", requestCategory: "Disassemble", status: WorkOrderStatus.CANCELLED, priority: Priority.MEDIUM, requestedBy: "Winnie Pham", jobName: "Cancelled - Tucson Reconfigure", description: "Originally planned to reconfigure Tucson office — project cancelled by client", fromIdx: 11, toIdx: 11, daysAgo: 20 },
    { requestType: "Storage", requestCategory: "Storage-Out", status: WorkOrderStatus.PENDING_APPROVAL, priority: Priority.HIGH, requestedBy: "Matt McKinley", jobName: "Emergency Desk Deployment", description: "Pull 30 desks from storage for emergency office setup in Sacramento", fromIdx: 0, toIdx: 12, daysAgo: 1 },
  ]

  for (let i = 0; i < workOrdersData.length; i++) {
    const wo = workOrdersData[i]
    const seqNum = i + 1
    const fromLoc = allLocationIds[Math.min(wo.fromIdx, allLocationIds.length - 1)]
    const toLoc = allLocationIds[Math.min(wo.toIdx, allLocationIds.length - 1)]
    const fromLocation = await prisma.location.findUnique({ where: { id: fromLoc } })
    const partnerForLocation = fromLocation?.partnerId || null

    const requestDate = new Date()
    requestDate.setDate(requestDate.getDate() - wo.daysAgo)

    const workOrder = await prisma.workOrder.create({
      data: {
        clientId: client.id,
        partnerId: partnerForLocation,
        fromLocationId: fromLoc,
        toLocationId: toLoc,
        orderNumber: `AAA-WO-2026-${String(seqNum).padStart(4, "0")}`,
        sequenceNum: seqNum,
        requestType: wo.requestType,
        requestCategory: wo.requestCategory,
        priority: wo.priority,
        status: wo.status,
        requestedBy: wo.requestedBy,
        requestedByEmail: wo.requestedBy === "Winnie Pham" ? "winnie.pham@cushwake.com" : "matt.mckinley@cushwake.com",
        createdById: wo.requestedBy === "Winnie Pham" ? winnieUser.id : mattUser.id,
        jobName: wo.jobName,
        description: wo.description,
        poNumber: `PO-2026-${String(randInt(1000, 9999))}`,
        costCenter: `CC-${pick(["FAC", "OPS", "ADM"])}-${randInt(100, 999)}`,
        department: pick(["Facilities", "Operations", "Administration", "Regional Offices"]),
        requestDate,
        scheduledDate: wo.status === WorkOrderStatus.SCHEDULED || wo.status === WorkOrderStatus.IN_PROGRESS || wo.status === WorkOrderStatus.COMPLETED
          ? new Date(requestDate.getTime() + randInt(2, 14) * 86400000) : null,
        completedDate: wo.status === WorkOrderStatus.COMPLETED
          ? new Date(requestDate.getTime() + randInt(5, 30) * 86400000) : null,
      },
    })

    // Add items
    const itemCount = randInt(2, 6)
    for (let j = 0; j < itemCount && j < sampleAssets.length; j++) {
      await prisma.workOrderItem.create({
        data: {
          workOrderId: workOrder.id,
          assetId: sampleAssets[(i * 6 + j) % sampleAssets.length].id,
          quantity: randInt(1, 5),
          notes: j === 0 ? "Handle with care" : null,
        },
      })
    }

    // Add activity logs
    await prisma.activityLog.create({
      data: {
        workOrderId: workOrder.id,
        userId: wo.requestedBy === "Winnie Pham" ? winnieUser.id : mattUser.id,
        type: LogType.ACTIVITY,
        title: "Work order created",
        text: `${wo.requestedBy} created work order ${workOrder.orderNumber}`,
        createdAt: requestDate,
      },
    })

    if (wo.status !== WorkOrderStatus.DRAFT) {
      await prisma.activityLog.create({
        data: {
          workOrderId: workOrder.id,
          userId: maxUser.id,
          type: LogType.STATUS_CHANGE,
          title: `Status changed to ${wo.status.replace(/_/g, " ").toLowerCase()}`,
          text: `Max Schmitz updated status`,
          createdAt: new Date(requestDate.getTime() + 86400000),
        },
      })
    }

    if (wo.status === WorkOrderStatus.COMPLETED) {
      await prisma.activityLog.create({
        data: {
          workOrderId: workOrder.id,
          userId: maxUser.id,
          type: LogType.COMMENT,
          title: "Comment added",
          text: "All items delivered and verified. Job completed on schedule.",
          createdAt: new Date(requestDate.getTime() + randInt(5, 30) * 86400000),
        },
      })
    }
  }
  console.log("Created", workOrdersData.length, "work orders with items and activity logs")

  console.log("\n✅ Seed complete!")
  console.log(`   Organization: ${org.name}`)
  console.log(`   Client: ${client.fullName}`)
  console.log(`   Partners: ${partnersData.length}`)
  console.log(`   Locations: ${allLocationIds.length}`)
  console.log(`   Assets: ${TARGET_ASSETS}`)
  console.log(`   Work Orders: ${workOrdersData.length}`)
}

// --- V2 SEED DATA ---
async function seedV2() {
  // Backfill billing on completed work orders
  const completedOrders = await prisma.workOrder.findMany({ where: { status: 'COMPLETED' } })
  for (const wo of completedOrders) {
    const hours = 4 + Math.random() * 36
    const rate = wo.priority === 'URGENT' ? 125.0 : 85.0
    const materials = Math.random() > 0.6 ? Math.floor(Math.random() * 2000) : 0
    const total = Math.round((hours * rate + materials) * 100) / 100
    await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        actualHours: Math.round(hours * 2) / 2,
        laborRate: rate,
        materialCost: materials,
        totalCost: total,
        respondedAt: new Date(wo.createdAt.getTime() + Math.random() * 4 * 60 * 60 * 1000),
        checkedInAt: wo.scheduledDate ? new Date(wo.scheduledDate.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null,
        checkedOutAt: wo.completedDate,
      }
    })
  }
  console.log(`Backfilled billing on ${completedOrders.length} completed orders`)

  // Backfill lifecycle on assets
  const allAssets = await prisma.asset.findMany({ select: { id: true, status: true, condition: true, currentValue: true } })
  const now = new Date()
  for (const asset of allAssets) {
    const rand = Math.random()
    let lastMovedDate: Date
    if (rand < 0.30) lastMovedDate = new Date(now.getTime() - Math.random() * 90 * 24*60*60*1000)
    else if (rand < 0.55) lastMovedDate = new Date(now.getTime() - (90 + Math.random() * 90) * 24*60*60*1000)
    else if (rand < 0.75) lastMovedDate = new Date(now.getTime() - (180 + Math.random() * 180) * 24*60*60*1000)
    else lastMovedDate = new Date(now.getTime() - (365 + Math.random() * 730) * 24*60*60*1000)

    const storageCost = asset.status === 'IN_STORAGE' ? Math.round((15 + Math.random() * 70) * 100) / 100 : null
    const val = asset.currentValue || 0
    const mult = asset.condition === 'EXCELLENT' ? 0.7 : asset.condition === 'GOOD' ? 0.5 : asset.condition === 'FAIR' ? 0.25 : asset.condition === 'POOR' ? 0.05 : 0
    const resale = Math.round(val * mult)
    let rec = 'KEEP'
    if ((asset.condition === 'EXCELLENT' || asset.condition === 'GOOD') && resale > 500) rec = 'REDEPLOY'
    else if (asset.condition === 'GOOD' && resale >= 100 && resale <= 500) rec = 'LIQUIDATE'
    else if (asset.condition === 'FAIR' && resale < 200) rec = 'DONATE'
    else if (asset.condition === 'POOR' || asset.condition === 'DAMAGED') rec = 'DISPOSE'

    await prisma.asset.update({ where: { id: asset.id }, data: { lastMovedDate, monthlyStorageCost: storageCost, estimatedResaleValue: resale, dispositionRec: rec } })
  }
  console.log(`Backfilled lifecycle on ${allAssets.length} assets`)

  // Create FmPlatformConfig for AAA
  const aaaClient = await prisma.client.findFirst({ where: { customerKey: 'AAA' } })
  if (aaaClient) {
    await prisma.fmPlatformConfig.upsert({
      where: { clientId_platform: { clientId: aaaClient.id, platform: 'cushman' } },
      update: {},
      create: { clientId: aaaClient.id, platform: 'cushman', apiUrl: 'https://api.cushmanwakefield.com/v1', isActive: true }
    })
  }

  // Create partner scorecards
  const partners = await prisma.partner.findMany()
  for (const p of partners) {
    const orders = await prisma.workOrder.count({ where: { partnerId: p.id } })
    const completed = await prisma.workOrder.count({ where: { partnerId: p.id, status: 'COMPLETED' } })
    const onTimeRate = orders > 0 ? 90 + Math.random() * 10 : 0
    await prisma.partnerScorecard.upsert({
      where: { partnerId_period: { partnerId: p.id, period: '2026-Q1' } },
      update: {},
      create: {
        partnerId: p.id, period: '2026-Q1', totalOrders: orders, completedOnTime: completed,
        onTimeRate: Math.round(onTimeRate * 10) / 10,
        avgResponseHours: Math.round((1 + Math.random() * 3) * 10) / 10,
        avgCompletionHours: Math.round((8 + Math.random() * 40) * 10) / 10,
        communicationScore: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        qualityScore: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
        overallScore: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        cbreStarRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      }
    })
  }
  console.log(`Created scorecards for ${partners.length} partners`)

  // Create sample dispositions
  const storageAssets = await prisma.asset.findMany({ where: { status: 'IN_STORAGE', dispositionRec: { not: 'KEEP' } }, take: 50 })
  const methods = ['REDEPLOYED','REDEPLOYED','DONATED','DONATED','RECYCLED','RECYCLED','DISPOSED','LIQUIDATED']
  const materials = ['STEEL','WOOD','FABRIC','PLASTIC','MIXED']
  for (const a of storageAssets) {
    await prisma.disposition.create({
      data: {
        assetId: a.id, method: methods[Math.floor(Math.random()*methods.length)],
        weightLbs: 20 + Math.random() * 480, materialType: materials[Math.floor(Math.random()*materials.length)],
        carbonAvoidedLbs: Math.round(Math.random() * 500 * 100) / 100,
      }
    })
  }
  console.log(`Created ${storageAssets.length} dispositions`)
}

// --- V3 SEED DATA: Additional Clients ---
async function seedV3() {
  const org = await prisma.organization.findFirst()
  if (!org) { console.log("Skipping V3 seed - no organization found"); return }

  const existingGoogle = await prisma.client.findUnique({ where: { customerKey: "GOOG" } })
  if (existingGoogle) { console.log("V3 clients already exist, skipping"); return }

  // Get partners by state
  const allPartners = await prisma.partner.findMany()
  const partnersByState: Record<string, string> = {}
  for (const p of allPartners) {
    for (const s of p.states) {
      partnersByState[s] = p.id
    }
  }

  // Users for the new clients
  const maxUser = await prisma.user.findFirst({ where: { email: "max@corovan.com" } })
  if (!maxUser) return

  // ── Google (GOOG) ──
  const googleClient = await prisma.client.create({
    data: {
      orgId: org.id,
      name: "Google",
      fullName: "Google LLC",
      fmCompany: "JLL",
      fmContactName: "Sarah Chen",
      fmContactEmail: "sarah.chen@jll.com",
      acctDirector: "Max Schmitz",
      customerKey: "GOOG",
      isActive: true,
    },
  })
  await prisma.clientConfig.create({
    data: {
      clientId: googleClient.id,
      isRequestEnabled: true,
      isRequestClassEnabled: true,
      isBillingEnabled: true,
      isNotificationsEnabled: true,
      isApprovalRequired: true,
      showPictures: true,
      useTagNumber: true,
      rowsPerPage: 100,
    },
  })
  await prisma.clientUser.create({ data: { clientId: googleClient.id, userId: maxUser.id, role: "ACCOUNT_DIRECTOR" } })
  console.log("Created client: Google")

  // Google locations: CA, WA, NY, TX
  const googleCities: { city: string; state: string }[] = [
    // CA - 15 locations
    ...["Mountain View","San Francisco","San Jose","Sunnyvale","Palo Alto","San Bruno","Los Angeles","Irvine","San Diego","Santa Monica","Redwood City","Fremont","Oakland","Sacramento","Long Beach"]
      .map(city => ({ city, state: "CA" })),
    // WA - 10 locations
    ...["Seattle","Kirkland","Bellevue","Redmond","Tacoma","Olympia","Spokane","Vancouver","Everett","Renton"]
      .map(city => ({ city, state: "WA" })),
    // NY - 8 locations
    ...["New York","Brooklyn","Queens","Bronx","Staten Island","Albany","Buffalo","Rochester"]
      .map(city => ({ city, state: "NY" })),
    // TX - 7 locations
    ...["Austin","Dallas","Houston","San Antonio","Plano","Irving","Fort Worth"]
      .map(city => ({ city, state: "TX" })),
  ]

  const googleLocationIds: string[] = []
  for (let i = 0; i < googleCities.length; i++) {
    const c = googleCities[i]
    const coordKey = `${c.city}, ${c.state}`
    const coords = CITY_COORDS[coordKey] || { lat: 37.4 + Math.random(), lng: -122.0 - Math.random() }
    const loc = await prisma.location.create({
      data: {
        clientId: googleClient.id,
        partnerId: partnersByState[c.state] || null,
        name: `Google ${c.city} Office`,
        city: c.city,
        state: c.state,
        code: `GOOG-${String(i + 1).padStart(3, "0")}`,
        lat: coords.lat,
        lng: coords.lng,
        capacity: randInt(50, 300),
        locationType: i < 4 ? LocationType.PRIMARY : LocationType.BRANCH,
      },
    })
    googleLocationIds.push(loc.id)
  }
  console.log(`Created ${googleLocationIds.length} Google locations`)

  // Google assets: 2,000
  const googleAssets = []
  let gTagCounter = 200001
  for (let i = 0; i < 2000; i++) {
    const ft = pick(FURNITURE_TYPES)
    const desc = pick(ft.descriptions)
    const locationId = pick(googleLocationIds)
    const condition = pick([AssetCondition.EXCELLENT, AssetCondition.EXCELLENT, AssetCondition.GOOD, AssetCondition.GOOD, AssetCondition.GOOD, AssetCondition.FAIR])
    const status = pick([AssetStatus.IN_STORAGE, AssetStatus.DEPLOYED, AssetStatus.DEPLOYED, AssetStatus.AVAILABLE, AssetStatus.RESERVED])
    googleAssets.push({
      clientId: googleClient.id,
      locationId,
      tagNumber: `GOOG-${gTagCounter++}`,
      description: desc,
      type: ft.type,
      category: ft.category,
      manufacturer: ft.manufacturer,
      primaryMaterial: pick(ft.materials),
      primaryColor: pick(ft.colors),
      originalCost: randFloat(200, 3000),
      currentValue: randFloat(80, 2200),
      quantity: ft.type === "CHAIR" ? randInt(1, 6) : 1,
      condition,
      status,
      dateReceived: new Date(2021 + randInt(0, 4), randInt(0, 11), randInt(1, 28)),
    })
  }
  for (let i = 0; i < googleAssets.length; i += 500) {
    await prisma.asset.createMany({ data: googleAssets.slice(i, i + 500) })
  }
  console.log("Created 2,000 Google assets")

  // ── Kaiser Permanente (KP) ──
  const kpClient = await prisma.client.create({
    data: {
      orgId: org.id,
      name: "Kaiser Permanente",
      fullName: "Kaiser Foundation Health Plan Inc.",
      fmCompany: "CBRE",
      fmContactName: "Michael Torres",
      fmContactEmail: "michael.torres@cbre.com",
      acctDirector: "Max Schmitz",
      customerKey: "KP",
      isActive: true,
    },
  })
  await prisma.clientConfig.create({
    data: {
      clientId: kpClient.id,
      isRequestEnabled: true,
      isRequestClassEnabled: true,
      isBillingEnabled: true,
      isNotificationsEnabled: true,
      isApprovalRequired: true,
      showPictures: true,
      useTagNumber: true,
      rowsPerPage: 100,
    },
  })
  await prisma.clientUser.create({ data: { clientId: kpClient.id, userId: maxUser.id, role: "ACCOUNT_DIRECTOR" } })
  console.log("Created client: Kaiser Permanente")

  // KP locations: CA, OR, WA
  const kpCities: { city: string; state: string }[] = [
    // CA - 15 locations
    ...["Oakland","Los Angeles","San Francisco","San Diego","Sacramento","Fresno","Riverside","Fontana","Walnut Creek","Santa Clara","Redwood City","Pasadena","Irvine","San Jose","Bakersfield"]
      .map(city => ({ city, state: "CA" })),
    // OR - 5 locations
    ...["Portland","Salem","Eugene","Beaverton","Hillsboro"]
      .map(city => ({ city, state: "OR" })),
    // WA - 5 locations
    ...["Seattle","Tacoma","Bellevue","Spokane","Vancouver"]
      .map(city => ({ city, state: "WA" })),
  ]

  const kpLocationIds: string[] = []
  for (let i = 0; i < kpCities.length; i++) {
    const c = kpCities[i]
    const coordKey = `${c.city}, ${c.state}`
    const coords = CITY_COORDS[coordKey] || { lat: 37.8 + Math.random() * 0.5, lng: -122.3 + Math.random() * 0.5 }
    const loc = await prisma.location.create({
      data: {
        clientId: kpClient.id,
        partnerId: partnersByState[c.state] || null,
        name: `Kaiser ${c.city} Medical Center`,
        city: c.city,
        state: c.state,
        code: `KP-${String(i + 1).padStart(3, "0")}`,
        lat: coords.lat,
        lng: coords.lng,
        capacity: randInt(30, 200),
        locationType: i < 3 ? LocationType.PRIMARY : LocationType.BRANCH,
      },
    })
    kpLocationIds.push(loc.id)
  }
  console.log(`Created ${kpLocationIds.length} Kaiser Permanente locations`)

  // KP assets: 1,500
  const kpAssets = []
  let kpTagCounter = 300001
  for (let i = 0; i < 1500; i++) {
    const ft = pick(FURNITURE_TYPES)
    const desc = pick(ft.descriptions)
    const locationId = pick(kpLocationIds)
    const condition = pick([AssetCondition.EXCELLENT, AssetCondition.GOOD, AssetCondition.GOOD, AssetCondition.GOOD, AssetCondition.FAIR, AssetCondition.POOR])
    const status = pick([AssetStatus.IN_STORAGE, AssetStatus.IN_STORAGE, AssetStatus.DEPLOYED, AssetStatus.AVAILABLE])
    kpAssets.push({
      clientId: kpClient.id,
      locationId,
      tagNumber: `KP-${kpTagCounter++}`,
      description: desc,
      type: ft.type,
      category: ft.category,
      manufacturer: ft.manufacturer,
      primaryMaterial: pick(ft.materials),
      primaryColor: pick(ft.colors),
      originalCost: randFloat(150, 2500),
      currentValue: randFloat(40, 1600),
      quantity: ft.type === "CHAIR" ? randInt(1, 4) : 1,
      condition,
      status,
      dateReceived: new Date(2020 + randInt(0, 5), randInt(0, 11), randInt(1, 28)),
    })
  }
  for (let i = 0; i < kpAssets.length; i += 500) {
    await prisma.asset.createMany({ data: kpAssets.slice(i, i + 500) })
  }
  console.log("Created 1,500 Kaiser Permanente assets")

  console.log("\n✅ V3 Seed complete - Multi-client data added")
}

main()
  .then(() => seedV2())
  .then(() => seedV3())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
