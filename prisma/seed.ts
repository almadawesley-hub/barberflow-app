import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("barberflow123", 10);

  const company = await prisma.company.create({
    data: {
      name: "Barbearia Reis & Filhos",
      document: "00.000.000/0001-00",
      users: {
        create: [
          { name: "Marcelo Reis", email: "admin@barberflow.com", passwordHash, role: "ADMIN" },
          { name: "Ana Paula", email: "ana@barberflow.com", passwordHash, role: "RECEPTIONIST" },
          { name: "João", email: "joao@barberflow.com", passwordHash, role: "BARBER", commissionPercent: 40, colorHex: "#C79A54" },
          { name: "Pedro", email: "pedro@barberflow.com", passwordHash, role: "BARBER", commissionPercent: 40, colorHex: "#6E7E58" },
        ],
      },
      services: {
        create: [
          { name: "Corte", price: 40, durationMinutes: 45 },
          { name: "Barba", price: 30, durationMinutes: 30 },
          { name: "Corte + Barba", price: 65, durationMinutes: 70 },
        ],
      },
      products: {
        create: [
          { name: "Pomada Modeladora", sku: "POM-001", costPrice: 12, price: 35, stock: 18, minStock: 5 },
          { name: "Óleo para Barba", sku: "OLB-002", costPrice: 9, price: 29, stock: 3, minStock: 5 },
        ],
      },
      loyaltyConfig: {
        create: { pointsPerReal: 1, threshold: 500, rewardLabel: "Corte grátis" },
      },
    },
  });

  console.log(`Empresa criada: ${company.name} (${company.id})`);
  console.log("Login: admin@barberflow.com / barberflow123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
