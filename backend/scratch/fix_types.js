const fs = require('fs');
const file = 'src/bookings/bookings.service.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const occurrences = [];',
  'const occurrences: { startTime: Date; endTime: Date; occurrenceNumber: number; }[] = [];'
);

content = content.replace(
  'const successfulOccurrences = [];',
  'const successfulOccurrences: any[] = [];'
);

content = content.replace(
  'const skippedOccurrences = [];',
  'const skippedOccurrences: any[] = [];'
);

content = content.replace(
  'const integrationResults = [];',
  'const integrationResults: { bookingId: string; success: boolean; }[] = [];'
);

content = content.replace(
  'let seriesId = undefined;',
  'let seriesId: string | undefined = undefined;'
);

fs.writeFileSync(file, content);
console.log('Fixed types in bookings.service.ts');
