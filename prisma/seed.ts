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
    create: { email: 'admin@prabandh.in', passwordHash, name: 'Admin Partner', role: 'ADMIN' },
  });

  const DEPTS = {
    AUDIT: 'Audit & Assurance',
    TAX: 'Tax & Legal Advisory',
    CONSULTING: 'Consulting / Advisory',
    FINANCIAL: 'Financial Advisory / Deals',
  };

  const staffData = [
    // Partners (2)
    { name: 'Rajesh Kumar Sharma',      email: 'rajesh.sharma@prabandh.in',      role: 'ADMIN',        jobTitle: 'Partner',              department: DEPTS.AUDIT },
    { name: 'Priya Venkataraman',        email: 'priya.venkataraman@prabandh.in', role: 'ADMIN',        jobTitle: 'Partner',              department: DEPTS.TAX },
    // Directors (3)
    { name: 'Amit Narayan Verma',        email: 'amit.verma@prabandh.in',         role: 'SENIOR_STAFF', jobTitle: 'Director',             department: DEPTS.CONSULTING },
    { name: 'Sunita Krishnamurthy',      email: 'sunita.krishnamurthy@prabandh.in',role: 'SENIOR_STAFF',jobTitle: 'Director',             department: DEPTS.FINANCIAL },
    { name: 'Karthik Subramanian',       email: 'karthik.subramanian@prabandh.in',role: 'SENIOR_STAFF', jobTitle: 'Director',             department: DEPTS.AUDIT },
    // Executive Directors (4)
    { name: 'Rohit Anand Gupta',         email: 'rohit.gupta@prabandh.in',        role: 'SENIOR_STAFF', jobTitle: 'Executive Director',   department: DEPTS.TAX },
    { name: 'Ananya Balakrishnan',       email: 'ananya.balakrishnan@prabandh.in',role: 'SENIOR_STAFF', jobTitle: 'Executive Director',   department: DEPTS.AUDIT },
    { name: 'Vikram Pratap Singh',       email: 'vikram.singh@prabandh.in',       role: 'SENIOR_STAFF', jobTitle: 'Executive Director',   department: DEPTS.CONSULTING },
    { name: 'Deepa Pillai',             email: 'deepa.pillai@prabandh.in',        role: 'SENIOR_STAFF', jobTitle: 'Executive Director',   department: DEPTS.FINANCIAL },
    // Senior Managers (5)
    { name: 'Suresh Chandrasekaran',     email: 'suresh.chandrasekaran@prabandh.in',role:'SENIOR_STAFF',jobTitle: 'Senior Manager',       department: DEPTS.AUDIT },
    { name: 'Pooja Ramesh Mehta',        email: 'pooja.mehta@prabandh.in',        role: 'SENIOR_STAFF', jobTitle: 'Senior Manager',       department: DEPTS.TAX },
    { name: 'Nikhil Dinesh Joshi',       email: 'nikhil.joshi@prabandh.in',       role: 'SENIOR_STAFF', jobTitle: 'Senior Manager',       department: DEPTS.CONSULTING },
    { name: 'Swati Agarwal',             email: 'swati.agarwal@prabandh.in',      role: 'SENIOR_STAFF', jobTitle: 'Senior Manager',       department: DEPTS.FINANCIAL },
    { name: 'Prasad Venkatrao',          email: 'prasad.venkatrao@prabandh.in',   role: 'SENIOR_STAFF', jobTitle: 'Senior Manager',       department: DEPTS.AUDIT },
    // Assistant Managers (6)
    { name: 'Arjun Narasimha Reddy',     email: 'arjun.reddy@prabandh.in',        role: 'SENIOR_STAFF', jobTitle: 'Assistant Manager',    department: DEPTS.TAX },
    { name: 'Kavitha Menon',             email: 'kavitha.menon@prabandh.in',      role: 'SENIOR_STAFF', jobTitle: 'Assistant Manager',    department: DEPTS.CONSULTING },
    { name: 'Manish Kumar Srivastava',   email: 'manish.srivastava@prabandh.in',  role: 'SENIOR_STAFF', jobTitle: 'Assistant Manager',    department: DEPTS.FINANCIAL },
    { name: 'Divya Suresh Pillai',       email: 'divya.pillai@prabandh.in',       role: 'SENIOR_STAFF', jobTitle: 'Assistant Manager',    department: DEPTS.AUDIT },
    { name: 'Santosh Ramachandra Kumar', email: 'santosh.kumar@prabandh.in',      role: 'SENIOR_STAFF', jobTitle: 'Assistant Manager',    department: DEPTS.TAX },
    { name: 'Rekha Subramaniam Bhat',    email: 'rekha.bhat@prabandh.in',         role: 'SENIOR_STAFF', jobTitle: 'Assistant Manager',    department: DEPTS.AUDIT },
    // Managers (7)
    { name: 'Anil Dattatray Patil',      email: 'anil.patil@prabandh.in',         role: 'SENIOR_STAFF', jobTitle: 'Manager',              department: DEPTS.CONSULTING },
    { name: 'Smita Govind Desai',        email: 'smita.desai@prabandh.in',        role: 'SENIOR_STAFF', jobTitle: 'Manager',              department: DEPTS.FINANCIAL },
    { name: 'Ravi Shankar Iyengar',      email: 'ravi.iyengar@prabandh.in',       role: 'SENIOR_STAFF', jobTitle: 'Manager',              department: DEPTS.AUDIT },
    { name: 'Neeta Ramesh Kulkarni',     email: 'neeta.kulkarni@prabandh.in',     role: 'SENIOR_STAFF', jobTitle: 'Manager',              department: DEPTS.TAX },
    { name: 'Abhijit Deb Mukherjee',     email: 'abhijit.mukherjee@prabandh.in',  role: 'SENIOR_STAFF', jobTitle: 'Manager',              department: DEPTS.CONSULTING },
    { name: 'Sonal Girish Tiwari',       email: 'sonal.tiwari@prabandh.in',       role: 'SENIOR_STAFF', jobTitle: 'Manager',              department: DEPTS.FINANCIAL },
    { name: 'Harish Chand Malhotra',     email: 'harish.malhotra@prabandh.in',    role: 'SENIOR_STAFF', jobTitle: 'Manager',              department: DEPTS.AUDIT },
    // Associate Directors (8)
    { name: 'Varun Kapoor',              email: 'varun.kapoor@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Associate Director',   department: DEPTS.TAX },
    { name: 'Lavanya Subramaniam',       email: 'lavanya.subramaniam@prabandh.in',role: 'JUNIOR_STAFF', jobTitle: 'Associate Director',   department: DEPTS.CONSULTING },
    { name: 'Siddharth Banerjee',        email: 'siddharth.banerjee@prabandh.in', role: 'JUNIOR_STAFF', jobTitle: 'Associate Director',   department: DEPTS.FINANCIAL },
    { name: 'Geeta Laxmi Rao',           email: 'geeta.rao@prabandh.in',          role: 'JUNIOR_STAFF', jobTitle: 'Associate Director',   department: DEPTS.AUDIT },
    { name: 'Prakash Narayan Naidu',     email: 'prakash.naidu@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Associate Director',   department: DEPTS.TAX },
    { name: 'Anitha Krishnaswamy',       email: 'anitha.krishnaswamy@prabandh.in',role: 'JUNIOR_STAFF', jobTitle: 'Associate Director',   department: DEPTS.CONSULTING },
    { name: 'Mohit Saxena',              email: 'mohit.saxena@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Associate Director',   department: DEPTS.FINANCIAL },
    { name: 'Pallavi Madhav Deshpande',  email: 'pallavi.deshpande@prabandh.in',  role: 'JUNIOR_STAFF', jobTitle: 'Associate Director',   department: DEPTS.AUDIT },
    // Senior Associates (9)
    { name: 'Rahul Debashish Bose',      email: 'rahul.bose@prabandh.in',         role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.TAX },
    { name: 'Shruti Ramakrishna Pandey', email: 'shruti.pandey@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.CONSULTING },
    { name: 'Girish Nambiar',            email: 'girish.nambiar@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.FINANCIAL },
    { name: 'Tanvi Suresh Jain',         email: 'tanvi.jain@prabandh.in',         role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.AUDIT },
    { name: 'Aditya Shivram Thakur',     email: 'aditya.thakur@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.TAX },
    { name: 'Meera Gopalan Pillai',      email: 'meera.pillai@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.CONSULTING },
    { name: 'Sunil Prakash Dubey',       email: 'sunil.dubey@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.FINANCIAL },
    { name: 'Poornima Srinivasa Hegde',  email: 'poornima.hegde@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.AUDIT },
    { name: 'Vivek Kumar Chaudhary',     email: 'vivek.chaudhary@prabandh.in',    role: 'JUNIOR_STAFF', jobTitle: 'Senior Associate',     department: DEPTS.TAX },
    // Senior Consultants (10)
    { name: 'Deepak Prasad Mishra',      email: 'deepak.mishra@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.CONSULTING },
    { name: 'Archana Balakrishnan',      email: 'archana.balakrishnan@prabandh.in',role:'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.FINANCIAL },
    { name: 'Sameer Nawaz Khan',         email: 'sameer.khan@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.AUDIT },
    { name: 'Preethi Raghunathan',       email: 'preethi.raghunathan@prabandh.in',role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.TAX },
    { name: 'Kiran Namdev Pawar',        email: 'kiran.pawar@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.CONSULTING },
    { name: 'Nisha Venkataraman',        email: 'nisha.venkataraman@prabandh.in', role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.FINANCIAL },
    { name: 'Abhishek Rajesh Sharma',    email: 'abhishek.sharma@prabandh.in',    role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.AUDIT },
    { name: 'Leela Chandran',            email: 'leela.chandran@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.TAX },
    { name: 'Tushar Ramesh Gaikwad',     email: 'tushar.gaikwad@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.CONSULTING },
    { name: 'Sarita Prabhu Naik',        email: 'sarita.naik@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Senior Consultant',    department: DEPTS.FINANCIAL },
    // Associates (11)
    { name: 'Ajay Kumar Dwivedi',        email: 'ajay.dwivedi@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.AUDIT },
    { name: 'Bhavna Rajesh Solanki',     email: 'bhavna.solanki@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.TAX },
    { name: 'Chirag Hasmukh Shah',       email: 'chirag.shah@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.CONSULTING },
    { name: 'Dipti Ganesh Sawant',       email: 'dipti.sawant@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.FINANCIAL },
    { name: 'Eshan Ramesh Trivedi',      email: 'eshan.trivedi@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.AUDIT },
    { name: 'Falguni Dinesh Mehta',      email: 'falguni.mehta@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.TAX },
    { name: 'Gaurav Ramachandra Acharya',email: 'gaurav.acharya@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.CONSULTING },
    { name: 'Himani Rajendra Beniwal',   email: 'himani.beniwal@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.FINANCIAL },
    { name: 'Irfan Ahmed Siddiqui',      email: 'irfan.siddiqui@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.AUDIT },
    { name: 'Jayashree Srinivasan Mohan',email: 'jayashree.mohan@prabandh.in',    role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.TAX },
    { name: 'Kartik Ajit Bhosale',       email: 'kartik.bhosale@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Associate',            department: DEPTS.CONSULTING },
    // Analysts (12)
    { name: 'Lakshmi Narasimhan',        email: 'lakshmi.narasimhan@prabandh.in', role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.FINANCIAL },
    { name: 'Mayank Kumar Gupta',        email: 'mayank.gupta@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.AUDIT },
    { name: 'Neha Ramesh Chandra',       email: 'neha.chandra@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.TAX },
    { name: 'Omkar Shivaji Kulkarni',    email: 'omkar.kulkarni@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.CONSULTING },
    { name: 'Pradeep Kumar Singh',       email: 'pradeep.singh@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.FINANCIAL },
    { name: 'Hamid Raza Qureshi',        email: 'hamid.qureshi@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.AUDIT },
    { name: 'Rashmi Shantilal Verma',    email: 'rashmi.verma@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.TAX },
    { name: 'Supriya Dattatray Kadam',   email: 'supriya.kadam@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.CONSULTING },
    { name: 'Tarun Arvind Sehgal',       email: 'tarun.sehgal@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.FINANCIAL },
    { name: 'Uma Krishnamurthy Iyer',    email: 'uma.iyer@prabandh.in',           role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.AUDIT },
    { name: 'Vandana Suresh Rao',        email: 'vandana.rao@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.TAX },
    { name: 'Wasim Ahmed Sheikh',        email: 'wasim.sheikh@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Analyst',              department: DEPTS.CONSULTING },
    // Trainees (13)
    { name: 'Akash Ramesh Patel',        email: 'akash.patel@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.FINANCIAL },
    { name: 'Bhavesh Manilal Sharma',    email: 'bhavesh.sharma@prabandh.in',     role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.AUDIT },
    { name: 'Chaitanya Reddy',           email: 'chaitanya.reddy@prabandh.in',    role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.TAX },
    { name: 'Disha Ramesh Nair',         email: 'disha.nair@prabandh.in',         role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.CONSULTING },
    { name: 'Esha Sunil Malhotra',       email: 'esha.malhotra@prabandh.in',      role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.FINANCIAL },
    { name: 'Farhan Ibrahim Khan',       email: 'farhan.khan@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.AUDIT },
    { name: 'Garima Suresh Joshi',       email: 'garima.joshi@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.TAX },
    { name: 'Harsh Rajendra Singhania',  email: 'harsh.singhania@prabandh.in',    role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.CONSULTING },
    { name: 'Ishaan Ramesh Mehta',       email: 'ishaan.mehta@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.FINANCIAL },
    { name: 'Jyoti Ramachandra Prasad',  email: 'jyoti.prasad@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.AUDIT },
    { name: 'Kavya Rajesh Menon',        email: 'kavya.menon@prabandh.in',        role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.TAX },
    { name: 'Lokesh Gopala Hegde',       email: 'lokesh.hegde@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.CONSULTING },
    { name: 'Manavi Suresh Singh',       email: 'manavi.singh@prabandh.in',       role: 'JUNIOR_STAFF', jobTitle: 'Trainee',              department: DEPTS.FINANCIAL },
  ];

  const createdStaff: any[] = [];
  for (const s of staffData) {
    const u = await prisma.user.create({
      data: { email: s.email, passwordHash, name: s.name, role: s.role, jobTitle: s.jobTitle, department: s.department },
    });
    createdStaff.push(u);
  }

  // Compatibility aliases used by tasks/leads sections below
  const senior = createdStaff.find(u => u.jobTitle === 'Senior Manager' && u.department === DEPTS.AUDIT)!;
  const junior = createdStaff.find(u => u.jobTitle === 'Analyst' && u.department === DEPTS.AUDIT)!;

  console.log(`Users created: 1 admin + ${createdStaff.length} staff.`);

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

  // 4. Create Department Groups
  const auditGroup = await prisma.clientGroup.create({ data: { name: 'Audit & Assurance', description: 'Statutory audits, internal audits, and financial accounting advisory' } });
  const taxGroup = await prisma.clientGroup.create({ data: { name: 'Tax & Legal Advisory', description: 'Corporate compliance, transfer pricing, indirect tax, and M&A tax' } });
  const consultingGroup = await prisma.clientGroup.create({ data: { name: 'Consulting / Advisory', description: 'Management consulting, technology transformation, and cybersecurity' } });
  const financialGroup = await prisma.clientGroup.create({ data: { name: 'Financial Advisory / Deals', description: 'Mergers & Acquisitions, valuation services, and corporate restructuring' } });

  // Auditors per department (most senior staff in each dept)
  const auditPartner = createdStaff.find(u => u.department === DEPTS.AUDIT && u.jobTitle === 'Partner')!;
  const taxPartner   = createdStaff.find(u => u.department === DEPTS.TAX   && u.jobTitle === 'Partner')!;
  const consultDir   = createdStaff.find(u => u.department === DEPTS.CONSULTING && u.jobTitle === 'Director')!;
  const finDir       = createdStaff.find(u => u.department === DEPTS.FINANCIAL  && u.jobTitle === 'Director')!;

  interface ClientSeed {
    companyName: string; legalName?: string; businessEntity: string; clientCode: string;
    contactName: string; gstNumber?: string; panNumber?: string; address?: string;
    groupId: string; auditorId: string; labels: string; department: string;
  }

  const clientsRaw: ClientSeed[] = [
    // ── AUDIT & ASSURANCE (25) ──────────────────────────────────────────────
    { companyName:'Tata Steel Limited',               legalName:'Tata Steel Limited',                       businessEntity:'Public Limited',  clientCode:'PLC00001', contactName:'T V Narendran',         gstNumber:'19AACCT2719K1Z7', panNumber:'AACCT2719K', address:'Bombay House, 24 Homi Mody Street, Fort, Mumbai 400001, Maharashtra',                     groupId:auditGroup.id, auditorId:auditPartner.id, labels:'Large Cap,Manufacturing', department:DEPTS.AUDIT },
    { companyName:'Larsen & Toubro Limited',          legalName:'Larsen & Toubro Limited',                  businessEntity:'Public Limited',  clientCode:'PLC00002', contactName:'S N Subrahmanyan',      gstNumber:'27AAACL0490P1ZX', panNumber:'AAACL0490P', address:"L&T House, N M Marg, Ballard Estate, Mumbai 400001, Maharashtra",                          groupId:auditGroup.id, auditorId:auditPartner.id, labels:'Infrastructure,Conglomerate', department:DEPTS.AUDIT },
    { companyName:'NTPC Limited',                     legalName:'NTPC Limited',                             businessEntity:'Public Limited',  clientCode:'PLC00003', contactName:'Gurdeep Singh',         gstNumber:'07AAACN1002B1ZF', panNumber:'AAACN1002B', address:'NTPC Bhawan, SCOPE Complex, 7 Institutional Area, Lodhi Road, New Delhi 110003',        groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Power', department:DEPTS.AUDIT },
    { companyName:'Coal India Limited',               legalName:'Coal India Limited',                       businessEntity:'Public Limited',  clientCode:'PLC00004', contactName:'Pramod Agrawal',        gstNumber:'19AAACI3450G1ZU', panNumber:'AAACI3450G', address:'Coal Bhawan, Premises No. 04, MAR, Plot AF-III, Action Area-IA, Newtown, Kolkata 700156', groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Mining', department:DEPTS.AUDIT },
    { companyName:'Steel Authority of India Limited', legalName:'Steel Authority of India Limited',         businessEntity:'Public Limited',  clientCode:'PLC00005', contactName:'Amarendu Prakash',      gstNumber:'07AAAAS2834J1Z2', panNumber:'AAAAS2834J', address:'Ispat Bhawan, Lodhi Road, New Delhi 110003',                                                  groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Steel', department:DEPTS.AUDIT },
    { companyName:'Bharat Heavy Electricals Limited', legalName:'Bharat Heavy Electricals Limited',         businessEntity:'Public Limited',  clientCode:'PLC00006', contactName:'K M Unni',              gstNumber:'07AAACB0472C1ZG', panNumber:'AAACB0472C', address:'BHEL House, Siri Fort, New Delhi 110049',                                                        groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Engineering', department:DEPTS.AUDIT },
    { companyName:'GAIL (India) Limited',             legalName:'GAIL (India) Limited',                     businessEntity:'Public Limited',  clientCode:'PLC00007', contactName:'Sandeep Kumar Gupta',   gstNumber:'07AABCG2034P1Z1', panNumber:'AABCG2034P', address:'GAIL Bhawan, 16 Bhikaji Cama Place, New Delhi 110066',                                          groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Gas', department:DEPTS.AUDIT },
    { companyName:'Power Grid Corporation of India',  legalName:'Power Grid Corporation of India Limited',  businessEntity:'Public Limited',  clientCode:'PLC00008', contactName:'R K Tyagi',             gstNumber:'06AAACP1090C1ZF', panNumber:'AAACP1090C', address:'Saudamini, Plot No. 2, Sector 29, Gurugram 122001, Haryana',                                   groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Infrastructure', department:DEPTS.AUDIT },
    { companyName:'Oil India Limited',                legalName:'Oil India Limited',                        businessEntity:'Public Limited',  clientCode:'PLC00009', contactName:'Ranjit Rath',           gstNumber:'18AAACO0104J1Z3', panNumber:'AAACO0104J', address:'Duliajan, Dibrugarh District, Assam 786602',                                                     groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Oil & Gas', department:DEPTS.AUDIT },
    { companyName:'NMDC Limited',                     legalName:'NMDC Limited',                             businessEntity:'Public Limited',  clientCode:'PLC00010', contactName:'Suresh Kumar Pujari',   gstNumber:'36AABCN2002P1ZA', panNumber:'AABCN2002P', address:'Khanij Bhawan, 10-3-311/A, Castle Hills, Masab Tank, Hyderabad 500028, Telangana',            groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Mining', department:DEPTS.AUDIT },
    { companyName:'Hindustan Aeronautics Limited',    legalName:'Hindustan Aeronautics Limited',            businessEntity:'Public Limited',  clientCode:'PLC00011', contactName:'C B Ananthakrishnan',   gstNumber:'29AABCH0789C1ZG', panNumber:'AABCH0789C', address:'15/1 Cubbon Road, Bengaluru 560001, Karnataka',                                                  groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Defence', department:DEPTS.AUDIT },
    { companyName:'Bharat Electronics Limited',       legalName:'Bharat Electronics Limited',               businessEntity:'Public Limited',  clientCode:'PLC00012', contactName:'Bhanu Prakash Srivastava',gstNumber:'29AAACB0472D1ZF', panNumber:'AAACB0472D', address:'Outer Ring Road, Nagavara, Bengaluru 560045, Karnataka',                                    groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Defence Electronics', department:DEPTS.AUDIT },
    { companyName:'Container Corporation of India',   legalName:'Container Corporation of India Limited',   businessEntity:'Public Limited',  clientCode:'PLC00013', contactName:'Sanjay Swarup',         gstNumber:'07AAACC5434B1ZS', panNumber:'AAACC5434B', address:'C-3, Mathura Road, Opposite Apollo Hospital, New Delhi 110076',                                 groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Logistics', department:DEPTS.AUDIT },
    { companyName:'Mazagon Dock Shipbuilders',        legalName:'Mazagon Dock Shipbuilders Limited',        businessEntity:'Public Limited',  clientCode:'PLC00014', contactName:'Sanjeev Singhal',       gstNumber:'27AABCM5117P1ZN', panNumber:'AABCM5117P', address:'Dockyard Road, Mazagon, Mumbai 400010, Maharashtra',                                           groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Shipbuilding', department:DEPTS.AUDIT },
    { companyName:'Cochin Shipyard Limited',          legalName:'Cochin Shipyard Limited',                  businessEntity:'Public Limited',  clientCode:'PLC00015', contactName:'Madhu S Nair',          gstNumber:'32AAACC0624C1ZB', panNumber:'AAACC0624C', address:'Administrative Building, Perumanoor P O, Kochi 682015, Kerala',                               groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Shipbuilding', department:DEPTS.AUDIT },
    { companyName:'RITES Limited',                    legalName:'RITES Limited',                            businessEntity:'Public Limited',  clientCode:'PLC00016', contactName:'Rahul Mithal',          gstNumber:'06AAACR4143B1ZV', panNumber:'AAACR4143B', address:'RITES Bhawan, No. 1, Sector 29, Gurugram 122001, Haryana',                                     groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Consultancy', department:DEPTS.AUDIT },
    { companyName:'NBCC (India) Limited',             legalName:'NBCC (India) Limited',                     businessEntity:'Public Limited',  clientCode:'PLC00017', contactName:'K P Mahadevaswamy',     gstNumber:'07AAACN1702K1ZH', panNumber:'AAACN1702K', address:'NBCC Bhawan, Lodhi Road, New Delhi 110003',                                                     groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Construction', department:DEPTS.AUDIT },
    { companyName:'IRCON International Limited',      legalName:'IRCON International Limited',              businessEntity:'Public Limited',  clientCode:'PLC00018', contactName:'S K Chaudhary',         gstNumber:'07AAACI3488P1Z4', panNumber:'AAACI3488P', address:'C-4, District Centre, Saket, New Delhi 110017',                                                 groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Infrastructure', department:DEPTS.AUDIT },
    { companyName:'Hindustan Copper Limited',         legalName:'Hindustan Copper Limited',                 businessEntity:'Public Limited',  clientCode:'PLC00019', contactName:'Arun Kumar Shukla',     gstNumber:'19AAACH4174C1ZN', panNumber:'AAACH4174C', address:'Tamra Bhawan, 1 Ashutosh Chowdhury Avenue, Kolkata 700019, West Bengal',                       groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Mining', department:DEPTS.AUDIT },
    { companyName:'Rashtriya Ispat Nigam Limited',    legalName:'Rashtriya Ispat Nigam Limited',            businessEntity:'Public Limited',  clientCode:'PLC00020', contactName:'Atul Bhatt',            gstNumber:'37AAAAA0271F1ZB', panNumber:'AAAAA0271F', address:'Administrative Building, Visakhapatnam Steel Plant, Visakhapatnam 530031, Andhra Pradesh',   groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Steel', department:DEPTS.AUDIT },
    { companyName:'MIDHANI (Mishra Dhatu Nigam)',     legalName:'Mishra Dhatu Nigam Limited',               businessEntity:'Public Limited',  clientCode:'PLC00021', contactName:'Sanjay Kumar Jha',      gstNumber:'36AAACM3278G1Z2', panNumber:'AAACM3278G', address:'P O Kanchanbagh, Hyderabad 500058, Telangana',                                                  groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Defence Materials', department:DEPTS.AUDIT },
    { companyName:'HMT Limited',                      legalName:'HMT Limited',                              businessEntity:'Public Limited',  clientCode:'PLC00022', contactName:'Indra Mani Pandey',     gstNumber:'29AAACH5345D1ZN', panNumber:'AAACH5345D', address:'HMT Bhawan, 59 Bellary Road, Bengaluru 560032, Karnataka',                                     groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Manufacturing', department:DEPTS.AUDIT },
    { companyName:'Fertilizers & Chemicals Travancore',legalName:'Fertilizers and Chemicals Travancore Ltd',businessEntity:'Public Limited',  clientCode:'PLC00023', contactName:'Shyam Srinivasan',      gstNumber:'32AAACF0624C1Z3', panNumber:'AAACF0624C', address:'Eloor, Udyogamandal, Kochi 683501, Kerala',                                                     groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Chemicals', department:DEPTS.AUDIT },
    { companyName:'Bharat Petroleum Corporation',     legalName:'Bharat Petroleum Corporation Limited',     businessEntity:'Public Limited',  clientCode:'PLC00024', contactName:'Arun Kumar Singh',      gstNumber:'27AAACB5371M1ZB', panNumber:'AAACB5371M', address:'Bharat Bhavan, 4&6 Currimbhoy Road, Ballard Estate, Mumbai 400001, Maharashtra',             groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Oil & Gas', department:DEPTS.AUDIT },
    { companyName:'Indian Oil Corporation Limited',   legalName:'Indian Oil Corporation Limited',           businessEntity:'Public Limited',  clientCode:'PLC00025', contactName:'Shrikant Madhav Vaidya', gstNumber:'07AAACI3031B1ZH', panNumber:'AAACI3031B', address:'IndianOil Bhawan, G-9, Ali Yavar Jung Marg, Bandra East, Mumbai 400051, Maharashtra',    groupId:auditGroup.id, auditorId:auditPartner.id, labels:'PSU,Oil Refining', department:DEPTS.AUDIT },

    // ── TAX & LEGAL ADVISORY (25) ───────────────────────────────────────────
    { companyName:'Sun Pharmaceutical Industries',    legalName:'Sun Pharmaceutical Industries Limited',    businessEntity:'Public Limited',  clientCode:'PLC00026', contactName:'Dilip Shanghvi',        gstNumber:'27AAACS3099C1ZN', panNumber:'AAACS3099C', address:'Sun House, CTS No.201 B/1, Western Express Highway, Goregaon East, Mumbai 400063, Maharashtra', groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Pharma,Large Cap', department:DEPTS.TAX },
    { companyName:'Dr. Reddy\'s Laboratories',        legalName:"Dr. Reddy's Laboratories Limited",         businessEntity:'Public Limited',  clientCode:'PLC00027', contactName:'Erez Israeli',          gstNumber:'36AABCD9820D1ZT', panNumber:'AABCD9820D', address:'8-2-337, Road No. 3, Banjara Hills, Hyderabad 500034, Telangana',                             groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Pharma,Generics', department:DEPTS.TAX },
    { companyName:'Cipla Limited',                    legalName:'Cipla Limited',                            businessEntity:'Public Limited',  clientCode:'PLC00028', contactName:'Umang Vohra',           gstNumber:'27AAACC4245P1Z5', panNumber:'AAACC4245P', address:'Cipla House, Peninsula Business Park, Ganpatrao Kadam Marg, Lower Parel, Mumbai 400013',       groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Pharma,API', department:DEPTS.TAX },
    { companyName:'Aurobindo Pharma Limited',         legalName:'Aurobindo Pharma Limited',                 businessEntity:'Public Limited',  clientCode:'PLC00029', contactName:'N Govindarajan',        gstNumber:'36AAACA7949H1Z0', panNumber:'AAACA7949H', address:'Plot No. 2, Maitrivihar, Ameerpet, Hyderabad 500038, Telangana',                              groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Pharma,Exports', department:DEPTS.TAX },
    { companyName:'Lupin Limited',                    legalName:'Lupin Limited',                            businessEntity:'Public Limited',  clientCode:'PLC00030', contactName:'Nilesh Gupta',          gstNumber:'27AAACL3466J1ZF', panNumber:'AAACL3466J', address:'Kalpataru Inspire, 3rd Floor, Off Western Express Highway, Santacruz East, Mumbai 400055',       groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Pharma,US Markets', department:DEPTS.TAX },
    { companyName:'Torrent Pharmaceuticals Limited',  legalName:'Torrent Pharmaceuticals Limited',          businessEntity:'Public Limited',  clientCode:'PLC00031', contactName:'Sudhir Mehta',          gstNumber:'24AAACT2791P1Z3', panNumber:'AAACT2791P', address:'Torrent House, Off Ashram Road, Ahmedabad 380009, Gujarat',                                   groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Pharma,Cardiology', department:DEPTS.TAX },
    { companyName:'Glenmark Pharmaceuticals',         legalName:'Glenmark Pharmaceuticals Limited',         businessEntity:'Public Limited',  clientCode:'PLC00032', contactName:'Glenn Saldanha',        gstNumber:'27AAACG1804C1ZA', panNumber:'AAACG1804C', address:'B/2 Mahalaxmi Chambers, 22 Bhulabhai Desai Road, Mumbai 400026, Maharashtra',                 groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Pharma,Dermatology', department:DEPTS.TAX },
    { companyName:'Biocon Limited',                   legalName:'Biocon Limited',                           businessEntity:'Public Limited',  clientCode:'PLC00033', contactName:'Kiran Mazumdar-Shaw',   gstNumber:'29AAACB1367K1ZM', panNumber:'AAACB1367K', address:'20th KM Hosur Road, Hebbagodi, Electronic City P.O., Bengaluru 560100, Karnataka',          groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Biotech,Biosimilars', department:DEPTS.TAX },
    { companyName:'Abbott India Limited',             legalName:'Abbott India Limited',                     businessEntity:'Public Limited',  clientCode:'PLC00034', contactName:'Ambati Venu',           gstNumber:'27AAACA2002N1ZR', panNumber:'AAACA2002N', address:'3-4 Corporate Park, Sion Trombay Road, Chembur, Mumbai 400071, Maharashtra',                  groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Pharma', department:DEPTS.TAX },
    { companyName:'Pfizer Limited',                   legalName:'Pfizer Limited',                           businessEntity:'Public Limited',  clientCode:'PLC00035', contactName:'S Sridhar',             gstNumber:'27AAACP1090D1ZQ', panNumber:'AAACP1090D', address:'The Capital, B-Wing, Plot No. C-70, G Block, Bandra Kurla Complex, Mumbai 400051',             groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Vaccines', department:DEPTS.TAX },
    { companyName:'Siemens Limited',                  legalName:'Siemens Limited',                          businessEntity:'Public Limited',  clientCode:'PLC00036', contactName:'Sunil Mathur',          gstNumber:'27AACCS5428G1ZP', panNumber:'AACCS5428G', address:'Siemens House, 130 Pandurang Budhkar Marg, Worli, Mumbai 400018, Maharashtra',                groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Engineering', department:DEPTS.TAX },
    { companyName:'ABB India Limited',                legalName:'ABB India Limited',                        businessEntity:'Public Limited',  clientCode:'PLC00037', contactName:'Sanjeev Sharma',        gstNumber:'29AAACA5615F1ZU', panNumber:'AAACA5615F', address:'21st Floor, World Trade Center, Brigade Gateway, 26/1 Dr. Rajkumar Road, Bengaluru 560055', groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Automation', department:DEPTS.TAX },
    { companyName:'Bosch Limited',                    legalName:'Bosch Limited',                            businessEntity:'Public Limited',  clientCode:'PLC00038', contactName:'Jan Roehrl',            gstNumber:'29AABCB1294Q1ZN', panNumber:'AABCB1294Q', address:'Hosur Road, Adugodi, Bengaluru 560030, Karnataka',                                              groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Auto Components', department:DEPTS.TAX },
    { companyName:'Cummins India Limited',            legalName:'Cummins India Limited',                    businessEntity:'Public Limited',  clientCode:'PLC00039', contactName:'Ashwath Ram',           gstNumber:'27AAACC1234P1Z5', panNumber:'AAACC1234P', address:'Tower A, 1st Floor, Survey No. 21, Balewadi, Pune 411045, Maharashtra',                        groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Power Systems', department:DEPTS.TAX },
    { companyName:'Honeywell Automation India',       legalName:'Honeywell Automation India Limited',       businessEntity:'Public Limited',  clientCode:'PLC00040', contactName:'Atul Pai',              gstNumber:'27AAACH5412G1ZA', panNumber:'AAACH5412G', address:'56 & 57, Hadapsar Industrial Estate, Pune 411013, Maharashtra',                                 groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Industrial Automation', department:DEPTS.TAX },
    { companyName:'SKF India Limited',                legalName:'SKF India Limited',                        businessEntity:'Public Limited',  clientCode:'PLC00041', contactName:'Manish Bhatnagar',      gstNumber:'27AAACS5012H1ZF', panNumber:'AAACS5012H', address:'Mahatma Gandhi Road, Pune 411001, Maharashtra',                                                   groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Bearings', department:DEPTS.TAX },
    { companyName:'Schaeffler India Limited',         legalName:'Schaeffler India Limited',                 businessEntity:'Public Limited',  clientCode:'PLC00042', contactName:'Harsha Kadam',          gstNumber:'24AAACS1234K1Z3', panNumber:'AAACS1234K', address:'Nariman Bhavan, 227 Nariman Point, Vadodara 390007, Gujarat',                                   groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Auto Components', department:DEPTS.TAX },
    { companyName:'3M India Limited',                 legalName:'3M India Limited',                         businessEntity:'Public Limited',  clientCode:'PLC00043', contactName:'Ramesh Ramadurai',      gstNumber:'29AAACT2345M1Z8', panNumber:'AAACT2345M', address:'Plot No. 48, Electronics City, Hosur Road, Bengaluru 560100, Karnataka',                     groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Diversified', department:DEPTS.TAX },
    { companyName:'Novartis India Limited',           legalName:'Novartis India Limited',                   businessEntity:'Public Limited',  clientCode:'PLC00044', contactName:'Sanjay Murdeshwar',     gstNumber:'27AAACN2345H1ZL', panNumber:'AAACN2345H', address:'Sandoz House, Shivsagar Estate, Dr. Annie Besant Road, Worli, Mumbai 400018, Maharashtra',   groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Pharma', department:DEPTS.TAX },
    { companyName:'GlaxoSmithKline Pharma',           legalName:'GlaxoSmithKline Pharmaceuticals Limited',  businessEntity:'Public Limited',  clientCode:'PLC00045', contactName:'Brian Tempest',         gstNumber:'27AAACG5678P1ZX', panNumber:'AAACG5678P', address:'Dr Annie Besant Road, Worli, Mumbai 400030, Maharashtra',                                       groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Pharma', department:DEPTS.TAX },
    { companyName:'AstraZeneca Pharma India',         legalName:'AstraZeneca Pharma India Limited',         businessEntity:'Public Limited',  clientCode:'PLC00046', contactName:'Gavin Eccles',          gstNumber:'29AAACA6789Z1ZM', panNumber:'AAACA6789Z', address:'Block N1, 12th Floor, Manyata Embassy Business Park, Rachenahalli, Bengaluru 560045, Karnataka', groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Oncology', department:DEPTS.TAX },
    { companyName:'Timken India Limited',             legalName:'Timken India Limited',                     businessEntity:'Public Limited',  clientCode:'PLC00047', contactName:'Vinod Kumar Mital',     gstNumber:'27AAACT3456M1Z1', panNumber:'AAACT3456M', address:'Phaltan Industrial Growth Centre, Aklaj Road, Phaltan, Satara District, Maharashtra 415523', groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Bearings', department:DEPTS.TAX },
    { companyName:'Divi\'s Laboratories Limited',     legalName:"Divi's Laboratories Limited",              businessEntity:'Public Limited',  clientCode:'PLC00048', contactName:'Kiran S Divi',          gstNumber:'36AAACD3456L1ZT', panNumber:'AAACD3456L', address:'7-1-77/E/1/303, Dharam Karan Road, Ameerpet, Hyderabad 500016, Telangana',                    groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Pharma,API', department:DEPTS.TAX },
    { companyName:'Minda Industries Limited',         legalName:'Minda Industries Limited',                 businessEntity:'Public Limited',  clientCode:'PLC00049', contactName:'Nirmal K Minda',        gstNumber:'06AAACM3456J1ZN', panNumber:'AAACM3456J', address:'B-64/1, Wazirpur Industrial Area, Delhi 110052',                                                  groupId:taxGroup.id, auditorId:taxPartner.id, labels:'Auto Ancillary,OEM', department:DEPTS.TAX },
    { companyName:'Ingersoll-Rand India Limited',     legalName:'Ingersoll-Rand (India) Limited',           businessEntity:'Public Limited',  clientCode:'PLC00050', contactName:'Anil Chahkar',          gstNumber:'24AAACI4567R1Z2', panNumber:'AAACI4567R', address:'11-A, Opp. Ramdevnagar BRTS Stop, Satellite, Ahmedabad 380015, Gujarat',                      groupId:taxGroup.id, auditorId:taxPartner.id, labels:'MNC,Compressors', department:DEPTS.TAX },

    // ── CONSULTING / ADVISORY (25) ──────────────────────────────────────────
    { companyName:'Tata Consultancy Services',        legalName:'Tata Consultancy Services Limited',        businessEntity:'Public Limited',  clientCode:'PLC00051', contactName:'K Krithivasan',         gstNumber:'27AAACR2778K1ZA', panNumber:'AAACR2778K', address:'TCS House, Raveline Street, Fort, Mumbai 400001, Maharashtra',                                groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Large Cap', department:DEPTS.CONSULTING },
    { companyName:'Infosys Limited',                  legalName:'Infosys Limited',                          businessEntity:'Public Limited',  clientCode:'PLC00052', contactName:'Salil Parekh',          gstNumber:'29AABCI5878N1Z8', panNumber:'AABCI5878N', address:'Electronics City, Hosur Road, Bengaluru 560100, Karnataka',                                    groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Large Cap', department:DEPTS.CONSULTING },
    { companyName:'Wipro Limited',                    legalName:'Wipro Limited',                            businessEntity:'Public Limited',  clientCode:'PLC00053', contactName:'Thierry Delaporte',     gstNumber:'29AAACW0028A1ZG', panNumber:'AAACW0028A', address:'Doddakannelli, Sarjapur Road, Bengaluru 560035, Karnataka',                                    groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Diversified', department:DEPTS.CONSULTING },
    { companyName:'HCL Technologies Limited',         legalName:'HCL Technologies Limited',                 businessEntity:'Public Limited',  clientCode:'PLC00054', contactName:'C Vijayakumar',         gstNumber:'09AACCH0001P1Z3', panNumber:'AACCH0001P', address:'806, Siddharth, 96 Nehru Place, New Delhi 110019',                                             groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Engineering Services', department:DEPTS.CONSULTING },
    { companyName:'Tech Mahindra Limited',            legalName:'Tech Mahindra Limited',                    businessEntity:'Public Limited',  clientCode:'PLC00055', contactName:'Mohit Joshi',           gstNumber:'27AAACT1234M1Z9', panNumber:'AAACT1234M', address:'Gateway Building, Apollo Bunder, Mumbai 400001, Maharashtra',                                   groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Telecom', department:DEPTS.CONSULTING },
    { companyName:'Mphasis Limited',                  legalName:'Mphasis Limited',                          businessEntity:'Public Limited',  clientCode:'PLC00056', contactName:'Nitin Rakesh',          gstNumber:'29AAACM3456P1Z7', panNumber:'AAACM3456P', address:'Bagmane World Technology Centre, Block 3, Marathahalli Outer Ring Road, Bengaluru 560037',   groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,BFS', department:DEPTS.CONSULTING },
    { companyName:'Persistent Systems Limited',       legalName:'Persistent Systems Limited',               businessEntity:'Public Limited',  clientCode:'PLC00057', contactName:'Sandeep Kalra',         gstNumber:'27AAACP4567S1Z5', panNumber:'AAACP4567S', address:'Bhageerath, 402 B Senapati Bapat Road, Pune 411016, Maharashtra',                              groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Product Engineering', department:DEPTS.CONSULTING },
    { companyName:'KPIT Technologies Limited',        legalName:'KPIT Technologies Limited',                businessEntity:'Public Limited',  clientCode:'PLC00058', contactName:'Kishor Patil',          gstNumber:'27AAACK4567T1ZT', panNumber:'AAACK4567T', address:'35 & 36, Rajiv Gandhi Infotech Park, Hinjawadi, Pune 411057, Maharashtra',                   groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Automotive', department:DEPTS.CONSULTING },
    { companyName:'Cyient Limited',                   legalName:'Cyient Limited',                           businessEntity:'Public Limited',  clientCode:'PLC00059', contactName:'Krishna Bodanapu',      gstNumber:'36AAACY4567C1Z2', panNumber:'AAACY4567C', address:'4th Floor, A Wing, 11 Software Units Layout, Infocity, Hyderabad 500081, Telangana',          groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Engineering', department:DEPTS.CONSULTING },
    { companyName:'Birlasoft Limited',                legalName:'Birlasoft Limited',                        businessEntity:'Public Limited',  clientCode:'PLC00060', contactName:'Angan Guha',            gstNumber:'09AAACB5678S1ZQ', panNumber:'AAACB5678S', address:'7th Floor, Plot No. 1, Logix Infotech Park, Sector 59, Noida 201301, Uttar Pradesh',         groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,ERP', department:DEPTS.CONSULTING },
    { companyName:'L&T Technology Services',          legalName:'L&T Technology Services Limited',          businessEntity:'Public Limited',  clientCode:'PLC00061', contactName:'Amit Chadha',           gstNumber:'27AAACL5678T1Z3', panNumber:'AAACL5678T', address:'L&T Seawoods Grand Central, 3rd Floor, Tower 3, Sector 40, Navi Mumbai 400706, Maharashtra',  groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,ER&D', department:DEPTS.CONSULTING },
    { companyName:'Tata Elxsi Limited',               legalName:'Tata Elxsi Limited',                       businessEntity:'Public Limited',  clientCode:'PLC00062', contactName:'Manoj Raghavan',        gstNumber:'29AAACT5678E1Z6', panNumber:'AAACT5678E', address:'Itpb Road, Whitefield, Bengaluru 560048, Karnataka',                                            groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Design', department:DEPTS.CONSULTING },
    { companyName:'Sasken Technologies Limited',      legalName:'Sasken Technologies Limited',              businessEntity:'Public Limited',  clientCode:'PLC00063', contactName:'Rajiv C. Mody',         gstNumber:'29AAACS5678T1ZA', panNumber:'AAACS5678T', address:'139/25, Ring Road, Domlur, Bengaluru 560071, Karnataka',                                         groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Telecom Embedded', department:DEPTS.CONSULTING },
    { companyName:'Happiest Minds Technologies',      legalName:'Happiest Minds Technologies Limited',      businessEntity:'Public Limited',  clientCode:'PLC00064', contactName:'Joseph Anantharaju',    gstNumber:'29AAACH5678M1ZN', panNumber:'AAACH5678M', address:'Block 1A, EPIP Zone, White Field, Bengaluru 560066, Karnataka',                                groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Digital', department:DEPTS.CONSULTING },
    { companyName:'Tanla Platforms Limited',          legalName:'Tanla Platforms Limited',                  businessEntity:'Public Limited',  clientCode:'PLC00065', contactName:'Uday Reddy',            gstNumber:'36AAACT6789P1Z4', panNumber:'AAACT6789P', address:'Tanla Technology Centre, Hi-Tech City, Hyderabad 500081, Telangana',                          groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,CPaaS', department:DEPTS.CONSULTING },
    { companyName:'Route Mobile Limited',             legalName:'Route Mobile Limited',                     businessEntity:'Public Limited',  clientCode:'PLC00066', contactName:'Rajdipkumar Gupta',     gstNumber:'27AAAAO6789R1ZK', panNumber:'AAAAO6789R', address:'4th Dimension, 3rd Floor, Mind Space, Malad West, Mumbai 400064, Maharashtra',               groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,CPaaS', department:DEPTS.CONSULTING },
    { companyName:'Zensar Technologies Limited',      legalName:'Zensar Technologies Limited',              businessEntity:'Public Limited',  clientCode:'PLC00067', contactName:'Ajay S. Bhutoria',      gstNumber:'27AAACZ6789T1Z7', panNumber:'AAACZ6789T', address:'Zensar Knowledge Park, Kharadi, Pune 411014, Maharashtra',                                     groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,BFS', department:DEPTS.CONSULTING },
    { companyName:'Sonata Software Limited',          legalName:'Sonata Software Limited',                  businessEntity:'Public Limited',  clientCode:'PLC00068', contactName:'Jagannathan Chakravarthi',gstNumber:'29AAACS7890S1ZP', panNumber:'AAACS7890S', address:'Doddanekundi, Mahadevapura Post, Bengaluru 560048, Karnataka',                             groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Retail', department:DEPTS.CONSULTING },
    { companyName:'Newgen Software Technologies',     legalName:'Newgen Software Technologies Limited',     businessEntity:'Public Limited',  clientCode:'PLC00069', contactName:'Diwakar Nigam',         gstNumber:'07AAACN7890S1Z1', panNumber:'AAACN7890S', address:'A-6, Satsang Vihar Marg, Qutab Institutional Area, New Delhi 110067',                        groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,BPM', department:DEPTS.CONSULTING },
    { companyName:'Intellect Design Arena Limited',   legalName:'Intellect Design Arena Limited',           businessEntity:'Public Limited',  clientCode:'PLC00070', contactName:'Arun Jain',             gstNumber:'33AAACI7890D1ZB', panNumber:'AAACI7890D', address:'IGATE Centre, Old Mahabalipuram Road, Sholinganallur, Chennai 600119, Tamil Nadu',            groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,BFSI', department:DEPTS.CONSULTING },
    { companyName:'Quick Heal Technologies Limited',  legalName:'Quick Heal Technologies Limited',          businessEntity:'Public Limited',  clientCode:'PLC00071', contactName:'Kailash Katkar',        gstNumber:'27AAACQ7890T1ZF', panNumber:'AAACQ7890T', address:'Marvel Edge, Office No. 7010, 7th Floor, Viman Nagar, Pune 411014, Maharashtra',             groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Cybersecurity', department:DEPTS.CONSULTING },
    { companyName:'Nucleus Software Exports',         legalName:'Nucleus Software Exports Limited',         businessEntity:'Public Limited',  clientCode:'PLC00072', contactName:'Vishnu R. Dusad',       gstNumber:'09AAACN8901S1Z4', panNumber:'AAACN8901S', address:'33-35, Thyagraj Nagar Market, New Delhi 110003',                                                 groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Banking Software', department:DEPTS.CONSULTING },
    { companyName:'Mastech Digital Limited',          legalName:'Mastech Digital Limited',                  businessEntity:'Public Limited',  clientCode:'PLC00073', contactName:'Sundar Kadayam',        gstNumber:'19AAACM8901D1ZM', panNumber:'AAACM8901D', address:'4B, Kohinoor City, Kirol Road, Off LBS Marg, Kurla West, Mumbai 400070, Maharashtra',        groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Staffing', department:DEPTS.CONSULTING },
    { companyName:'IndiaMART InterMESH Limited',      legalName:'IndiaMART InterMESH Limited',              businessEntity:'Public Limited',  clientCode:'PLC00074', contactName:'Dinesh Agarwal',        gstNumber:'09AAACI8901I1ZR', panNumber:'AAACI8901I', address:'Tower-1, 1st floor, Plot No. 40A, Sector-126, Noida 201301, Uttar Pradesh',                 groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,B2B Marketplace', department:DEPTS.CONSULTING },
    { companyName:'Just Dial Limited',                legalName:'Just Dial Limited',                        businessEntity:'Public Limited',  clientCode:'PLC00075', contactName:'V S S Mani',            gstNumber:'27AAACJ9012D1ZS', panNumber:'AAACJ9012D', address:'Plot No. 1, MTNL Lane, Andheri East, Mumbai 400093, Maharashtra',                               groupId:consultingGroup.id, auditorId:consultDir.id, labels:'IT,Local Search', department:DEPTS.CONSULTING },

    // ── FINANCIAL ADVISORY / DEALS (25) ────────────────────────────────────
    { companyName:'Bajaj Finserv Limited',            legalName:'Bajaj Finserv Limited',                    businessEntity:'Public Limited',  clientCode:'PLC00076', contactName:'Sanjiv Bajaj',          gstNumber:'27AAACB9012F1ZJ', panNumber:'AAACB9012F', address:'Bajaj Auto Limited Complex, Mumbai Pune Road, Akurdi, Pune 411035, Maharashtra',            groupId:financialGroup.id, auditorId:finDir.id, labels:'NBFC,Insurance', department:DEPTS.FINANCIAL },
    { companyName:'Shriram Finance Limited',          legalName:'Shriram Finance Limited',                  businessEntity:'Public Limited',  clientCode:'PLC00077', contactName:'Y S Chakravarti',       gstNumber:'33AAACS9012F1ZE', panNumber:'AAACS9012F', address:'Wockhardt Towers, East Wing, Level 3, C-2, G-Block, Bandra Kurla Complex, Mumbai 400051',   groupId:financialGroup.id, auditorId:finDir.id, labels:'NBFC,Vehicle Finance', department:DEPTS.FINANCIAL },
    { companyName:'Muthoot Finance Limited',          legalName:'Muthoot Finance Limited',                  businessEntity:'Public Limited',  clientCode:'PLC00078', contactName:'George Alexander Muthoot',gstNumber:'32AAACM9012F1ZP', panNumber:'AAACM9012F', address:'Muthoot Chambers, Opposite Saritha Theatre, Banerji Road, Ernakulam, Kochi 682018, Kerala',groupId:financialGroup.id, auditorId:finDir.id, labels:'NBFC,Gold Loans', department:DEPTS.FINANCIAL },
    { companyName:'IIFL Finance Limited',             legalName:'IIFL Finance Limited',                     businessEntity:'Public Limited',  clientCode:'PLC00079', contactName:'Nirmal Jain',           gstNumber:'27AAACI9012F1ZT', panNumber:'AAACI9012F', address:'IIFL House, Sun Infotech Park, Road No. 16V, Plot No. B-23, MIDC Thane Industrial Area, Wagle Estate, Thane 400604', groupId:financialGroup.id, auditorId:finDir.id, labels:'NBFC,Diversified Finance', department:DEPTS.FINANCIAL },
    { companyName:'Cholamandalam Inv & Finance',      legalName:'Cholamandalam Investment and Finance Company Limited',businessEntity:'Public Limited',clientCode:'PLC00080',contactName:'Vellayan Subbiah', gstNumber:'33AAACC9012I1ZQ', panNumber:'AAACC9012I', address:'Dare House, 2 NSC Bose Road, Parrys, Chennai 600001, Tamil Nadu',                           groupId:financialGroup.id, auditorId:finDir.id, labels:'NBFC,Vehicle Finance', department:DEPTS.FINANCIAL },
    { companyName:'Manappuram Finance Limited',       legalName:'Manappuram Finance Limited',               businessEntity:'Public Limited',  clientCode:'PLC00081', contactName:'V.P. Nandakumar',       gstNumber:'32AAACM0123F1ZL', panNumber:'AAACM0123F', address:'Manappuram House, Valapad, Thrissur 680567, Kerala',                                          groupId:financialGroup.id, auditorId:finDir.id, labels:'NBFC,Gold Loans', department:DEPTS.FINANCIAL },
    { companyName:'M&M Financial Services',           legalName:'Mahindra and Mahindra Financial Services Limited',businessEntity:'Public Limited',clientCode:'PLC00082',contactName:'Raul Rebello',      gstNumber:'27AAACM0123M1ZS', panNumber:'AAACM0123M', address:'Gateway Building, Apollo Bunder, Mumbai 400001, Maharashtra',                                 groupId:financialGroup.id, auditorId:finDir.id, labels:'NBFC,Rural Finance', department:DEPTS.FINANCIAL },
    { companyName:'PNB Housing Finance Limited',      legalName:'PNB Housing Finance Limited',              businessEntity:'Public Limited',  clientCode:'PLC00083', contactName:'Girish Kousgi',         gstNumber:'07AAACP0123P1ZW', panNumber:'AAACP0123P', address:'9th Floor, Antriksh Bhawan, 22 Kasturba Gandhi Marg, New Delhi 110001',                       groupId:financialGroup.id, auditorId:finDir.id, labels:'HFC,Home Loans', department:DEPTS.FINANCIAL },
    { companyName:'LIC Housing Finance Limited',      legalName:'LIC Housing Finance Limited',              businessEntity:'Public Limited',  clientCode:'PLC00084', contactName:'Y. Viswanatha Gowd',    gstNumber:'27AAACL0123H1ZV', panNumber:'AAACL0123H', address:'India Bulls Finance Centre, Tower 3, 5th-7th Floor, Elphinstone Road, Mumbai 400013',        groupId:financialGroup.id, auditorId:finDir.id, labels:'HFC,Home Loans', department:DEPTS.FINANCIAL },
    { companyName:'Can Fin Homes Limited',            legalName:'Can Fin Homes Limited',                    businessEntity:'Public Limited',  clientCode:'PLC00085', contactName:'Suresh Iyer',           gstNumber:'29AAACC0123H1ZM', panNumber:'AAACC0123H', address:'Registered Office, 29/1, Sir M N Krishna Rao Road, Basavanagudi, Bengaluru 560004, Karnataka', groupId:financialGroup.id, auditorId:finDir.id, labels:'HFC,Affordable Housing', department:DEPTS.FINANCIAL },
    { companyName:'IRB Infrastructure Developers',   legalName:'IRB Infrastructure Developers Limited',    businessEntity:'Public Limited',  clientCode:'PLC00086', contactName:'Virendra D Mhaiskar',   gstNumber:'27AAACI0123I1ZL', panNumber:'AAACI0123I', address:'IRB Complex, Chandivali Farm Road, Chandivali, Andheri East, Mumbai 400072, Maharashtra',     groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Toll Roads', department:DEPTS.FINANCIAL },
    { companyName:'KNR Constructions Limited',        legalName:'KNR Constructions Limited',                businessEntity:'Public Limited',  clientCode:'PLC00087', contactName:'K. Narasimha Reddy',    gstNumber:'36AAACK1234K1ZB', panNumber:'AAACK1234K', address:'Plot No. 92, Road No 10, Jubilee Hills, Hyderabad 500033, Telangana',                         groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,EPC', department:DEPTS.FINANCIAL },
    { companyName:'NCC Limited',                      legalName:'NCC Limited',                              businessEntity:'Public Limited',  clientCode:'PLC00088', contactName:'J Brij Mohan Rao',      gstNumber:'36AAACN1234C1ZQ', panNumber:'AAACN1234C', address:'NCC House, Madhapur, Hyderabad 500081, Telangana',                                              groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Construction', department:DEPTS.FINANCIAL },
    { companyName:'Dilip Buildcon Limited',           legalName:'Dilip Buildcon Limited',                   businessEntity:'Public Limited',  clientCode:'PLC00089', contactName:'Devendra Jain',         gstNumber:'23AAACD1234D1Z5', panNumber:'AAACD1234D', address:'The Offices of DBL, 4th Floor, JMD Megapolis, Sohna Road, Gurugram 122001, Haryana',          groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Roads', department:DEPTS.FINANCIAL },
    { companyName:'PNC Infratech Limited',            legalName:'PNC Infratech Limited',                    businessEntity:'Public Limited',  clientCode:'PLC00090', contactName:'Pradeep Kumar Jain',    gstNumber:'09AAACP1234I1ZN', panNumber:'AAACP1234I', address:'NBCC Plaza, Tower-II, 4th Floor, Pushp Vihar, Sector 5, New Delhi 110017',                   groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Highways', department:DEPTS.FINANCIAL },
    { companyName:'G R Infraprojects Limited',        legalName:'G R Infraprojects Limited',                businessEntity:'Public Limited',  clientCode:'PLC00091', contactName:'Vinod Kumar Agarwal',   gstNumber:'08AAACG2345I1ZR', panNumber:'AAACG2345I', address:'9-B, Madhyam Marg, Mansarovar, Jaipur 302020, Rajasthan',                                       groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Roads', department:DEPTS.FINANCIAL },
    { companyName:'H.G. Infra Engineering Limited',  legalName:'H.G. Infra Engineering Limited',           businessEntity:'Public Limited',  clientCode:'PLC00092', contactName:'Harendra Singh',        gstNumber:'08AAACH2345I1ZA', panNumber:'AAACH2345I', address:'14, Ashoka Enclave-I, Sector-34, Faridabad 121003, Haryana',                                   groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Infra', department:DEPTS.FINANCIAL },
    { companyName:'Techno Electric & Engineering',   legalName:'Techno Electric & Engineering Company Limited',businessEntity:'Public Limited',clientCode:'PLC00093',contactName:'P P Gupta',            gstNumber:'19AAACT2345E1Z9', panNumber:'AAACT2345E', address:'Gillander House, 8 Netaji Subhas Road, Kolkata 700001, West Bengal',                           groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Power T&D', department:DEPTS.FINANCIAL },
    { companyName:'ITD Cementation India Limited',   legalName:'ITD Cementation India Limited',            businessEntity:'Public Limited',  clientCode:'PLC00094', contactName:'Prasad Patwardhan',     gstNumber:'27AAACI2345C1Z6', panNumber:'AAACI2345C', address:'7th Floor, Equinox Business Park, LBS Marg, Kurla, Mumbai 400070, Maharashtra',               groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Marine', department:DEPTS.FINANCIAL },
    { companyName:'Ahluwalia Contracts India',        legalName:'Ahluwalia Contracts (India) Limited',      businessEntity:'Public Limited',  clientCode:'PLC00095', contactName:'Vikas Ahluwalia',       gstNumber:'07AAACA2345C1ZH', panNumber:'AAACA2345C', address:'Ahluwalia House, S-249 (B) & 250, Greater Kailash Part-II, New Delhi 110048',               groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,Buildings', department:DEPTS.FINANCIAL },
    { companyName:'Ashoka Buildcon Limited',          legalName:'Ashoka Buildcon Limited',                  businessEntity:'Public Limited',  clientCode:'PLC00096', contactName:'Ashok Katariya',        gstNumber:'27AAACA3456B1ZN', panNumber:'AAACA3456B', address:'Ashoka House, Ashoka Marg, Nashik 422002, Maharashtra',                                          groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,BOT Roads', department:DEPTS.FINANCIAL },
    { companyName:'JMC Projects (India) Limited',    legalName:'JMC Projects (India) Limited',             businessEntity:'Public Limited',  clientCode:'PLC00097', contactName:'Shailendra Kumar Tripathi',gstNumber:'24AAACJ3456P1ZG', panNumber:'AAACJ3456P', address:'A-104, Shapath-4, Opp. Karnavati Club, S.G. Road, Ahmedabad 380015, Gujarat',             groupId:financialGroup.id, auditorId:finDir.id, labels:'Infrastructure,EPC', department:DEPTS.FINANCIAL },
    { companyName:'Repco Home Finance Limited',       legalName:'Repco Home Finance Limited',               businessEntity:'Public Limited',  clientCode:'PLC00098', contactName:'Y Nagabhushanam',       gstNumber:'33AAAAC3456R1Z4', panNumber:'AAAAC3456R', address:'3rd Floor, Alexander Square, New No. 34 & 35, Sardar Patel Road, Guindy, Chennai 600032',   groupId:financialGroup.id, auditorId:finDir.id, labels:'HFC,South India', department:DEPTS.FINANCIAL },
    { companyName:'GIC Housing Finance Limited',     legalName:'GIC Housing Finance Limited',              businessEntity:'Public Limited',  clientCode:'PLC00099', contactName:'Karan M Mehta',         gstNumber:'27AAACG3456H1ZX', panNumber:'AAACG3456H', address:'Universal Insurance Building, Sir P. M. Road, Fort, Mumbai 400001, Maharashtra',             groupId:financialGroup.id, auditorId:finDir.id, labels:'HFC,PSU', department:DEPTS.FINANCIAL },
    { companyName:'Indiabulls Housing Finance',      legalName:'Indiabulls Housing Finance Limited',       businessEntity:'Public Limited',  clientCode:'PLC00100', contactName:'Ajit Kumar Mittal',     gstNumber:'27AAACI3456H1Z2', panNumber:'AAACI3456H', address:'M-62 & 63, First Floor, Connaught Place, New Delhi 110001',                                   groupId:financialGroup.id, auditorId:finDir.id, labels:'HFC,Wholesale', department:DEPTS.FINANCIAL },
  ];

  const clients: any[] = [];
  let plcCounter = 0, pvtCounter = 0, parCounter = 0;

  for (const c of clientsRaw) {
    const codePrefix = c.clientCode.substring(0, 3);
    if (codePrefix === 'PLC') plcCounter++;
    else if (codePrefix === 'PVT') pvtCounter++;
    else parCounter++;

    const emailSlug = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
    const dummyEmail = `accounts@${emailSlug}.co.in`;
    const dummyMobile = `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`;

    const clientUser = await prisma.user.create({
      data: { email: dummyEmail, passwordHash, name: c.contactName, role: 'CLIENT' },
    });

    const profile = await prisma.clientProfile.create({
      data: {
        userId: clientUser.id,
        companyName: c.companyName,
        legalName: c.legalName,
        businessEntity: c.businessEntity,
        clientCode: c.clientCode,
        contactName: c.contactName,
        contactEmail: dummyEmail,
        mobile: dummyMobile,
        gstNumber: c.gstNumber,
        panNumber: c.panNumber,
        address: c.address,
        groupId: c.groupId,
        auditorId: c.auditorId,
        labels: c.labels,
        isActive: true,
      },
    });
    clients.push(profile);
  }

  console.log(`Created ${clients.length} clients across 4 department groups.`);


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
    { id: 'task', value: 900 },
    { id: 'client_PLC', value: 100 },
    { id: 'client_PVT', value: 0 },
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
