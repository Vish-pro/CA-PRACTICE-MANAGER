import { PrismaClient } from '../node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

// ── Staff ────────────────────────────────────────────────────────────────────
const PARTNERS = [
  'a710227a-53e7-49f1-a248-4d78ba68e7f9', // Rajesh Kumar Sharma
  'a5220d2a-af8d-43ed-bd88-7e6c542bae16', // Priya Venkataraman
  'b063d168-5e05-42ff-ad6f-90ffc8e203c9', // Admin Partner
];

const SENIOR_STAFF = [
  'f7052c08-e8f9-486c-a44c-67b22a6688c1', // Amit Narayan Verma
  '130eeaf0-bea6-4010-bb3d-cc006ff24f52', // Sunita Krishnamurthy
  '5ec707c2-404e-4d0e-9227-c589f948c435', // Karthik Subramanian
  '0be9487d-e77a-4e6f-a919-3a92436fddd1', // Rohit Anand Gupta
  '17ccd251-b1e5-4286-b2a1-0e1eeef0dd57', // Ananya Balakrishnan
  '0b3066f6-7d2b-48a1-abc4-263ce0736f69', // Vikram Pratap Singh
  'aea1668a-18ba-472d-b99b-ed378d0d0814', // Deepa Pillai
  '51e5f0f1-64d4-4fbc-9d9f-78c9ed96830f', // Suresh Chandrasekaran
  '09788852-c9d7-4338-8e4e-6ae5a70b140b', // Pooja Ramesh Mehta
  '6ffce1a0-9220-434f-a01c-ec56a0fafca5', // Nikhil Dinesh Joshi
  'fed8684e-d36a-44a9-9464-1273b2a40c91', // Swati Agarwal
  '12c35f99-9a74-4a61-8f51-af7dab93c0d7', // Prasad Venkatrao
  'be8c6da9-8eb4-4de5-8a03-f47c101f0628', // Arjun Narasimha Reddy
  '28916a05-0c14-49d1-bd4d-a11b6056bca0', // Kavitha Menon
  '7e7968e6-b9bb-42bd-9271-14a2c65b6080', // Manish Kumar Srivastava
  '570c0f1c-57e9-4a31-98ed-9f7caa465eaa', // Divya Suresh Pillai
  'ac50971b-6ee8-4e1c-a4ef-9d3acf081b08', // Santosh Ramachandra Kumar
  '555cb1e5-aeb1-463a-becc-51eb85754f9c', // Rekha Subramaniam Bhat
  'fc56a3f8-eced-453f-8e17-236ec010f083', // Anil Dattatray Patil
  '88457c5f-a770-4a97-a587-caf6485e62e4', // Smita Govind Desai
  '5cc626cc-8b77-4412-a06c-851a536571e4', // Ravi Shankar Iyengar
  '12573508-beac-4478-8a8d-134f8b3f43a7', // Neeta Ramesh Kulkarni
];

// ── Service IDs ───────────────────────────────────────────────────────────────
const SVC = {
  ITR6:          '21a37a7c-fb75-4278-b874-b1f28aa97523', // ITR-6 Company Return
  AOC4:          '39de2825-234f-4a72-817b-4d1c2bbb7a86', // AOC-4 Annual Filing
  TDS26Q:        '28256ef9-b8e5-40e1-84f5-a51a4e01a219', // 26Q Non-Salary TDS
  ADVANCE_TAX:   '00482905-4bf7-47c4-a5ba-c107ee67a47e', // Advance Tax Payment
  GSTR1_M:       '0c0d56e0-e8c4-4375-9532-663e64984e26', // GSTR-1 Monthly
  GSTR3B_M:      '7d9629f2-cf6b-4d1f-8c93-c3adfeef157f', // GSTR-3B Monthly
  GSTR9:         '293277be-c872-4489-a481-8b495d02b6d0', // GSTR-9 Annual
  GSTR9C:        '677f18c6-cb47-4305-a034-186081588fde', // GSTR-9C Reconciliation
  PF:            '91ad58fd-3047-4ced-b969-86aee96b7e8c', // PF Compliance
  ESI:           '20ae331a-0bc1-4844-bb2f-29ccc18f8c00', // ESI Compliance
  CERTIFICATION: '41d356aa-4076-4644-86f4-88fd1e76f3f3', // Certification Work
  CUSTOM:        '1319d8da-f08b-4353-9d96-74a5101f70e5', // Custom Compliance
  DIR3KYC:       '1e42d8b2-c8c5-4bab-9e5d-bb36e728716f', // DIR-3 KYC
};

// Service bundles by company type
const BUNDLES = {
  // Large listed PLC — full compliance suite
  large_plc: [
    { id: SVC.ITR6,        price: 75000 },
    { id: SVC.AOC4,        price: 35000 },
    { id: SVC.TDS26Q,      price: 18000 },
    { id: SVC.ADVANCE_TAX, price: 12000 },
    { id: SVC.GSTR1_M,     price: 20000 },
    { id: SVC.GSTR3B_M,    price: 20000 },
    { id: SVC.GSTR9,       price: 45000 },
    { id: SVC.GSTR9C,      price: 55000 },
    { id: SVC.PF,          price: 15000 },
    { id: SVC.ESI,         price: 12000 },
    { id: SVC.DIR3KYC,     price:  8000 },
    { id: SVC.CERTIFICATION,price:25000 },
  ],
  // IT/fintech PLC
  it_plc: [
    { id: SVC.ITR6,        price: 85000 },
    { id: SVC.AOC4,        price: 35000 },
    { id: SVC.TDS26Q,      price: 22000 },
    { id: SVC.ADVANCE_TAX, price: 15000 },
    { id: SVC.GSTR1_M,     price: 18000 },
    { id: SVC.GSTR3B_M,    price: 18000 },
    { id: SVC.GSTR9,       price: 40000 },
    { id: SVC.PF,          price: 18000 },
    { id: SVC.ESI,         price: 15000 },
    { id: SVC.CERTIFICATION,price:30000 },
    { id: SVC.DIR3KYC,     price:  8000 },
  ],
  // Mining / PSU PLC
  mining_plc: [
    { id: SVC.ITR6,        price: 65000 },
    { id: SVC.AOC4,        price: 30000 },
    { id: SVC.TDS26Q,      price: 18000 },
    { id: SVC.ADVANCE_TAX, price: 10000 },
    { id: SVC.GSTR1_M,     price: 15000 },
    { id: SVC.GSTR3B_M,    price: 15000 },
    { id: SVC.GSTR9,       price: 40000 },
    { id: SVC.PF,          price: 20000 },
    { id: SVC.ESI,         price: 18000 },
    { id: SVC.CUSTOM,      price: 25000 },
    { id: SVC.CERTIFICATION,price:20000 },
  ],
  // JV Private Limited
  jv_pvt: [
    { id: SVC.ITR6,        price: 45000 },
    { id: SVC.AOC4,        price: 20000 },
    { id: SVC.TDS26Q,      price: 12000 },
    { id: SVC.ADVANCE_TAX, price:  8000 },
    { id: SVC.GSTR1_M,     price: 12000 },
    { id: SVC.GSTR3B_M,    price: 12000 },
    { id: SVC.PF,          price: 12000 },
    { id: SVC.ESI,         price: 10000 },
    { id: SVC.CERTIFICATION,price:15000 },
  ],
};

// ── Master data for all 22 subsidiaries ───────────────────────────────────────
const subsidiaries = [
  // ── TATA STEEL GROUP ────────────────────────────────────────────────────────
  {
    code: 'PLC00101',
    contactName: 'Company Secretary',
    contactEmail: 'mdtsalloysltd@tatasteel.com',
    mobile: '+91-674-2550101',
    address: 'Plot No. N-3/24, IRC Village, Nayapalli, Bhubaneswar, Odisha - 751015',
    gstNumber: '21AABCT8931K1ZQ',
    panNumber: 'AABCT8931K',
    labels: 'Steel,Mining,Odisha',
    bundle: 'large_plc',
  },
  {
    code: 'PLC00102',
    contactName: 'Company Secretary',
    contactEmail: 'companysecretary@tatasteel.com',
    mobile: '+91-22-66658282',
    address: '3rd Floor, One Forbes, 1 Dr. V.B. Gandhi Marg, Fort, Mumbai - 400001, Maharashtra',
    gstNumber: '27AABCT9102P1ZR',
    panNumber: 'AABCT9102P',
    labels: 'Steel,Advanced Materials,Maharashtra',
    bundle: 'large_plc',
  },
  {
    code: 'PVT00001',
    contactName: 'Sanjib Nanda',
    contactEmail: 'sanjib.nanda@tatasteel.com',
    mobile: '+91-11-41055555',
    address: 'Ground Floor, Mira Corporate Suites, Plot No. 1 & 2, Ishwar Nagar, Mathura Road, New Delhi - 110065',
    gstNumber: '07AABCB5921F1ZT',
    panNumber: 'AABCB5921F',
    labels: 'Steel,Delhi',
    bundle: 'jv_pvt',
  },
  {
    code: 'PVT00002',
    contactName: 'CFO',
    contactEmail: 'cfo.hwml@gmail.com',
    mobile: '+91-3224-252525',
    address: 'Shakti Palace, 2nd Floor, Plot No. 492, Mouza Khan Janchak, Haldia, West Bengal - 721602',
    gstNumber: '19AABCH3217K1ZM',
    panNumber: 'AABCH3217K',
    labels: 'Utilities,West Bengal',
    bundle: 'jv_pvt',
  },
  {
    code: 'PLC00103',
    contactName: 'Ajay Kumar Tiwari',
    contactEmail: 'mj@mjunction.in',
    mobile: '+91-33-66086000',
    address: 'Godrej Waterside, 3rd Floor, Tower 1, Plot V Block DP, Sector V, Salt Lake, Kolkata - 700091, West Bengal',
    gstNumber: '19AACCM5881C1ZW',
    panNumber: 'AACCM5881C',
    labels: 'E-Commerce,B2B,Kolkata',
    bundle: 'large_plc',
  },

  // ── L&T GROUP ────────────────────────────────────────────────────────────────
  {
    code: 'PLC00104',
    contactName: 'Angna Arora',
    contactEmail: 'investor@ltimindtree.com',
    mobile: '+91-22-67766776',
    address: 'L&T House, Ballard Estate, Mumbai - 400001, Maharashtra',
    gstNumber: '27AAACL1681P1Z3',
    panNumber: 'AAACL1681P',
    labels: 'IT Services,Listed,NSE,BSE',
    bundle: 'it_plc',
  },
  {
    code: 'PLC00105',
    contactName: 'Apurva Rathod',
    contactEmail: 'secretarial@ltfs.com',
    mobile: '+91-22-67496000',
    address: '2nd Floor, Brindavan, Plot No. 177, C.S.T Road, Kalina, Santacruz East, Mumbai - 400098, Maharashtra',
    gstNumber: '27AACCA1963B1Z4',
    panNumber: 'AACCA1963B',
    labels: 'NBFC,Finance,Listed',
    bundle: 'large_plc',
  },
  {
    code: 'PLC00106',
    contactName: 'Company Secretary',
    contactEmail: 'm.ravi@ltmetro.com',
    mobile: '+91-40-23531000',
    address: 'Hyderabad Metro Rail Administrative Building, Uppal Main Road, Nagole, Hyderabad - 500039, Telangana',
    gstNumber: '36AABCL8521D1ZR',
    panNumber: 'AABCL8521D',
    labels: 'Infrastructure,PPP,Hyderabad',
    bundle: 'large_plc',
  },
  {
    code: 'PLC00107',
    contactName: 'Prasad Shanbhag',
    contactEmail: 'lntecom@larsentoubro.com',
    mobile: '+91-22-67525656',
    address: 'L&T House, Narottam Morarji Marg, Ballard Estate, Mumbai - 400001, Maharashtra',
    gstNumber: '29AAACL4175C1ZN',
    panNumber: 'AAACL4175C',
    labels: 'Manufacturing,Construction Equipment,Karnataka',
    bundle: 'large_plc',
  },

  // ── NTPC GROUP ───────────────────────────────────────────────────────────────
  {
    code: 'PLC00108',
    contactName: 'Company Secretary',
    contactEmail: 'info_nrel@ntpc.co.in',
    mobile: '+91-11-24360100',
    address: 'NTPC Bhawan, SCOPE Complex, 7 Institutional Area, Lodhi Road, New Delhi - 110003',
    gstNumber: '07AABCN8514G1ZP',
    panNumber: 'AABCN8514G',
    labels: 'Renewable Energy,Solar,Wind,PSU',
    bundle: 'mining_plc',
  },
  {
    code: 'PLC00109',
    contactName: 'Company Secretary',
    contactEmail: 'NTPCCC@ntpc.co.in',
    mobile: '+91-11-24360100',
    address: 'NTPC Bhawan, Core-7, SCOPE Complex, 7 Institutional Area, Lodhi Road, New Delhi - 110003',
    gstNumber: '07AABCN9217R1ZK',
    panNumber: 'AABCN9217R',
    labels: 'Coal Mining,Captive,PSU',
    bundle: 'mining_plc',
  },
  {
    code: 'PLC00110',
    contactName: 'Company Secretary',
    contactEmail: 'nvvn@ntpc.co.in',
    mobile: '+91-120-4947238',
    address: 'NTPC Bhawan, Core-7, SCOPE Complex, 7 Institutional Area, Lodhi Road, New Delhi - 110003',
    gstNumber: '07AABCN7433J1ZC',
    panNumber: 'AABCN7433J',
    labels: 'Power Trading,REC,PSU',
    bundle: 'mining_plc',
  },
  {
    code: 'PLC00111',
    contactName: 'Company Secretary',
    contactEmail: 'hopkbunl@ntpc.co.in',
    mobile: '+91-11-24360100',
    address: 'NTPC Bhawan, Core-7, SCOPE Complex, 7 Institutional Area, Lodhi Road, New Delhi - 110003',
    gstNumber: '10AACCV4323J1ZP',
    panNumber: 'AACCV4323J',
    labels: 'Thermal Power,Bihar,PSU',
    bundle: 'mining_plc',
  },
  {
    code: 'PLC00112',
    contactName: 'Company Secretary',
    contactEmail: 'patratuit@ntpc.co.in',
    mobile: '+91-6553-260001',
    address: 'NTPC Bhawan, Core-7, SCOPE Complex, 7 Institutional Area, Lodhi Road, New Delhi - 110003',
    gstNumber: '20AABCP4127E1ZS',
    panNumber: 'AABCP4127E',
    labels: 'Thermal Power,Jharkhand,JV',
    bundle: 'mining_plc',
  },

  // ── COAL INDIA GROUP ─────────────────────────────────────────────────────────
  {
    code: 'PLC00113',
    contactName: 'Company Secretary',
    contactEmail: 'cos.bccl@coalindia.in',
    mobile: '+91-326-2291239',
    address: 'Koyla Bhawan, Koyla Nagar, BCCL Township, Dhanbad, Jharkhand - 826005',
    gstNumber: '20AAACB7934MFZB',
    panNumber: 'AAACB7934M',
    labels: 'Coking Coal,Dhanbad,PSU',
    bundle: 'mining_plc',
  },
  {
    code: 'PLC00114',
    contactName: 'Company Secretary',
    contactEmail: 'cosecttccl@gmail.com',
    mobile: '+91-651-2301606',
    address: 'Darbhanga House, Ranchi, Jharkhand - 834001',
    gstNumber: '20AAACC7476RDZX',
    panNumber: 'AAACC7476R',
    labels: 'Coal Mining,Ranchi,PSU',
    bundle: 'mining_plc',
  },
  {
    code: 'PLC00115',
    contactName: 'Company Secretary',
    contactEmail: 'compsecy.secl@coalindia.in',
    mobile: '+91-7752-246379',
    address: 'SECL Bhawan, Seepat Road, Sarkanda, Bilaspur, Chhattisgarh - 495006',
    gstNumber: '22AADCS2066E9ZL',
    panNumber: 'AADCS2066E',
    labels: 'Coal Mining,Bilaspur,PSU',
    bundle: 'mining_plc',
  },
  {
    code: 'PLC00116',
    contactName: 'Company Secretary',
    contactEmail: 'cosecymcl@gmail.com',
    mobile: '+91-663-2542040',
    address: 'Jagruti Vihar, Burla, Dist. Sambalpur, Odisha - 768020',
    gstNumber: '21AABCM5188P1Z3',
    panNumber: 'AABCM5188P',
    labels: 'Coal Mining,Odisha,PSU',
    bundle: 'mining_plc',
  },
  {
    code: 'PLC00117',
    contactName: 'Company Secretary',
    contactEmail: 'cosecretary.cmpdi@coalindia.in',
    mobile: '+91-651-2230060',
    address: 'Gondwana Place, Kanke Road, Ranchi, Jharkhand - 834008',
    gstNumber: '20AAACC7475N1ZI',
    panNumber: 'AAACC7475N',
    labels: 'Consultancy,Mine Planning,Ranchi,PSU',
    bundle: 'mining_plc',
  },

  // ── SAIL GROUP ───────────────────────────────────────────────────────────────
  {
    code: 'PVT00003',
    contactName: 'Company Secretary',
    contactEmail: 'bpscl@bpscl.com',
    mobile: '+91-654-2227525',
    address: 'Old ADM Building, Hall No. M-01, Ispat Bhawan, Bokaro Steel City, Bokaro, Jharkhand - 827001',
    gstNumber: '20AABCB8976G1ZP',
    panNumber: 'AABCB8976G',
    labels: 'Power,Steel,Jharkhand,JV',
    bundle: 'jv_pvt',
  },
  {
    code: 'PVT00004',
    contactName: 'Company Secretary',
    contactEmail: 'rajesh.icvl@gmail.com',
    mobile: '+91-11-24369000',
    address: '20th Floor, Scope Minar, Core-2, North Tower, Laxmi Nagar District Centre, Delhi - 110092',
    gstNumber: '07AABCI4862Q1ZH',
    panNumber: 'AABCI4862Q',
    labels: 'Coal,Overseas Acquisition,JV,Delhi',
    bundle: 'jv_pvt',
  },
  {
    code: 'PVT00005',
    contactName: 'Company Secretary',
    contactEmail: 'umangvats@nspcl.co.in',
    mobile: '+91-11-26196600',
    address: '4th Floor, NBCC Tower, 15 Bhikaiji Cama Place, New Delhi - 110066',
    gstNumber: '19AABCN5467A1ZK',
    panNumber: 'AABCN5467A',
    labels: 'Captive Power,SAIL,NTPC,JV',
    bundle: 'jv_pvt',
  },
];

async function main() {
  console.log(`\n🚀 Enriching ${subsidiaries.length} subsidiaries...\n`);

  for (let i = 0; i < subsidiaries.length; i++) {
    const sub = subsidiaries[i];
    const partner  = PARTNERS[i % PARTNERS.length];
    const employee = SENIOR_STAFF[i % SENIOR_STAFF.length];
    const services = BUNDLES[sub.bundle];

    // Find client by code
    const client = await prisma.clientProfile.findFirst({
      where: { clientCode: sub.code },
    });
    if (!client) {
      console.warn(`  ⚠️  Not found: ${sub.code}`);
      continue;
    }

    // 1. Update profile fields
    await prisma.clientProfile.update({
      where: { id: client.id },
      data: {
        contactName:  sub.contactName,
        contactEmail: sub.contactEmail,
        mobile:       sub.mobile,
        address:      sub.address,
        gstNumber:    sub.gstNumber,
        panNumber:    sub.panNumber,
        labels:       sub.labels,
        auditorId:    partner,
        isActive:     true,
        lastActivityAt: new Date(),
      },
    });

    // 2. Assign services via rate cards (skip if already exists)
    for (const svc of services) {
      const existing = await prisma.clientRateCard.findFirst({
        where: { clientId: client.id, serviceId: svc.id },
      });
      if (!existing) {
        await prisma.clientRateCard.create({
          data: {
            clientId:    client.id,
            serviceId:   svc.id,
            customPrice: svc.price,
          },
        });
      }
    }

    console.log(`  ✅ ${sub.code} — ${client.legalName}`);
    console.log(`     📧 ${sub.contactEmail}  |  🏛️  GST: ${sub.gstNumber}`);
    console.log(`     👔 Partner: ${PARTNERS.indexOf(partner) === 0 ? 'Rajesh Kumar Sharma' : PARTNERS.indexOf(partner) === 1 ? 'Priya Venkataraman' : 'Admin Partner'}`);
    console.log(`     🗂️  Services: ${services.length} assigned`);
  }

  console.log('\n✅ All subsidiaries enriched successfully!\n');
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
