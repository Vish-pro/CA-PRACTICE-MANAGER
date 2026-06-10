import { PrismaClient } from '../node_modules/@prisma/client/index.js';
import bcrypt from '../node_modules/bcryptjs/umd/index.js';

const prisma = new PrismaClient();

async function getNextCode(tx, businessEntity) {
  let prefix = 'OTH';
  if (businessEntity.includes('Public Limited')) prefix = 'PLC';
  else if (businessEntity.includes('Private Limited')) prefix = 'PVT';
  else if (businessEntity.includes('LLP')) prefix = 'LLP';
  else if (businessEntity.includes('Partnership')) prefix = 'PAR';
  else if (businessEntity.includes('Proprietorship')) prefix = 'PRO';
  else if (businessEntity.includes('Trust')) prefix = 'TRS';
  else if (businessEntity.includes('HUF')) prefix = 'HUF';

  const counterId = `client_${prefix}`;
  const counter = await tx.counter.upsert({
    where: { id: counterId },
    update: { value: { increment: 1 } },
    create: { id: counterId, value: 1 },
  });
  return `${prefix}${String(counter.value).padStart(5, '0')}`;
}

// Groups with their parent PLC codes and subsidiaries
const groups = [
  {
    name: 'Tata Steel Group',
    description: 'Tata Steel Limited and its Indian subsidiaries across steel, mining, and materials',
    parentCode: 'PLC00001',
    subsidiaries: [
      { legalName: 'Tata Steel Mining Limited', businessName: 'Tata Steel Mining', businessEntity: 'Public Limited', description: 'Chrome ore mining and ferro-chrome production' },
      { legalName: 'Tata Steel Advanced Materials Limited', businessName: 'Tata Steel Advanced Materials', businessEntity: 'Public Limited', description: 'Advanced and specialty materials R&D' },
      { legalName: 'Bhushan Steel (South) Limited', businessName: 'Bhushan Steel South', businessEntity: 'Private Limited', description: 'Steel manufacturing assets in South India' },
      { legalName: 'Haldia Water Management Limited', businessName: 'Haldia Water Management', businessEntity: 'Private Limited', description: 'Water treatment services for Haldia industrial complex' },
      { legalName: 'mjunction Services Limited', businessName: 'mjunction Services', businessEntity: 'Public Limited', description: 'B2B e-commerce and e-auction platform (JV with SAIL)' },
    ],
  },
  {
    name: 'Larsen & Toubro Group',
    description: 'L&T and its diversified subsidiaries across technology, finance, construction, and infrastructure',
    parentCode: 'PLC00002',
    existingCodes: ['PLC00061'], // L&T Technology Services already in DB
    subsidiaries: [
      { legalName: 'LTIMindtree Limited', businessName: 'LTIMindtree', businessEntity: 'Public Limited', description: 'IT services and digital solutions company (NSE/BSE: LTM)' },
      { legalName: 'L&T Finance Limited', businessName: 'L&T Finance', businessEntity: 'Public Limited', description: 'NBFC providing retail, rural, and infrastructure finance' },
      { legalName: 'L&T Metro Rail (Hyderabad) Limited', businessName: 'L&T Metro Rail Hyderabad', businessEntity: 'Public Limited', description: 'Develops and operates Hyderabad Metro Rail network' },
      { legalName: 'L&T Construction Equipment Limited', businessName: 'L&T Construction Equipment', businessEntity: 'Public Limited', description: 'Manufactures hydraulic excavators, motor graders, and compactors' },
    ],
  },
  {
    name: 'NTPC Group',
    description: 'NTPC Limited and its power generation subsidiaries across thermal, renewable, and mining sectors',
    parentCode: 'PLC00003',
    subsidiaries: [
      { legalName: 'NTPC Renewable Energy Limited', businessName: 'NTPC Renewable Energy', businessEntity: 'Public Limited', description: 'Solar, wind, and hybrid renewable energy projects' },
      { legalName: 'NTPC Mining Limited', businessName: 'NTPC Mining', businessEntity: 'Public Limited', description: 'Captive coal mining for NTPC thermal power plants' },
      { legalName: 'NTPC Vidyut Vyapar Nigam Limited', businessName: 'NTPC Vidyut Vyapar Nigam', businessEntity: 'Public Limited', description: 'Power trading, REC, and solar energy sales' },
      { legalName: 'Kanti Bijlee Utpadan Nigam Limited', businessName: 'Kanti Bijlee Utpadan Nigam', businessEntity: 'Public Limited', description: 'Operates Muzaffarpur Thermal Power Station (610 MW) in Bihar' },
      { legalName: 'Patratu Vidyut Utpadan Nigam Limited', businessName: 'Patratu Vidyut Utpadan Nigam', businessEntity: 'Public Limited', description: 'JV with Jharkhand govt developing 4000 MW Patratu power station' },
    ],
  },
  {
    name: 'Coal India Group',
    description: 'Coal India Limited and its seven subsidiary mining companies across India',
    parentCode: 'PLC00004',
    subsidiaries: [
      { legalName: 'Bharat Coking Coal Limited', businessName: 'Bharat Coking Coal', businessEntity: 'Public Limited', description: 'Coking coal mining in Jharia and Raniganj coalfields, Jharkhand' },
      { legalName: 'Central Coalfields Limited', businessName: 'Central Coalfields', businessEntity: 'Public Limited', description: 'Coal mining in Jharkhand coalfields (Jharia, Bokaro, Ramgarh)' },
      { legalName: 'South Eastern Coalfields Limited', businessName: 'South Eastern Coalfields', businessEntity: 'Public Limited', description: 'Largest CIL group producer, Korba and Raigarh coalfields, Chhattisgarh' },
      { legalName: 'Mahanadi Coalfields Limited', businessName: 'Mahanadi Coalfields', businessEntity: 'Public Limited', description: 'Coal mining in Talcher and IB Valley coalfields, Odisha' },
      { legalName: 'Central Mine Planning and Design Institute Limited', businessName: 'CMPDIL', businessEntity: 'Public Limited', description: 'Mine planning, design, and technical consultancy for CIL subsidiaries' },
    ],
  },
  {
    name: 'SAIL Group',
    description: 'Steel Authority of India and its joint venture and associate companies',
    parentCode: 'PLC00005',
    subsidiaries: [
      { legalName: 'Bokaro Power Supply Company Private Limited', businessName: 'Bokaro Power Supply', businessEntity: 'Private Limited', description: 'JV with DVC supplying 338 MW power to SAIL Bokaro Steel Plant' },
      { legalName: 'International Coal Ventures Private Limited', businessName: 'International Coal Ventures', businessEntity: 'Private Limited', description: 'Govt JV to acquire overseas coking and thermal coal assets' },
      { legalName: 'NTPC SAIL Power Company Private Limited', businessName: 'NTPC SAIL Power Company', businessEntity: 'Private Limited', description: 'JV with NTPC providing captive power (314 MW) to SAIL steel plants' },
    ],
  },
];

async function main() {
  console.log('Starting group and subsidiary seeding...\n');

  for (const groupDef of groups) {
    console.log(`\n📦 Processing: ${groupDef.name}`);

    // 1. Create the group
    const group = await prisma.clientGroup.create({
      data: {
        name: groupDef.name,
        description: groupDef.description,
      },
    });
    console.log(`  ✅ Group created: ${group.name} (${group.id})`);

    // 2. Link parent PLC to this group
    const parent = await prisma.clientProfile.findFirst({
      where: { clientCode: groupDef.parentCode },
    });
    if (parent) {
      await prisma.clientProfile.update({
        where: { id: parent.id },
        data: { groupId: group.id },
      });
      console.log(`  🔗 Linked parent: ${parent.companyName} (${groupDef.parentCode})`);
    }

    // 3. Link any existing clients (by code) to this group
    if (groupDef.existingCodes?.length) {
      for (const code of groupDef.existingCodes) {
        const existing = await prisma.clientProfile.findFirst({ where: { clientCode: code } });
        if (existing) {
          await prisma.clientProfile.update({ where: { id: existing.id }, data: { groupId: group.id } });
          console.log(`  🔗 Linked existing: ${existing.companyName} (${code})`);
        }
      }
    }

    // 4. Create subsidiary clients
    for (const sub of groupDef.subsidiaries) {
      await prisma.$transaction(async (tx) => {
        const clientCode = await getNextCode(tx, sub.businessEntity);
        const email = `info_${clientCode.toLowerCase()}@prabandh.in`;
        const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

        const clientUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: sub.businessName,
            role: 'CLIENT',
          },
        });

        await tx.clientProfile.create({
          data: {
            userId: clientUser.id,
            companyName: sub.businessName,
            legalName: sub.legalName,
            businessEntity: sub.businessEntity,
            clientCode,
            groupId: group.id,
          },
        });
        console.log(`  ➕ Created subsidiary: ${sub.legalName} (${clientCode})`);
      });
    }
  }

  console.log('\n✅ All groups and subsidiaries seeded successfully!');
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
