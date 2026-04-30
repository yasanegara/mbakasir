"use server";

import { getAgentTokenPurchaseRequestDelegate, prisma } from "@/lib/prisma";
import {
  AgentTokenPurchaseRequestStatus,
  TokenLedgerType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function mintTokensAction(agentId: string, amount: number) {
  if (!amount || amount <= 0) {
    return { success: false, error: "Jumlah token harus lebih dari 0" };
  }

  try {
    // Jalankan dalam transaction agar atomic
    await prisma.$transaction(async (tx) => {
      // 1. Ambil agen saat ini untuk mendapat balance terakhir
      const agent = await tx.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        throw new Error("Agen tidak ditemukan");
      }

      const balanceBefore = agent.tokenBalance;
      const balanceAfter = balanceBefore + amount;

      // 2. Buat record ledger
      await tx.tokenLedger.create({
        data: {
          agentId: agent.id,
          type: TokenLedgerType.MINT,
          amount: amount,
          balanceBefore: balanceBefore,
          balanceAfter: balanceAfter,
          description: `Minting ${amount} Token by SuperAdmin`
        }
      });

      // 3. Update saldo agen dan total minted
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          tokenBalance: {
            increment: amount
          },
          totalMinted: {
            increment: amount
          }
        }
      });

      const agentTokenRequestDelegate = getAgentTokenPurchaseRequestDelegate(tx);

      if (agentTokenRequestDelegate) {
        const matchingPendingRequest = await agentTokenRequestDelegate.findFirst({
          where: {
            agentId: agent.id,
            status: AgentTokenPurchaseRequestStatus.PENDING,
            tokenAmount: amount,
          },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        if (matchingPendingRequest) {
          await agentTokenRequestDelegate.update({
            where: { id: matchingPendingRequest.id },
            data: { status: AgentTokenPurchaseRequestStatus.COMPLETED },
          });
        }
      }
    });

    // Revalidate halaman untuk merefresh data
    revalidatePath("/admin/tokens");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (error: any) {
    console.error("Minting Error:", error);
    return { success: false, error: error.message || "Gagal melakukan minting token" };
  }
}

export async function deductTokensAction(agentId: string, amount: number) {
  if (!amount || amount <= 0) {
    return { success: false, error: "Jumlah token harus lebih dari 0" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        throw new Error("Agen tidak ditemukan");
      }

      if (agent.tokenBalance < amount) {
        throw new Error(`Saldo tidak mencukupi. Saldo saat ini: ${agent.tokenBalance}`);
      }

      const balanceBefore = agent.tokenBalance;
      const balanceAfter = balanceBefore - amount;

      // Buat record ledger
      await tx.tokenLedger.create({
        data: {
          agentId: agent.id,
          type: TokenLedgerType.ADJUST, // Menggunakan ADJUST untuk pengurangan manual
          amount: -amount,
          balanceBefore: balanceBefore,
          balanceAfter: balanceAfter,
          description: `Manual deduction of ${amount} Token by SuperAdmin`
        }
      });

      // Update saldo agen
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          tokenBalance: {
            decrement: amount
          },
          // Kita juga kurangi totalMinted agar total agregat tetap sinkron
          totalMinted: {
            decrement: amount
          }
        }
      });
    });

    revalidatePath("/admin/tokens");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (error: any) {
    console.error("Deduction Error:", error);
    return { success: false, error: error.message || "Gagal melakukan pengurangan token" };
  }
}

