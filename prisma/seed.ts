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

  let branchNum = 1
  for (const sc of stateConfig) {
    for (let i = 0; i < sc.count; i++) {
      const city = sc.cities[i % sc.cities.length]
      const code = `BR${String(branchNum).padStart(3, "0")}`
      const location = await prisma.location.create({
        data: {
          clientId: client.id,
          partnerId: partners[sc.state],
          name: `${city} Branch Office`,
          city,
          state: sc.state,
          code,
          lat: (sc.state === "CA" ? 33.5 : sc.state === "TX" ? 30.5 : sc.state === "MO" ? 38.3 : sc.state === "AZ" ? 33.3 : sc.state === "NV" ? 36.1 : 39.5) + (Math.random() - 0.5) * 3,
          lng: (sc.state === "CA" ? -118.0 : sc.state === "TX" ? -97.0 : sc.state === "MO" ? -91.0 : sc.state === "AZ" ? -112.0 : sc.state === "NV" ? -116.0 : -105.0) + (Math.random() - 0.5) * 4,
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

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
