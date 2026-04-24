import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
console.log("Prisma Client initialized successfully!");
p.$disconnect();
