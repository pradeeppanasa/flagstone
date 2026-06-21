export const environment = {
  production: false,
  lyzrApiKey: 'sk-default-KshvKfZv5VreGXMjOe8DQvFJfsosuOcR',
  lyzrBaseUrl: 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/',
  userId: 'pradeep.p@panasatech.com',
  agents: {
    manager:    '6a1dc89af6b085eee307e2f9',
    monitor:    '6a1874f7da56d8978dfe6d0b',
    onboarding: '6a1b4098f7a1eb202d6463d1',
    regulatory: '6a1c822167d6ab6e880b8db2',
    contracts:  '6a1c863f80c734da121493ca',
    fx:         '6a1db8f2e1bb0f24d59a05bc',
    settlement:       '6a1dc26d894f3fe88bd90740',
    schemeCompliance: '6a2244e338260b371a447edc',
    kybOrchestrator: '6a3184a8a3872d61f99b317e',  // main orchestrator — routes + risk + decision
    kybKyc:          '6a317e3da3872d61f99b3111',  // doc quality check + extraction + identity
    kybAmlMedia:     '6a31840e76d31ee6da83a533',  // AML adverse media search
    kybPepSanctions: '6a3183723f1c07ea232e7bbd',  // PEP & sanctions screening
    kybDocQuality:   '6a36c18d90c82e993d39b68a'   // document quality + readability check
  }
};