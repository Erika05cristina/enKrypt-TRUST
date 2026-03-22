import { afterEach, describe, expect, it } from 'vitest';
import { buildAgentRegistrationDocument, getErc8004AgentRef } from './erc8004.js';

const FujiIdentity = '0x8004A818BFB912233c491871b3d84c89A494BD9e';

describe('erc8004 config', () => {
  afterEach(() => {
    delete process.env.TRUST_ERC8004_IDENTITY_REGISTRY;
    delete process.env.TRUST_ERC8004_AGENT_ID;
    delete process.env.TRUST_ERC8004_CHAIN_ID;
    delete process.env.TRUST_ERC8004_REPUTATION_REGISTRY;
  });

  it('getErc8004AgentRef returns undefined without agent id', () => {
    process.env.TRUST_ERC8004_IDENTITY_REGISTRY = FujiIdentity;
    expect(getErc8004AgentRef('http://127.0.0.1:8787')).toBeUndefined();
  });

  it('getErc8004AgentRef builds eip155 agentRegistry', () => {
    process.env.TRUST_ERC8004_IDENTITY_REGISTRY = FujiIdentity;
    process.env.TRUST_ERC8004_AGENT_ID = '42';
    process.env.TRUST_ERC8004_CHAIN_ID = '43113';
    const r = getErc8004AgentRef('http://127.0.0.1:8787');
    expect(r).toBeDefined();
    expect(r!.agentId).toBe('42');
    expect(r!.chainId).toBe(43113);
    expect(r!.identityRegistry).toBe(FujiIdentity.toLowerCase());
    expect(r!.agentRegistry).toBe(
      `eip155:43113:${FujiIdentity.toLowerCase()}`
    );
    expect(r!.agentRegistration).toBe(
      'http://127.0.0.1:8787/agent-registration.json'
    );
  });

  it('buildAgentRegistrationDocument includes services and registrations when ref ok', () => {
    process.env.TRUST_ERC8004_IDENTITY_REGISTRY = FujiIdentity;
    process.env.TRUST_ERC8004_AGENT_ID = '1';
    const doc = buildAgentRegistrationDocument('https://api.example.com');
    expect(doc.services).toBeDefined();
    expect(Array.isArray(doc.services)).toBe(true);
    expect(doc.registrations).toEqual([
      {
        agentRegistry: `eip155:43113:${FujiIdentity.toLowerCase()}`,
        agentId: '1',
      },
    ]);
    expect(doc.payment).toMatchObject({ protocol: 'x402', chainId: 43113 });
  });
});
