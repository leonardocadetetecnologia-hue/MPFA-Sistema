export interface Microsoft365Status {
  status: 'disconnected';
  externally_validated: false;
  reason: 'missing_credentials' | 'credentials_present_but_not_validated';
}

export interface Microsoft365Port {
  status(): Microsoft365Status;
  /** Controlled responses only. This method never talks to Microsoft Graph. */
  listWebjurMessagesFixture(): { mode: 'fixture'; externally_validated: false; messages: [] };
}

export class UnconfiguredMicrosoft365 implements Microsoft365Port {
  constructor(
    private readonly credentials: {
      tenantId: string;
      clientId: string;
      clientSecret: string;
      mailbox: string;
    },
  ) {}

  status(): Microsoft365Status {
    const present = Object.values(this.credentials).every((value) => value.trim().length > 0);
    return {
      status: 'disconnected',
      externally_validated: false,
      reason: present ? 'credentials_present_but_not_validated' : 'missing_credentials',
    };
  }

  listWebjurMessagesFixture(): { mode: 'fixture'; externally_validated: false; messages: [] } {
    return { mode: 'fixture', externally_validated: false, messages: [] };
  }
}
