import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  const createdServices = [];
  for (const svc of allServices) {
    const created = await prisma.service.create({
      data: {
        name: svc.name,
        category: svc.category,
        frequency: svc.frequency,
        isLocked: (svc as any).isLocked || false,
        professionalFee: 1500, // sample fee
      },
    });
    createdServices.push(created);
  }

  console.log(`Created ${createdServices.length} services.`);

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


  // 5. Create 25+ sample tasks
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
      await prisma.task.create({
        data: {
          taskNumber: taskNumber++,
          title: `File ${service.name} for ${client.companyName}`,
          description: `Please file the ${service.name} before the due date.`,
          status: status,
          priority: taskPriorities[i % 3],
          dueDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)), // dummy dates
          assignedToId: assignee,
          createdById: admin.id,
          clientId: client.id,
          serviceId: service.id,
          category: service.category,
          reviewerId: reviewer,
        }
      });
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
