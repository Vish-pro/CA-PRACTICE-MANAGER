import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Detailed mapping of names in docx text to names in seed.ts / database
const nameMapping: { [key: string]: string } = {
  'itr-1 (individual salary)': 'ITR-1 (Individual Salary)',
  'itr-2 (capital gains)': 'ITR-2 (Capital Gains)',
  'itr-3 (business income)': 'ITR-3 (Business Income)',
  'itr-4 (presumptive income)': 'ITR-4 (Presumptive Income)',
  'itr-5 (partnership)': 'ITR-5 (Partnership)',
  'itr-6 (company return)': 'ITR-6 (Company Return)',
  'itr-7 (trust/ngo)': 'ITR-7 (Trust/NGO)',
  'form 15ca/15cb': 'Form 15CA/15CB',
  'advance tax challan': 'Advance Tax Challan', // Note: seed has this in Income Tax
  'amendment of pan': 'Amendment of PAN',
  'gstr-1 (monthly)': 'GSTR-1 (Monthly)',
  'gstr-1 (quarterly - qrmp)': 'GSTR-1 (Quarterly - QRMP)',
  'gstr-3b (monthly)': 'GSTR-3B (Monthly)',
  'gstr-3b (qrmp - north india)': 'GSTR-3B (QRMP - North India)',
  'gstr-3b (qrmp - south india)': 'GSTR-3B (QRMP - South India)',
  'gstr-4 (composition dealers)': 'GSTR-4 (Composition Dealers)',
  'gstr-5 (non-resident taxable)': 'GSTR-5 (Non-resident taxable)',
  'gstr-5a (oidar)': 'GSTR-5A (OIDAR)',
  'gstr-7 (tds return)': 'GSTR-7 (TDS Return)',
  'gstr-9 (annual return)': 'GSTR-9 (Annual Return)',
  'gstr-9c (reconciliation)': 'GSTR-9C (Reconciliation)',
  'gstr-10 (final return)': 'GSTR-10 (Final Return)',
  'gstr-11 (inward supplies for uin)': 'GSTR-11 (Inward Supplies for UIN)',
  'cmp-08 (composition dealers)': 'CMP-08 (Composition Dealers)',
  'aoc-4 (annual financial filing)': 'AOC-4 (Annual Filing)',
  'aoc-4 (annual filing)': 'AOC-4 (Annual Filing)',
  'mgt-7 (annual return)': 'MGT-7 (Annual Return)',
  'dir-3 kyc': 'DIR-3 KYC',
  'adt-1 (auditor appointment)': 'ADT-1 (Auditor Appointment)',
  'inc-20a (commencement of business)': 'INC-20A (Commencement of Business)',
  'inc-22 (registered office)': 'INC-22 (Registered Office)',
  'pas-3 (allotment of shares)': 'PAS-3 (Allotment of Shares)',
  'sh-7 (change in share capital)': 'SH-7 (Change in Share Capital)',
  '24q (salary tds)': '24Q (Salary TDS Return)',
  '26q (non-salary tds)': '26Q (Non-Salary TDS)',
  '27q (foreign tds)': '27Q (TDS on Foreign Payments)',
  '27eq (tcs return)': '27EQ (TCS Return)',
  '26qb (tds property)': '26QB (TDS on Property)',
  '26qc (tds on rent)': '26QC (TDS on Rent)',
  'pf return filing': 'PF Return Filing',
  'pf registration': 'PF Registration',
  'pf compliance': 'PF Compliance',
  'pf transfer': 'PF Transfer',
  'pf withdrawal': 'PF Withdrawal',
  'esi return': 'ESI Return',
  'esi registration': 'ESI Registration',
  'esi compliance': 'ESI Compliance',
  'professional tax return': 'Professional Tax Return',
  'pt registration': 'PT Registration',
  'pt registratio': 'PT Registration',
  'pt enrollment certificate': 'PT Enrollment Certificate',
  'advance tax payment': 'Advance Tax Payment',
  'advance tax calculation': 'Advance Tax Calculation',
  'advisory services': 'Advisory Services',
  'certification work': 'Certification Work',
  'custom compliance': 'Custom Compliance',
  'manual audit': 'Manual Audit'
};

function parsePrice(priceStr: string): number {
  const cleanStr = priceStr.replace(/,/g, '');
  const matches = cleanStr.match(/\d+/g);
  if (matches && matches.length >= 2) {
    const min = parseFloat(matches[0]);
    const max = parseFloat(matches[1]);
    return (min + max) / 2;
  } else if (matches && matches.length === 1) {
    return parseFloat(matches[0]);
  }
  return 1500; // default if not found
}

interface ParsedService {
  dbName: string;
  rawPrice: string;
  computedPrice: number;
  description: string;
  sopSteps: { title: string; description: string }[];
}

async function main() {
  console.log('Starting seed...');

  // 0. Cleanup existing data to avoid constraint/duplicate key violations
  console.log('Cleaning up existing database records...');
  await prisma.counter.deleteMany({});
  await prisma.todoItem.deleteMany({});
  await prisma.documentMovement.deleteMany({});
  await prisma.passwordVault.deleteMany({});
  await prisma.licenseRegister.deleteMany({});
  await prisma.dSCRegister.deleteMany({});
  await prisma.sLA.deleteMany({});
  await prisma.clientRateCard.deleteMany({});
  await prisma.clientRating.deleteMany({});
  await prisma.taskFeedback.deleteMany({});
  await prisma.subtask.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.billingEntity.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.leave.deleteMany({});
  await prisma.reimbursement.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.clientProfile.deleteMany({});
  await prisma.clientGroup.deleteMany({});
  await prisma.serviceSOP.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.sOPChecklist.deleteMany({});
  await prisma.taskTemplate.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Database cleaned.');

  // 1. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@prabandh.in' },
    update: {},
    create: {
      email: 'admin@prabandh.in',
      passwordHash,
      name: 'Admin Partner',
      role: 'ADMIN',
    },
  });

  const senior = await prisma.user.upsert({
    where: { email: 'senior@prabandh.in' },
    update: {},
    create: {
      email: 'senior@prabandh.in',
      passwordHash,
      name: 'Senior Accountant',
      role: 'SENIOR_STAFF',
    },
  });

  const junior = await prisma.user.upsert({
    where: { email: 'junior@prabandh.in' },
    update: {},
    create: {
      email: 'junior@prabandh.in',
      passwordHash,
      name: 'Junior Clerk',
      role: 'JUNIOR_STAFF',
    },
  });

  const billing = await prisma.user.upsert({
    where: { email: 'billing@prabandh.in' },
    update: {},
    create: {
      email: 'billing@prabandh.in',
      passwordHash,
      name: 'Billing Executive',
      role: 'BILLING',
    },
  });

  console.log('Users created.');

  // 2. Create Services
  const gstServices = [
    { name: 'GSTR-1 (Monthly)', category: 'GST', frequency: 'MONTHLY', isLocked: true },
    { name: 'GSTR-1 (Quarterly - QRMP)', category: 'GST', frequency: 'QUARTERLY', isLocked: true },
    { name: 'GSTR-3B (Monthly)', category: 'GST', frequency: 'MONTHLY', isLocked: true },
    { name: 'GSTR-3B (QRMP - North India)', category: 'GST', frequency: 'QUARTERLY' },
    { name: 'GSTR-3B (QRMP - South India)', category: 'GST', frequency: 'QUARTERLY' },
    { name: 'GSTR-4 (Composition Dealers)', category: 'GST', frequency: 'ANNUAL' },
    { name: 'GSTR-5 (Non-resident taxable)', category: 'GST', frequency: 'MONTHLY' },
    { name: 'GSTR-5A (OIDAR)', category: 'GST', frequency: 'MONTHLY', isLocked: true },
    { name: 'GSTR-7 (TDS Return)', category: 'GST', frequency: 'MONTHLY', isLocked: true },
    { name: 'GSTR-9 (Annual Return)', category: 'GST', frequency: 'ANNUAL' },
    { name: 'GSTR-9C (Reconciliation)', category: 'GST', frequency: 'ANNUAL' },
    { name: 'GSTR-10 (Final Return)', category: 'GST', frequency: 'ONE_TIME' },
    { name: 'GSTR-11 (Inward Supplies for UIN)', category: 'GST', frequency: 'MONTHLY' },
    { name: 'CMP-08 (Composition Dealers)', category: 'GST', frequency: 'QUARTERLY' },
  ];

  const mcaServices = [
    { name: 'AOC-4 (Annual Filing)', category: 'MCA', frequency: 'ANNUAL' },
    { name: 'MGT-7 (Annual Return)', category: 'MCA', frequency: 'ANNUAL' },
    { name: 'DIR-3 KYC', category: 'MCA', frequency: 'ANNUAL' },
    { name: 'ADT-1 (Auditor Appointment)', category: 'MCA', frequency: 'ONE_TIME' },
    { name: 'INC-20A (Commencement of Business)', category: 'MCA', frequency: 'ONE_TIME' },
    { name: 'INC-22 (Registered Office)', category: 'MCA', frequency: 'ONE_TIME' },
    { name: 'PAS-3 (Allotment of Shares)', category: 'MCA', frequency: 'ONE_TIME' },
    { name: 'SH-7 (Change in Share Capital)', category: 'MCA', frequency: 'ONE_TIME' },
  ];

  const tdsServices = [
    { name: '24Q (Salary TDS Return)', category: 'TDS/TCS', frequency: 'QUARTERLY', isLocked: true },
    { name: '26Q (Non-Salary TDS)', category: 'TDS/TCS', frequency: 'QUARTERLY', isLocked: true },
    { name: '27Q (TDS on Foreign Payments)', category: 'TDS/TCS', frequency: 'QUARTERLY' },
    { name: '27EQ (TCS Return)', category: 'TDS/TCS', frequency: 'QUARTERLY' },
    { name: '26QB (TDS on Property)', category: 'TDS/TCS', frequency: 'ONE_TIME' },
    { name: '26QC (TDS on Rent)', category: 'TDS/TCS', frequency: 'ONE_TIME' },
  ];

  const itServices = [
    { name: 'ITR-1 (Individual Salary)', category: 'Income Tax', frequency: 'ANNUAL', isLocked: true },
    { name: 'ITR-2 (Capital Gains)', category: 'Income Tax', frequency: 'ANNUAL', isLocked: true },
    { name: 'ITR-3 (Business Income)', category: 'Income Tax', frequency: 'ANNUAL', isLocked: true },
    { name: 'ITR-4 (Presumptive Income)', category: 'Income Tax', frequency: 'ANNUAL', isLocked: true },
    { name: 'ITR-5 (Partnership)', category: 'Income Tax', frequency: 'ANNUAL', isLocked: true },
    { name: 'ITR-6 (Company Return)', category: 'Income Tax', frequency: 'ANNUAL', isLocked: true },
    { name: 'ITR-7 (Trust/NGO)', category: 'Income Tax', frequency: 'ANNUAL', isLocked: true },
    { name: 'Amendment of PAN', category: 'Income Tax', frequency: 'ONE_TIME' },
    { name: 'Form 15CA/15CB', category: 'Income Tax', frequency: 'ONE_TIME' },
    { name: 'Advance Tax Challan', category: 'Income Tax', frequency: 'QUARTERLY' },
  ];

  const ptServices = [
    { name: 'Professional Tax Return', category: 'Professional Tax', frequency: 'ANNUAL' },
    { name: 'PT Registration', category: 'Professional Tax', frequency: 'ONE_TIME' },
    { name: 'PT Enrollment Certificate', category: 'Professional Tax', frequency: 'ONE_TIME' },
  ];

  const pfServices = [
    { name: 'PF Return Filing', category: 'PF', frequency: 'MONTHLY' },
    { name: 'PF Registration', category: 'PF', frequency: 'ONE_TIME' },
    { name: 'PF Compliance', category: 'PF', frequency: 'MONTHLY' },
    { name: 'PF Transfer', category: 'PF', frequency: 'ONE_TIME' },
    { name: 'PF Withdrawal', category: 'PF', frequency: 'ONE_TIME' },
  ];

  const esiServices = [
    { name: 'ESI Return', category: 'ESI', frequency: 'MONTHLY' },
    { name: 'ESI Registration', category: 'ESI', frequency: 'ONE_TIME' },
    { name: 'ESI Compliance', category: 'ESI', frequency: 'MONTHLY' },
  ];

  const atServices = [
    { name: 'Advance Tax Payment', category: 'Advance Tax', frequency: 'QUARTERLY' },
    { name: 'Advance Tax Calculation', category: 'Advance Tax', frequency: 'QUARTERLY' },
    { name: 'Advance Tax Challan', category: 'Advance Tax', frequency: 'QUARTERLY' }, // Duplicate but keeping for completeness if needed
  ];

  const manualServices = [
    { name: 'Custom Compliance', category: 'Manual', frequency: 'ONE_TIME' },
    { name: 'Manual Audit', category: 'Manual', frequency: 'ONE_TIME' },
    { name: 'Advisory Services', category: 'Manual', frequency: 'ONE_TIME' },
    { name: 'Certification Work', category: 'Manual', frequency: 'ONE_TIME' },
  ];

  const allServices = [
    ...gstServices,
    ...mcaServices,
    ...tdsServices,
    ...itServices,
    ...ptServices,
    ...pfServices,
    ...esiServices,
    ...atServices,
    ...manualServices,
  ];

  // Parse services from the extracted text document if available
  const parsedList: ParsedService[] = [];
  const txtPath = path.join(__dirname, '../Services/extracted_services.txt');
  if (fs.existsSync(txtPath)) {
    console.log('Parsing extracted services document to load rich metadata (fees, descriptions, and SOP checklists)...');
    const content = fs.readFileSync(txtPath, 'utf8');
    const lines = content.split('\n');

    let currentService: ParsedService | null = null;
    let inSOP = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx].trim();
      if (!line) continue;

      const lowerLine = line.toLowerCase();
      let matchedKey: string | null = null;
      const cleanLowerLine = lowerLine.replace(/^[0-9\.\-\u2705\u274c\u2b50\u26a1\u23f3\ud83d\udcbb\ud83d\udcb8\ud83d\udcca\ud83d\udcde\ud83d\udce9\ud83d\udcc5\ud83d\udce5\ud83d\udce6\ud83d\udcc1\ud83d\udc64\ud83d\udc65\ud83d\udcac\ud83d\udd0d\u2702\ufe0f\ud83c\udf92\ud83c\udfe2\ud83d\udcb0\ud83d\udee0\ufe0f\ud83d\udcb5\u2709\ufe0f]+\s*/g, '').trim();

      for (const key of Object.keys(nameMapping)) {
        if (cleanLowerLine === key || lowerLine === key) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey) {
        if (currentService) {
          parsedList.push(currentService);
        }
        const dbName = nameMapping[matchedKey];
        currentService = {
          dbName,
          rawPrice: '',
          computedPrice: 1500,
          description: '',
          sopSteps: []
        };
        inSOP = false;
        continue;
      }

      if (!currentService) continue;

      if (line.includes('Average Market Price:') || line.includes('Avg Market Price')) {
        currentService.rawPrice = line;
        currentService.computedPrice = parsePrice(line);
        continue;
      }

      if (/^[₹\d\s,\-]+$/.test(line.replace(/–/g, '-')) && !currentService.rawPrice) {
        currentService.rawPrice = line;
        currentService.computedPrice = parsePrice(line);
        continue;
      }

      if (line.startsWith('Client-Facing Description:') || line.startsWith('Description:')) {
        let descText = line.substring(line.indexOf(':') + 1).trim();
        if (descText.startsWith('>')) {
          descText = descText.substring(1).trim();
        }
        currentService.description = descText;

        let lookAheadIdx = idx + 1;
        while (lookAheadIdx < lines.length) {
          const nextLine = lines[lookAheadIdx].trim();
          if (
            nextLine.startsWith('SOP Checklist:') ||
            nextLine.startsWith('Step-by-Step SOP Checklist') ||
            nextLine.startsWith('Deliverables:') ||
            Object.keys(nameMapping).some(key => nextLine.toLowerCase().replace(/^[0-9\.\-\s]+/, '') === key)
          ) {
            break;
          }
          if (nextLine) {
            currentService.description += '\n' + nextLine;
          }
          lookAheadIdx++;
          idx = lookAheadIdx - 1;
        }
        continue;
      }

      if (line.startsWith('Deliverables:')) {
        if (currentService.description) {
          currentService.description += '\n' + line;
        } else {
          currentService.description = line;
        }
        continue;
      }

      if (line.startsWith('SOP Checklist:') || line.startsWith('Step-by-Step SOP Checklist')) {
        inSOP = true;
        continue;
      }

      const isNumberedStep = /^\d+\.\s*(.*)/.test(line);
      if (isNumberedStep) {
        inSOP = true;
      }

      if (inSOP) {
        const matchNumbered = line.match(/^(\d+)\.\s*(.*)/);
        if (matchNumbered) {
          const stepNum = matchNumbered[1];
          const stepBody = matchNumbered[2].trim();
          currentService.sopSteps.push({
            title: `Step ${stepNum}`,
            description: stepBody
          });
        } else if (line.includes(':')) {
          const colonIdx = line.indexOf(':');
          const stepTitle = line.substring(0, colonIdx).trim();
          const stepDesc = line.substring(colonIdx + 1).trim();
          currentService.sopSteps.push({
            title: stepTitle,
            description: stepDesc
          });
        } else {
          const stepNum = currentService.sopSteps.length + 1;
          currentService.sopSteps.push({
            title: `Step ${stepNum}`,
            description: line
          });
        }
      }
    }

    if (currentService) {
      parsedList.push(currentService);
    }
    console.log(`Successfully parsed ${parsedList.length} services from document.`);
  } else {
    console.warn(`Warning: Extracted services file not found at ${txtPath}. Using default mock values.`);
  }

  // Create services and populate parsed details (fee, description, SOP steps)
  const createdServices = [];
  let updatedCount = 0;
  for (const svc of allServices) {
    const parsed = parsedList.find(p => p.dbName === svc.name);

    const created = await prisma.service.create({
      data: {
        name: svc.name,
        category: svc.category,
        frequency: svc.frequency,
        isLocked: (svc as any).isLocked || false,
        professionalFee: parsed ? parsed.computedPrice : 1500,
        description: parsed ? parsed.description : '',
        hasSOP: parsed ? parsed.sopSteps.length > 0 : false,
      },
    });
    createdServices.push(created);

    if (parsed) {
      updatedCount++;
      if (parsed.sopSteps.length > 0) {
        await prisma.serviceSOP.createMany({
          data: parsed.sopSteps.map((step, orderIdx) => ({
            serviceId: created.id,
            title: step.title,
            description: step.description,
            orderIndex: orderIdx + 1,
          })),
        });
      }
    }
  }

  console.log(`Created ${createdServices.length} services (Rich details populated for ${updatedCount} services).`);

  // 4. Create 1 sample ClientGroup
  const premiumGroup = await prisma.clientGroup.create({
    data: {
      name: 'Premium Clients',
      description: 'Top tier clients requiring priority service',
    },
  });

  // 3. Create 5 sample clients
  const clientData = [
    { companyName: 'Reliance Industries', businessEntity: 'Public Limited', clientCode: 'PLC00001', contactName: 'Mukesh A', contactEmail: 'mukesh@ril.com', mobile: '9876543210' },
    { companyName: 'Tata Consultancy Services', businessEntity: 'Public Limited', clientCode: 'PLC00002', contactName: 'N Chandra', contactEmail: 'chandra@tcs.com', mobile: '9876543211' },
    { companyName: 'Infosys Pvt Ltd', businessEntity: 'Private Limited', clientCode: 'PVT00001', contactName: 'Salil Parekh', contactEmail: 'salil@infosys.com', mobile: '9876543212' },
    { companyName: 'Wipro Pvt Ltd', businessEntity: 'Private Limited', clientCode: 'PVT00002', contactName: 'Thierry Delaporte', contactEmail: 'thierry@wipro.com', mobile: '9876543213' },
    { companyName: 'ABC Associates', businessEntity: 'Partnership', clientCode: 'PAR00001', contactName: 'John Doe', contactEmail: 'john@abc.com', mobile: '9876543214' },
  ];

  const clients = [];
  for (const c of clientData) {
    // Create dummy user for client first
    const clientUser = await prisma.user.create({
      data: {
        email: c.contactEmail || `client_${c.clientCode}@example.com`,
        passwordHash,
        name: c.contactName,
        role: 'CLIENT',
      }
    });

    const clientProfile = await prisma.clientProfile.create({
      data: {
        userId: clientUser.id,
        companyName: c.companyName,
        businessEntity: c.businessEntity,
        clientCode: c.clientCode,
        contactName: c.contactName,
        contactEmail: c.contactEmail,
        mobile: c.mobile,
        groupId: c.clientCode.startsWith('PLC') ? premiumGroup.id : null,
        auditorId: senior.id,
        labels: 'VIP,Tech',
      }
    });
    clients.push(clientProfile);
  }

  console.log(`Created ${clients.length} clients.`);


  // 5. Create sample tasks (SOP Steps instantiated as first-class Tasks!)
  const taskStatuses = ['PENDING', 'IN_PROGRESS', 'SENT_FOR_REVIEW', 'REQUEST_CHANGES', 'COMPLETED', 'OVERDUE', 'CANCELLED'];
  const taskPriorities = ['LOW', 'MEDIUM', 'HIGH'];

  let taskNumber = 850;
  for (let i = 0; i < 28; i++) {
    const client = clients[i % clients.length];
    const service = createdServices[i % createdServices.length];
    const assignee = i % 2 === 0 ? junior.id : senior.id;
    const reviewer = i % 3 === 0 ? senior.id : admin.id;
    const status = taskStatuses[i % taskStatuses.length];

    try {
      const parsed = parsedList.find(p => p.dbName === service.name);

      if (parsed && parsed.sopSteps.length > 0) {
        // Create a separate Task for each SOP step of this service
        for (let stepIdx = 0; stepIdx < parsed.sopSteps.length; stepIdx++) {
          const step = parsed.sopSteps[stepIdx];

          // Determine realistic individual step statuses based on the overall service task status
          let stepStatus = 'PENDING';
          if (status === 'COMPLETED') {
            stepStatus = 'COMPLETED';
          } else if (status === 'CANCELLED') {
            stepStatus = 'CANCELLED';
          } else if (status === 'PENDING') {
            stepStatus = 'PENDING';
          } else if (status === 'IN_PROGRESS') {
            if (stepIdx === 0) stepStatus = 'COMPLETED';
            else if (stepIdx === 1) stepStatus = 'IN_PROGRESS';
            else stepStatus = 'PENDING';
          } else if (status === 'SENT_FOR_REVIEW') {
            if (stepIdx < parsed.sopSteps.length - 1) stepStatus = 'COMPLETED';
            else stepStatus = 'SENT_FOR_REVIEW';
          } else if (status === 'REQUEST_CHANGES') {
            if (stepIdx < parsed.sopSteps.length - 1) stepStatus = 'COMPLETED';
            else stepStatus = 'REQUEST_CHANGES';
          } else if (status === 'OVERDUE') {
            if (stepIdx === 0) stepStatus = 'COMPLETED';
            else if (stepIdx === 1) stepStatus = 'OVERDUE';
            else stepStatus = 'PENDING';
          }

          await prisma.task.create({
            data: {
              taskNumber: taskNumber++,
              title: `${step.title}: ${step.description ? (step.description.length > 50 ? step.description.substring(0, 50) + '...' : step.description) : 'Perform Service Action'} - ${service.name} (${client.companyName})`,
              description: step.description || `Step ${stepIdx + 1} of ${service.name} filing.`,
              status: stepStatus,
              priority: taskPriorities[i % 3],
              dueDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000) + (stepIdx * 2 * 24 * 60 * 60 * 1000)), // staggered dummy dates
              assignedToId: assignee,
              createdById: admin.id,
              clientId: client.id,
              serviceId: service.id,
              category: service.category,
              reviewerId: reviewer,
            }
          });
        }
      } else {
        // Fallback if service has no SOP steps: create a single monolithic task
        await prisma.task.create({
          data: {
            taskNumber: taskNumber++,
            title: `File ${service.name} for ${client.companyName}`,
            description: `Please file the ${service.name} before the due date.`,
            status: status,
            priority: taskPriorities[i % 3],
            dueDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)),
            assignedToId: assignee,
            createdById: admin.id,
            clientId: client.id,
            serviceId: service.id,
            category: service.category,
            reviewerId: reviewer,
          }
        });
      }
    } catch (err: any) {
      console.error(`FAILED AT TASK INDEX i = ${i}`);
      console.error(`- Client: ${client.companyName} (ID: ${client.id})`);
      console.error(`- Service: ${service?.name} (ID: ${service?.id}, Category: ${service?.category})`);
      console.error(`- Assignee ID: ${assignee}`);
      console.error(`- Reviewer ID: ${reviewer}`);
      console.error(`- Creator ID: ${admin.id}`);
      throw err;
    }
  }

  console.log(`Created tasks.`);

  // 6. Create 3 sample leads
  await prisma.lead.create({
    data: {
      leadNumber: 101,
      businessName: 'Startup Inc',
      businessEntity: 'Private Limited',
      contactName: 'Alice Smith',
      contactEmail: 'alice@startup.com',
      source: 'Website',
      stage: 'NEW',
      dealValue: 50000,
      assignedToId: junior.id,
    }
  });

  await prisma.lead.create({
    data: {
      leadNumber: 102,
      businessName: 'Global Corp',
      businessEntity: 'Public Limited',
      contactName: 'Bob Jones',
      contactEmail: 'bob@global.com',
      source: 'Referral',
      stage: 'CONVERTED',
      dealValue: 150000,
      assignedToId: senior.id,
      convertedToClientId: clients[0].id,
    }
  });

  await prisma.lead.create({
    data: {
      leadNumber: 103,
      businessName: 'Local Shop',
      businessEntity: 'Proprietorship',
      contactName: 'Charlie Brown',
      contactEmail: 'charlie@local.com',
      source: 'Walk-in',
      stage: 'LOST',
      dealValue: 10000,
      assignedToId: junior.id,
    }
  });

  console.log(`Created leads.`);

  // 7. Initialise Counter records idempotently
  const counters = [
    { id: 'task', value: 874 },
    { id: 'client_PLC', value: 2 },
    { id: 'client_PVT', value: 2 },
    { id: 'client_PAR', value: 0 },
  ];
  for (const ctr of counters) {
    await prisma.counter.upsert({
      where: { id: ctr.id },
      update: { value: ctr.value },
      create: { id: ctr.id, value: ctr.value },
    });
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
