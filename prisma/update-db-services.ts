import { PrismaClient } from '@prisma/client';
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

async function main() {
  console.log('Starting services database sync from extracted text...');
  const txtPath = path.join(__dirname, '../Services/extracted_services.txt');
  if (!fs.existsSync(txtPath)) {
    console.error('Extracted services file not found at:', txtPath);
    return;
  }

  const content = fs.readFileSync(txtPath, 'utf8');
  const lines = content.split('\n');

  // Load existing services from database to verify and match
  const dbServices = await prisma.service.findMany();
  console.log(`Loaded ${dbServices.length} services from DB.`);

  interface ParsedService {
    dbName: string;
    rawPrice: string;
    computedPrice: number;
    description: string;
    sopSteps: { title: string; description: string }[];
  }

  const parsedList: ParsedService[] = [];
  let currentService: ParsedService | null = null;
  let inSOP = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line) continue;

    // Detect if this line starts a new service matching our mapping keys
    const lowerLine = line.toLowerCase();
    
    // Check if line matches any mapping key exactly or after stripping numbers/extra formatting
    let matchedKey: string | null = null;
    const cleanLowerLine = lowerLine.replace(/^[0-9\.\-\u2705\u274c\u2b50\u26a1\u23f3\ud83d\udcbb\ud83d\udcb8\ud83d\udcca\ud83d\udcde\ud83d\udce9\ud83d\udcc5\ud83d\udce5\ud83d\udce6\ud83d\udcc1\ud83d\udc64\ud83d\udc65\ud83d\udcac\ud83d\udd0d\u2702\ufe0f\ud83c\udf92\ud83c\udfe2\ud83d\udcb0\ud83d\udee0\ufe0f\ud83d\udcb5\u2709\ufe0f]+\s*/g, '').trim();
    
    for (const key of Object.keys(nameMapping)) {
      if (cleanLowerLine === key || lowerLine === key) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      // Save prior service
      if (currentService) {
        parsedList.push(currentService);
      }
      
      const dbName = nameMapping[matchedKey];
      console.log(`Detected service: "${line}" -> matched DB name: "${dbName}"`);
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

    // Parse details of currently matched service
    if (line.includes('Average Market Price:') || line.includes('Avg Market Price')) {
      currentService.rawPrice = line;
      currentService.computedPrice = parsePrice(line);
      continue;
    }

    // Direct price range lines like "₹1,000 - ₹2,500" or similar
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
      
      // Look ahead to capture multiline descriptions
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

    // Auto-detect numbered steps like "1. Step Description" even if inSOP is not yet set (common in GST/TDS tables)
    const isNumberedStep = /^\d+\.\s*(.*)/.test(line);
    if (isNumberedStep) {
      inSOP = true;
    }

    if (inSOP) {
      // Parse SOP steps
      // Match "1. Step Description" or "Step Title: Step Description"
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
        // Fallback for plain text steps
        const stepNum = currentService.sopSteps.length + 1;
        currentService.sopSteps.push({
          title: `Step ${stepNum}`,
          description: line
        });
      }
    }
  }

  // Push final service
  if (currentService) {
    parsedList.push(currentService);
  }

  console.log(`\nSuccessfully parsed ${parsedList.length} services from document.`);

  // Perform updates in database
  let successCount = 0;
  for (const parsed of parsedList) {
    // Find matching service in DB
    const dbSvc = dbServices.find(s => s.name === parsed.dbName);
    if (!dbSvc) {
      console.warn(`Warning: Could not find database service matching name: "${parsed.dbName}"`);
      continue;
    }

    console.log(`Updating "${dbSvc.name}": Price: ₹${parsed.computedPrice} (from "${parsed.rawPrice || 'N/A'}"), Description lines: ${parsed.description.split('\n').length}, SOP steps: ${parsed.sopSteps.length}`);

    // Clean up existing SOP checklist items for this service first
    await prisma.serviceSOP.deleteMany({
      where: { serviceId: dbSvc.id }
    });

    // Update service fee and description
    await prisma.service.update({
      where: { id: dbSvc.id },
      data: {
        professionalFee: parsed.computedPrice,
        description: parsed.description || dbSvc.description,
        hasSOP: parsed.sopSteps.length > 0
      }
    });

    // Insert new SOP steps with proper order indexes
    if (parsed.sopSteps.length > 0) {
      await prisma.serviceSOP.createMany({
        data: parsed.sopSteps.map((step, orderIdx) => ({
          serviceId: dbSvc.id,
          title: step.title,
          description: step.description,
          orderIndex: orderIdx + 1
        }))
      });
    }

    successCount++;
  }

  console.log(`\nDatabase Sync Complete! Successfully updated ${successCount} out of ${dbServices.length} services.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
