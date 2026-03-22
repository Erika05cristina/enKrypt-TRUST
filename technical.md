# TRUST — Documentación técnica (enKrypt-TRUST)

Documento de arquitectura e integración del proyecto **TRUST** (Transaction Risk & User Security Toolkit) sobre el monorepo derivado de **[Enkrypt](https://github.com/enkryptcom/enKrypt)**. Describe el diseño del **agente de evaluación de riesgo**, el **protocolo HTTP x402** para micropagos on-chain, la alineación con **[EIP-8004](https://eips.ethereum.org/EIPS/eip-8004) (Trustless Agents)**, los servicios externos que compone el backend, y los límites explícitos del alcance.

---

## 1. Visión y objetivo del sistema

TRUST añade a la wallet una capa que **evalúa el riesgo de una transacción EVM antes de firmarla**, en el entorno **Avalanche Fuji** (`chainId` **43113**). El análisis puede incluir:

- reglas locales en la extensión;
- un **API pagado** vía **x402** (USDC, liquidación on-chain mediante facilitador thirdweb);
- datos de **RPC** y **explorador**;
- **heurísticas** sobre Solidity verificado;
- **modelo de lenguaje opcional** (Ollama) en el servidor.

El diseño separa claramente: **(a)** custodia y firma del usuario en la wallet, **(b)** lógica de negocio y cobro en `trust-risk-api`, **(c)** identidad descubrible del agente según EIP-8004 **sin** que el servidor posea claves de registro on-chain.

---

## 2. Línea base respecto a Enkrypt upstream

- **Repositorio oficial:** [github.com/enkryptcom/enKrypt](https://github.com/enkryptcom/enKrypt) — wallet multi-cadena (TypeScript, Vue).
- **Punto de partida:** fork o árbol de trabajo alineado con el historial público de `main` del upstream (orden de **~3084 commits** en GitHub; el hash exacto conviene fijarlo con `git merge-base HEAD upstream/main` en cada clon).
- **Cambios en este repo:** servicio `services/trust-risk-api`, módulo `packages/extension/src/trust/`, documentación en `docs/trust/`, y puntos de integración en las pantallas de verificación de transacción Ethereum.

---

## 3. Encaje con el brief tipo hackathon (x402 + ERC-8004 + agente)

### 3.1 Enunciado típico de referencia

Construir un **agente** alineado con **ERC-8004** que use **x402** para **pagar por llamada a la API on-chain**, apoyándose en **servicios reales** (datos, cómputo), con modelo económico de **micropago por invocación** en lugar de abonos globales.

### 3.2 Cómo lo satisface TRUST

| Dimensión | Diseño en TRUST |
|-----------|-----------------|
| **x402 / pago por llamada** | Cada `POST` a `/api/risk-check` o `/api/risk-check/deep` es un **recurso** x402 distinto. Flujo: primera petición **402** + `accepts`; el cliente (thirdweb `wrapFetchWithPayment`) firma **EIP-3009** sobre USDC Fuji; segunda petición con cabecera de pago → **settlePayment** → **200** con evidencia. |
| **Liquidación on-chain** | El facilitador thirdweb ejecuta la transferencia USDC conforme al estándar x402 / EIP-3009. |
| **Economía por invocación** | No hay crédito global sustitutivo en el servidor: cada aceptación acota el monto vía `maxAmountRequired`. Es el patrón natural de x402; distinto de un allowance ERC-20 ilimitado o de una suscripción anual fija. |
| **Rol del usuario** | La wallet Enkrypt **firma** la autorización de pago (custodia del usuario). El software **orquesta** el 402→pago→200 de forma automática **después** de esa firma. Un despliegue futuro podría usar una wallet de servicio o session keys para reducir fricción; no forma parte del producto actual. |
| **Servicios reales** | **Datos:** `eth_getCode`, API de explorador (fuente verificada). **Cómputo:** LLM opcional (Ollama). **Persistencia de código:** el explorador publica el Solidity verificado; no se incluye un producto de object storage propio. |
| **EIP-8004** | El agente puede **registrarse** en el **IdentityRegistry** desplegado en la misma familia de redes (Fuji `43113`). El API expone un **documento de registro** estable en `GET /agent-registration.json` y, si se configuran variables de entorno, devuelve un bloque **`erc8004`** en el JSON **200** del risk-check. Las transacciones de **mint** y **setAgentURI** las firma el **operador** con su propia wallet: el servidor no custodia claves de registro, lo que reduce superficie de ataque y clarifica responsabilidades. |

### 3.3 Relación EIP-8004 ↔ x402

El estándar **EIP-8004 no define medios de pago**. Los pagos HTTP **x402** son una **capa complementaria**: el archivo de registro del agente declara explícitamente el esquema de pago (`payment` en JSON) y los endpoints `POST` protegidos por 402.

---

## 4. Identidad del agente (EIP-8004)

### 4.1 Referencia normativa y registries

[EIP-8004](https://eips.ethereum.org/EIPS/eip-8004) define, entre otros, el **Identity Registry** (identidades tipo ERC-721 con URI de registro) y el **Reputation Registry** (señales de feedback). El proyecto comunitario publica despliegues en múltiples cadenas; en **Avalanche (C-Chain) Testnet / Fuji**, `chainId` **43113**, las direcciones de referencia son:

| Contrato | Dirección (Fuji / Avalanche testnet) |
|----------|--------------------------------------|
| **IdentityRegistry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| **ReputationRegistry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

*(Lista alineada con la documentación del repositorio de contratos ERC-8004; verificar en explorador si la red de despliegue coincide exactamente con Fuji 43113.)*

### 4.2 Identificador lógico del agente

Un agente se referencia con:

- **`agentRegistry`:** cadena tipo `eip155:<chainId>:<identityRegistryAddress>` (dirección del registry en minúsculas).
- **`agentId`:** el `tokenId` ERC-721 devuelto por `register` en el IdentityRegistry.

**Ejemplo de despliegue** (ilustrativo): transacción `Register` exitosa que acuña el token **#89** al control de la wallet del operador; a partir de ahí `agentId` para configuración es `"89"`.

### 4.3 Implementación en `trust-risk-api`

| Componente | Ubicación / comportamiento |
|------------|----------------------------|
| **Documento de registro** | `GET {baseUrl}/agent-registration.json` — JSON con `type`, `name`, `description`, `services` (endpoints `POST` estándar y deep), `supportedTrust`, bloque `payment` (x402, Fuji). |
| **Registrations en el JSON** | Si en entorno están `TRUST_ERC8004_IDENTITY_REGISTRY` y `TRUST_ERC8004_AGENT_ID`, el documento incluye `registrations: [{ agentRegistry, agentId }]`. Si solo está configurada la dirección del registry, puede incluirse `registrationsPending` con `suggestedAgentRegistry` hasta completar el `agentId`. |
| **Respuesta 200 del risk-check** | Campo opcional **`erc8004`**: `chainId`, `identityRegistry`, `reputationRegistry` (opcional), `agentRegistry`, `agentId`, `agentRegistration` (URL del GET anterior), `note`. **No modifica** el motor B3 ni los scores; solo añade metadatos de descubrimiento. |
| **Código** | `src/config/erc8004.ts` (construcción del documento y del eco), `src/server.ts` (ruta GET), `src/routes/riskCheck.ts` (adjuntar `erc8004` al cuerpo 200), tests en `src/config/erc8004.test.ts`. |
| **CORS** | El servidor permite **GET** además de **POST** para que el documento de registro sea consumible desde herramientas y exploradores. |

### 4.4 Responsabilidad del operador (fuera del proceso Node)

1. Obtener gas en **Fuji** (AVAX testnet).
2. Ejecutar **`register`** en el IdentityRegistry → anotar **`agentId`**.
3. Publicar el API en una **URL base estable**; fijar **`TRUST_PUBLIC_BASE_URL`** igual a esa base (requisito compartido con x402).
4. Ejecutar **`setAgentURI(agentId, "https://<base>/agent-registration.json")`** para que el **tokenURI** on-chain apunte al mismo documento que sirve el servidor (evitar `http://127.0.0.1` en producción: no es resoluble por terceros).
5. Rellenar en `.env` del API las variables documentadas en `services/trust-risk-api/.env.example` (`TRUST_ERC8004_*`) y reiniciar el servicio.

### 4.5 Extensión Enkrypt

Si la respuesta pagada incluye **`erc8004`**, **`TrustPanel.vue`** muestra el identificador, el enlace al JSON de registro y la cadena `agentRegistry`, sin alterar la lógica de riesgo ni el flujo x402.

---

## 5. Protocolo x402 (detalle)

- **Recurso:** URL absoluta del `POST` (`/api/risk-check` o `/api/risk-check/deep`).
- **Esquema:** `exact`, USDC Fuji, `maxAmountRequired` según precio configurado.
- **Cliente:** `wrapFetchWithPayment` + wallet adaptada (`createEnkryptTrustX402Wallet`) con **EIP712Domain** explícito en tipos EIP-712 para compatibilidad con USDC / facilitador.
- **Servidor:** `readPaymentHeader` (orden `PAYMENT-SIGNATURE`, luego `X-PAYMENT`), `settlePayment`, luego pipeline de riesgo.

Coherencia **`TRUST_PUBLIC_BASE_URL`** ↔ URL que usa el cliente: obligatoria para que el segundo POST pase verificación.

---

## 6. Servicios compuestos por el API

| Servicio | Implementación | Rol |
|----------|------------------|-----|
| Bytecode destino | `eth_getCode` (`TRUST_FUJI_RPC_URL`) | `contractProbe` |
| Fuente verificada | API tipo Etherscan (Routescan Fuji) | Metadatos en 200; Solidity completo solo uso interno (LLM + escaneo) |
| Motor B3 | `evaluatePaidRisk`, fixtures env | Scores y flags deterministas |
| Solidity estático | `solidityStaticScan.ts` | Flags `SOLIDITY_*` |
| LLM | Ollama, `TRUST_LLM_ENABLED` | Veredicto, resumen, mezcla opcional de scores |
| Facilitador | thirdweb x402 | Liquidación USDC |

---

## 7. Orquestación en la extensión

**`orchestrateRiskAssessment`** (`trust/agent/orchestrator.ts`): señales locales → `fetchPaidRiskEvidence` → **`mergePaidEvidenceIntoFinalRiskScore`** (combinación ponderada con `paidRiskScore`, suelos por flags maliciosas y veredicto LLM) → nivel **low / medium / high** y bloqueo de envío en **high** en el flujo Send.

**Override de política:** en el código actual la consulta al API pagado puede forzarse para demostraciones; en producción conviene condicionarla de nuevo a reglas de negocio.

---

## 8. Pipeline del servidor tras pago válido

Orden fijo en `riskCheck.ts`:

1. Validación del body (`contracts.ts`).
2. `evaluatePaidRisk` (B3).
3. `runContractProbe`.
4. `runExplorerSourceLookup`.
5. `mergeExplorerIntoPaidRisk`.
6. `mergeSolidityStaticIntoPaidRisk`.
7. `runOllamaAnalysis` (opcional).
8. `applyLlmScoreBlend` si el modelo devuelve `llmRiskScore`.
9. Adjuntar **`erc8004`** si la configuración lo permite.

---

## 9. Estructura de archivos TRUST

```
enKrypt-TRUST/
├── packages/extension/src/trust/    # Cliente, x402, orquestador, UI
├── services/trust-risk-api/       # API HTTP, motor, EIP-8004 helpers
├── docs/trust/                    # Contratos de API, integración
└── technical.md
```

**Extensión (extracto):** `orchestrator.ts`, `riskClient.ts`, `session.ts`, `enkryptX402Wallet.ts`, `TrustPanel.vue`, `types.ts`, analizadores locales, tests `orchestrator.mergePaid.test.ts`.

**API (extracto):** `routes/riskCheck.ts`, `engine/scoreRisk.ts`, `engine/solidityStaticScan.ts`, `chain/*`, `llm/ollama.ts`, `config/erc8004.ts`, `config/pricing.ts`, `server.ts`, `listen.ts`.

**UI Enkrypt:** `verify-transaction/index.vue`, `eth-verify-transaction.vue`.

---

## 10. Alcance: incluido y excluido

**Incluido:** x402 dos tiers; motor B3; sondas RPC y explorador; escaneo Solidity; Ollama opcional; integración EIP-8004 en forma de **documento de registro HTTP** y **eco `erc8004`**; panel en extensión; documentación de protocolo (`risk-check.protocol.md`, `PERSON_A_INTEGRATION.md`, README del API).

**Excluido de forma deliberada o pendiente:** envío automático de transacciones al Identity/Reputation/Validation Registry desde el backend (custodia del operador); agente con wallet de servicio sin intervención del usuario final; x402 en `chainId` distinto de `43113` en el validador actual; reputación on-chain escrita tras cada análisis; auditoría formal o pruebas ZK del tipo Validation Registry avanzado.

---

## 11. Pruebas automatizadas

- **API:** `cd services/trust-risk-api && npm test` — incluye `erc8004.test.ts`, contratos, calldata, motor de scores, Solidity estático, explorer, getCode, ollama mockeado, pricing.
- **Extensión:** tests del merge de score en `orchestrator.mergePaid.test.ts` según entorno Vitest del paquete.

---

## 12. Trazabilidad respecto a Enkrypt upstream

```bash
git remote add upstream https://github.com/enkryptcom/enKrypt.git   # si aplica
git fetch upstream
git merge-base HEAD upstream/main
```

Registrar el hash resultante en la documentación interna del equipo junto a la referencia de commits del upstream.

---

## 13. Referencias

- [Enkrypt](https://github.com/enkryptcom/enKrypt)
- [EIP-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- Documentación thirdweb (x402: `settlePayment`, `wrapFetchWithPayment`) — ver README de `services/trust-risk-api`

---

*Documento de arquitectura — proyecto **T.R.U.S.T** / fork **enKrypt-TRUST**: evaluación de riesgo en wallet, micropagos x402, identidad de agente alineada con EIP-8004.*
