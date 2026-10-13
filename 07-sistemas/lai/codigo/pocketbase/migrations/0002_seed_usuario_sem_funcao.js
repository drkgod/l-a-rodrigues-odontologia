// Task 7805f88a (debug 3) — o seed do usuário sem função estava dentro da migration
// 0001, que já tinha sido aplicada antes do patch (migration aplicada não roda de novo).
// Migração NOVA e idempotente para criar o usuário de prova sem função.
migrate(
  (app) => {
    try {
      app.findAuthRecordByEmail('users', 'semfuncao@lai.local')
    } catch (_) {
      const users = app.findCollectionByNameOrId('users')
      const registro = new Record(users)
      registro.setEmail('semfuncao@lai.local')
      registro.setPassword('SemFuncao@2026')
      registro.setVerified(true)
      registro.set('name', 'Sem Função (prova)')
      registro.set('ativo', true)
      app.save(registro)
    }
  },
  (app) => {
    try {
      app.delete(app.findAuthRecordByEmail('users', 'semfuncao@lai.local'))
    } catch (_) {}
  },
)
