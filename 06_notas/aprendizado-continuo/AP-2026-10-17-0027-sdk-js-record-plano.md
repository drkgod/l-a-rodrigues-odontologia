# AP-2026-10-17-0027 — Record do SDK JS do PocketBase é objeto plano (sem getString/getBool)

- **Task**: f124df8f (registrar resposta do paciente + cobertura de ligação)
- **Data**: 17/10/2026 00h27
- **Contexto**: prova P4-03b falhou com "getString is not a function" no teste humano, na v0.0.59.
- **Causa raiz**: código escrito com a API do servidor PocketBase (Go/JSVM: `record.getString('campo')`,
  `getBool`, `getInt`) dentro de código que roda no navegador com o SDK JS — onde o record é um
  **objeto plano** (`record.campo`), sem esses métodos. QA passou porque só compila (TS não pega
  método ausente em objeto `any`); quebrou só em runtime, no teste do dono.
- **Padrão reutilizável**: no navegador (SDK JS), leia campos do record DIRETO (`contato.estado`),
  nunca `.getString()/.getBool()/.getInt()`. Esses getters existem só no servidor (hooks JSVM).
  Ao copiar código entre servidor e front, conferir o lado em que roda.
- **Evidência**: erro "contatoManhaDepois.getString is not a function" no teste humano; fix trocou
  6 ocorrências em provas.ts (P4-03/P4-03b) para campos diretos; QA verde; dono aprovou na v0.0.59.
- **Regra derivada**: QA/TS não substitui executar o fluxo real — o teste humano pegou o que a
  revisão de código não viu (padrão já registrado em 09/10 no 60532; aqui com causa técnica exata).