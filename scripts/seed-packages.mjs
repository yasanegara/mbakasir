import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const packages = [
  {
    name: "Tes Pasar",
    price: 100000,
    tokenAmount: 5,
    description: "Entry barrier tinggi (Decoy)",
    isActive: true
  },
  {
    name: "Entry Level",
    price: 200000,
    tokenAmount: 20,
    description: "Paket nanggung (Decoy)",
    isActive: true
  },
  {
    name: "Hemat",
    price: 500000,
    tokenAmount: 80,
    description: "Pintu masuk agen serius",
    isActive: true
  },
  {
    name: "Standar",
    price: 750000,
    tokenAmount: 125,
    description: "Sangat Disarankan (Best Value)",
    isActive: true
  },
  {
    name: "Sultan",
    price: 1500000,
    tokenAmount: 275,
    description: "Paket penguasa wilayah",
    isActive: true
  }
];

async function main() {
  console.log("Menghapus paket lama (opsional)...");
  await prisma.agentPackage.deleteMany();

  console.log("Menyuntikkan paket-paket baru yang ditentukan pengguna...");
  
  for (const pkg of packages) {
    await prisma.agentPackage.create({
      data: pkg
    });
    console.log(`✅ Paket '${pkg.name}' berhasil dibuat!`);
  }

  console.log("Semua paket sukses disuntikkan ke Database!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
