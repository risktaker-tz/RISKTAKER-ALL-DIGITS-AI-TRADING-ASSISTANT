import { db } from "@/lib/db";
import { getSmsProvider } from "@/lib/sms/providers";

type RelayInput = {
  chatId: string;
  senderId: string;
  recipientId: string;
  body: string;
};

export async function relayOfflineMessage(input: RelayInput) {
  const [sender, recipient] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: input.senderId } }),
    db.user.findUniqueOrThrow({ where: { id: input.recipientId } })
  ]);

  if (!sender.offlineSmsOptIn || !recipient.offlineSmsOptIn) {
    throw new Error("Offline SMS fallback is not enabled");
  }

  const provider = getSmsProvider();
  return provider.sendMaskedMessage({
    maskedThreadId: input.chatId,
    fromAlias: sender.username,
    toPhoneNumberHash: recipient.phoneNumberHash,
    body: input.body
  });
}
