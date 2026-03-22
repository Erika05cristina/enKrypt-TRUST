import { describe, expect, it } from 'vitest';
import { scanVerifiedSolidity } from './solidityStaticScan.js';

const EVIL_SNIPPET = `
contract EvilVault {
    mapping(address => uint256) public balances;
    address public owner;
    function retirar() external {
        uint256 monto = balances[msg.sender];
        (bool enviado, ) = msg.sender.call{value: monto}("");
        balances[msg.sender] = 0;
    }
    function cambiarOwner(address nuevo) external {
        require(tx.origin == owner, "No autorizado");
        owner = nuevo;
    }
}
`;

const SAFE_SNIPPET = `
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract SeguroVault is ReentrancyGuard {
    mapping(address => uint256) private balances;
    function retirar(uint256 monto) external nonReentrant {
        require(balances[msg.sender] >= monto, "Saldo insuficiente");
        balances[msg.sender] -= monto;
        (bool enviado, ) = msg.sender.call{value: monto}("");
        require(enviado, "Fallo");
    }
}
`;

describe('scanVerifiedSolidity', () => {
  it('EvilVault-like: tx.origin + unguarded call{value}', () => {
    const r = scanVerifiedSolidity(EVIL_SNIPPET);
    expect(r.flags).toContain('SOLIDITY_TX_ORIGIN_RISK');
    expect(r.flags).toContain('SOLIDITY_UNGUARDED_ETH_CALL');
    expect(r.flags).not.toContain('SOLIDITY_REENTRANCY_MITIGATION');
    expect(r.paidRiskDelta).toBeGreaterThan(0);
    expect(r.reputationDelta).toBeLessThan(0);
  });

  it('SeguroVault-like: OZ + nonReentrant, no tx.origin', () => {
    const r = scanVerifiedSolidity(SAFE_SNIPPET);
    expect(r.flags).toContain('SOLIDITY_REENTRANCY_MITIGATION');
    expect(r.flags).toContain('SOLIDITY_OPENZEPPELIN_SECURITY');
    expect(r.flags).not.toContain('SOLIDITY_TX_ORIGIN_RISK');
    expect(r.flags).not.toContain('SOLIDITY_UNGUARDED_ETH_CALL');
    expect(r.paidRiskDelta).toBeLessThan(0);
    expect(r.reputationDelta).toBeGreaterThan(0);
  });

  it('empty patterns => no flags', () => {
    const r = scanVerifiedSolidity('pragma solidity ^0.8.0;\ncontract X {}');
    expect(r.flags).toEqual([]);
  });
});
