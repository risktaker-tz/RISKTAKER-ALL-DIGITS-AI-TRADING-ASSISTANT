export type SmsProviderInput = {
  maskedThreadId: string;
  fromAlias: string;
  toPhoneNumberHash: string;
  body: string;
};

export type SmsProviderResult = {
  provider: string;
  reference: string;
};

export interface SmsProvider {
  sendMaskedMessage(input: SmsProviderInput): Promise<SmsProviderResult>;
}

class MockSmsProvider implements SmsProvider {
  async sendMaskedMessage(input: SmsProviderInput) {
    return {
      provider: "mock",
      reference: `mock-${input.maskedThreadId}-${Date.now()}`
    };
  }
}

export function getSmsProvider(): SmsProvider {
  return new MockSmsProvider();
}
