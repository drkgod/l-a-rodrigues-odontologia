# Mapa — Lai (versão Skip e13e688 / v0.0.4)

## Rotas
| Rota | Página | Proteção | Serviços |
|---|---|---|---|
| /login | Login.tsx | pública | services/auth |
| /sem-acesso | SemAcesso.tsx | pública (usuário sem função) | contexts/AuthContext |
| / | Index.tsx | Protegido | services/config |
| /provas | Provas.tsx | Protegido + SomenteGestao | services/provas |
| * | NotFound.tsx | pública | — |

## Coleções
| Coleção | Campos principais | Regras (list/view/create/update/delete) |
|---|---|---|
| users (auth) | +papel (select 6), +ativo (bool), +profissional (rel) | próprio ou gestão; update trava papel/ativo/profissional p/ não-gestão; create/delete gestão |
| profissionais | clinicorp_id, origem, lote_id, nome, ativo, cadeira_padrao (rel), tipo_agenda | leitura: autenticado com papel+ativo; escrita: gestão |
| cadeiras | clinicorp_id, origem, lote_id, nome, tipo | idem |
| config_unidade | nome_unidade, modo_dados, integracoes_externas_habilitadas, fuso, janelas, arredondamento_min | idem (registro único UNIDADE-DEMO seed) |
| provas_execucoes | spec, cenario, esperado, obtido, passou, executado_por/em, observacao | só gestão em tudo |

## Componentes reutilizáveis
- ui/* shadcn completos (button, input, label, card, table, badge, dialog, alert-dialog, select, tabs, form, skeleton, toast/sonner…)
- contexts/AuthContext: AuthProvider, useAuth, Protegido, SomenteGestao

## Padrões observados
- Serviços em src/services/* são o único lugar que importa pb; erros via getErrorMessage (errors.ts) traduzidos em PT-BR.
- Rotas em src/App.tsx com Providers (TooltipProvider, Toaster, Sonner) preservados.
- Tokens do tema em src/main.css (claro/escuro); pt-BR nos textos.

## Arquivos gerados que não se editam
- src/lib/pocketbase/*, src/hooks/use-realtime.ts, src/components/ui/*, package.json, lockfiles, vite.config.ts, tsconfig*, .oxlintrc.json, .skip.config.json
