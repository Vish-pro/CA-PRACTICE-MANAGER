// Non-destructive HR + Doc Inbox backfill.
// Backfills employee master fields on existing users, creates recruitment
// candidates, sample timesheets, leaves and inbox documents. Safe to re-run.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const DEPTS = {
  AUDIT: 'Audit & Assurance',
  TAX: 'Tax & Legal Advisory',
  CONSULTING: 'Consulting / Advisory',
  FINANCIAL: 'Financial Advisory / Deals',
};

function employmentTypeFor(jobTitle, role) {
  const t = (jobTitle || '').toLowerCase();
  if (t.includes('partner')) return 'Partner';
  if (t.includes('director')) return 'Partner';
  if (t.includes('manager')) return 'Manager';
  if (role === 'SENIOR_STAFF') return 'Qualified CA';
  return 'Paid Assistant';
}

async function main() {
  console.log('— HR backfill starting —');

  // 1. Backfill employee fields on existing staff users
  const staff = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SENIOR_STAFF', 'JUNIOR_STAFF'] } },
    orderBy: { createdAt: 'asc' },
  });

  const counters = { PAR: 0, MGR: 0, EMP: 0, ART: 0 };
  // reserve codes already assigned
  for (const u of staff) {
    if (u.employeeCode) {
      const m = u.employeeCode.match(/^(PAR|MGR|EMP)(\d+)$/);
      if (m) counters[m[1]] = Math.max(counters[m[1]], parseInt(m[2], 10));
      const a = u.employeeCode.match(/^ART\d{4}-(\d+)$/);
      if (a) counters.ART = Math.max(counters.ART, parseInt(a[1], 10));
    }
  }

  const partners = [];
  const managers = [];
  const juniors = [];
  for (const u of staff) {
    const type = u.employmentType || employmentTypeFor(u.jobTitle, u.role);
    if (type === 'Partner') partners.push(u);
    else if (type === 'Manager') managers.push(u);
    else juniors.push(u);
  }

  const codeFor = (type) => {
    if (type === 'Partner') return `PAR${String(++counters.PAR).padStart(3, '0')}`;
    if (type === 'Manager') return `MGR${String(++counters.MGR).padStart(3, '0')}`;
    return `EMP${String(++counters.EMP).padStart(3, '0')}`;
  };

  // department -> HOD partner name (first partner in that department)
  const hodByDept = {};
  for (const p of partners) {
    if (p.department && !hodByDept[p.department]) hodByDept[p.department] = p;
  }
  const fallbackHod = partners[0];

  let updated = 0;
  for (const u of staff) {
    if (u.employeeCode) continue; // already backfilled
    const type = employmentTypeFor(u.jobTitle, u.role);
    const hod = hodByDept[u.department] || fallbackHod;
    let reportsTo = null;
    if (type === 'Manager') {
      reportsTo = hod && hod.id !== u.id ? hod : null;
    } else if (type !== 'Partner') {
      const mgr = managers.find((m) => m.department === u.department) || managers[0];
      reportsTo = mgr && mgr.id !== u.id ? mgr : null;
    }
    // stagger joining dates deterministically
    const doj = new Date(2020, 0, 15);
    doj.setMonth(doj.getMonth() + (updated % 60));

    await prisma.user.update({
      where: { id: u.id },
      data: {
        employeeCode: codeFor(type),
        employmentType: type,
        dateOfJoining: u.dateOfJoining || doj,
        reportingToId: u.reportingToId || (reportsTo ? reportsTo.id : null),
        hodPartner: u.hodPartner || (type === 'Partner' ? 'Self' : hod?.name || null),
        totalLeavesAllowed: type === 'Article Assistant' ? 24 : 30,
        isActive: true,
      },
    });
    updated++;
  }
  console.log(`Backfilled employee fields on ${updated} users`);

  // 2. Article assistants (create if none exist)
  const articleCount = await prisma.user.count({ where: { employmentType: 'Article Assistant' } });
  if (articleCount === 0) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const gstManager = managers.find((m) => m.department === DEPTS.TAX) || managers[0];
    const hod = hodByDept[DEPTS.TAX] || fallbackHod;
    const articles = [
      { name: 'Kunal Sen', email: 'kunal.sen@prabandh.in', icai: 'ICAI/ART/109823', doj: new Date('2025-05-26') },
      { name: 'Meera Nair', email: 'meera.nair@prabandh.in', icai: 'ICAI/ART/110294', doj: new Date('2025-08-10') },
      { name: 'Aniket Joshi', email: 'aniket.joshi@prabandh.in', icai: 'ICAI/ART/111093', doj: new Date('2025-10-15') },
    ];
    for (const a of articles) {
      counters.ART++;
      await prisma.user.upsert({
        where: { email: a.email },
        update: {},
        create: {
          email: a.email,
          name: a.name,
          passwordHash,
          role: 'JUNIOR_STAFF',
          jobTitle: 'Article Assistant',
          department: DEPTS.TAX,
          employeeCode: `ART2025-${String(counters.ART).padStart(2, '0')}`,
          employmentType: 'Article Assistant',
          dateOfJoining: a.doj,
          reportingToId: gstManager?.id || null,
          hodPartner: hod?.name || null,
          icaiRegNo: a.icai,
          totalLeavesAllowed: 24,
          isActive: true,
        },
      });
    }
    console.log('Created 3 article assistants');
  }

  // 3. Recruitment candidates
  const candCount = await prisma.candidate.count();
  if (candCount === 0) {
    await prisma.candidate.createMany({
      data: [
        { name: 'Rahul Sharma', email: 'rahul.sharma@outlook.com', phone: '+91 98765 43210', position: 'Paid Assistant', department: DEPTS.TAX, stage: 'Applied', notes: 'Strong grip on corporate returns filing.', appliedDate: new Date('2026-05-10') },
        { name: 'Priya Patel', email: 'priya.patel@gmail.com', phone: '+91 98123 45678', position: 'Article Assistant', department: DEPTS.TAX, stage: 'Interviewing', notes: 'Cleared both groups of IPCC in first attempt.', appliedDate: new Date('2026-05-15') },
        { name: 'Amit Mehta', email: 'amit.mehta@yahoo.com', phone: '+91 98761 23456', position: 'Qualified CA', department: DEPTS.AUDIT, stage: 'Offer', notes: '3 years post-qualification experience in Big 4.', appliedDate: new Date('2026-05-02') },
        { name: 'Sneha Reddy', email: 'sneha.reddy@gmail.com', phone: '+91 98654 32109', position: 'Article Assistant', department: DEPTS.CONSULTING, stage: 'Onboarding', notes: 'Highly enthusiastic, waiting for articleship registration.', appliedDate: new Date('2026-05-05') },
      ],
    });
    console.log('Created 4 recruitment candidates');
  }

  // 4. Sample leaves (only if none pending)
  const articles = await prisma.user.findMany({ where: { employmentType: 'Article Assistant' } });
  const pendingLeaves = await prisma.leave.count({ where: { status: 'PENDING' } });
  if (pendingLeaves === 0 && articles.length > 0) {
    await prisma.leave.create({
      data: {
        userId: articles[0].id,
        startDate: new Date('2026-06-18'),
        endDate: new Date('2026-06-20'),
        reason: 'Severe viral fever, doctor advised bed rest',
        type: 'SICK',
        status: 'PENDING',
      },
    });
    if (articles[1]) {
      await prisma.leave.create({
        data: {
          userId: articles[1].id,
          startDate: new Date('2026-07-05'),
          endDate: new Date('2026-07-07'),
          reason: "Attending elder brother's wedding in Kerala",
          type: 'CASUAL',
          status: 'APPROVED',
        },
      });
    }
    console.log('Created sample leave requests');
  }

  // 5. Sample timesheets
  const tsCount = await prisma.timesheetEntry.count();
  if (tsCount === 0 && articles.length > 0) {
    const clients = await prisma.clientProfile.findMany({ take: 2 });
    await prisma.timesheetEntry.createMany({
      data: [
        {
          userId: articles[0].id,
          taskTitle: 'GST Return Filing',
          clientName: clients[0]?.companyName || 'Acme Corp',
          hours: 2.5,
          description: 'Prepared and verified summary reports for May GST filings.',
          status: 'PENDING',
          isManual: false,
        },
        ...(articles[1]
          ? [{
              userId: articles[1].id,
              taskTitle: 'ITR Auditing',
              clientName: clients[1]?.companyName || 'TechFlow Inc',
              hours: 3.2,
              description: 'Conducted preliminary balance sheet audit checklist matching.',
              status: 'APPROVED',
              isManual: false,
            }]
          : []),
      ],
    });
    console.log('Created sample timesheet entries');
  }

  // 6. Sample inbox documents with real placeholder files
  const docCount = await prisma.document.count();
  if (docCount === 0) {
    const clients = await prisma.clientProfile.findMany({ take: 3 });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (clients.length > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
      fs.mkdirSync(uploadDir, { recursive: true });
      const samples = [
        { fileName: 'PAN_Card_Copy.pdf', category: 'PAN Card', direction: 'INWARD', status: 'PENDING_REVIEW', notes: 'Original PAN copy received by courier' },
        { fileName: 'Bank_Statement_Q4.pdf', category: 'Bank Statement', direction: 'INWARD', status: 'REVIEWED', notes: 'Q4 statement for ITR working' },
        { fileName: 'Signed_Form_AOC4.pdf', category: 'Signed Form', direction: 'OUTWARD', status: 'RETURNED', notes: 'Signed AOC-4 dispatched back to client' },
      ];
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const client = clients[i % clients.length];
        const stored = `${Date.now()}-${s.fileName}`;
        fs.writeFileSync(path.join(uploadDir, stored), `Placeholder for ${s.fileName} (${client.companyName})`);
        await prisma.document.create({
          data: {
            clientId: client.id,
            fileName: s.fileName,
            fileUrl: `/uploads/documents/${stored}`,
            fileType: 'application/pdf',
            fileSize: 2048,
            direction: s.direction,
            status: s.status,
            category: s.category,
            notes: s.notes,
            uploadedById: admin?.id || null,
          },
        });
      }
      console.log('Created 3 sample inbox documents');
    }
  }

  console.log('— HR backfill complete —');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
