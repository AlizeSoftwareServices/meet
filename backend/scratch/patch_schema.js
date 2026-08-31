const fs = require('fs');
const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf8');

// 1. Update User model relation
content = content.replace(
  '  availability  Availability?',
  '  availabilities Availability[]'
);

// 2. Update EventType model to include availabilityId
content = content.replace(
  '  customQuestions  CustomQuestion[]\n  createdAt        DateTime  @default(now())',
  '  customQuestions  CustomQuestion[]\n  availabilityId   String?   @db.ObjectId\n  availability     Availability? @relation(fields: [availabilityId], references: [id], onDelete: SetNull)\n  createdAt        DateTime  @default(now())'
);

// 3. Update Availability model
const newAvailability = `model Availability {
  id        String                 @id @default(auto()) @map("_id") @db.ObjectId
  userId    String                 @db.ObjectId
  user      User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String                 @default("Working Hours")
  isDefault Boolean                @default(false)
  timezone  String                 @default("UTC")
  slots     AvailabilitySlot[]
  overrides AvailabilityOverride[]
  eventTypes EventType[]
}`;

content = content.replace(
  /model Availability \{[\s\S]*?\n\}/,
  newAvailability
);

fs.writeFileSync(file, content);
console.log('Schema updated successfully');
