import { UnconfiguredMicrosoft365 } from './microsoft365';

describe('UnconfiguredMicrosoft365', () => {
  it('does not report a live connection when credentials are absent', () => {
    const port = new UnconfiguredMicrosoft365({
      tenantId: '',
      clientId: '',
      clientSecret: '',
      mailbox: '',
    });
    expect(port.status()).toEqual({
      status: 'disconnected',
      externally_validated: false,
      reason: 'missing_credentials',
    });
    expect(port.listWebjurMessagesFixture().mode).toBe('fixture');
  });

  it('still refuses to claim validation when credentials are filled in', () => {
    const port = new UnconfiguredMicrosoft365({
      tenantId: 'tenant',
      clientId: 'client',
      clientSecret: 'secret',
      mailbox: 'publicacoes@example.test',
    });
    expect(port.status().status).toBe('disconnected');
    expect(port.status().externally_validated).toBe(false);
    expect(port.status().reason).toBe('credentials_present_but_not_validated');
  });
});
