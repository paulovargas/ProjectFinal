# Projeto Final — Cadastro de Clientes por CNPJ (Salesforce)

Implementação LWC + Apex que:

- Consulta a API pública ReceitaWS por CNPJ
- Verifica duplicidade em Account
- Abre o formulário padrão “New Account” com campos pré‑preenchidos caso não exista o cadastro no Salesforce ou pergunta se o usuário deseja editar o cadastro caso já exista.

Conteúdo

- Requisitos
- Deploy
- Configuração do Callout (Remote Site Settings, Named Credential e External Credential)
- Exposição do LWC (Quick Action)
- Permissões (CRUD/FLS)
- Execução (via LWC )
- Testes e validações
- Notas técnicas
- Solução de problemas (troubleshooting)
- Licença

Requisitos

- Visual Studio Code
- Salesforce CLI (sf) instalado e autenticado em uma org alvo
- Permissão para criar/atualizar metadados (Apex, LWC, Permission Sets, etc.)
- Acesso à internet para chamadas à API ReceitaWS

Deploy

1. Autenticação

- Produção/Sandbox:
  sf org login web --alias suaOrgAlias --set-default
- Scratch org (opcional):
  sf org create scratch -f config/project-scratch-def.json -a suaScratch -d 7 -s

2. Deploy do projeto
   sf project deploy start --target-org suaOrgAlias

3. Testes Apex (recomendado)
   sf apex run test --target-org suaOrgAlias --code-coverage --result-format human --wait 10

Configuração do Callout
Opção A — Remote Site Settings (mais simples)

1. Setup > Remote Site Settings > New
   - Remote Site Name: ReceitaWS
   - Remote Site URL: https://www.receitaws.com.br
   - Active: marcado
2. Salve.

Opção B — Named Credential (recomendado para boas práticas)

1. Setup > External Credentials
2. Crie um External Credential:
   - Label/Name: ReceitaWS
   - URL: https://www.receitaws.com.br
   - Authentication Protocol: No Authentication
3. Setup > Named Credentials
4. Crie um Named Credential:
   - Label/Name: ReceitaWS
   - URL: https://www.receitaws.com.br
   - Authentication > External Credential - ReceitaWS

Exposição do LWC
Quick Action em Account

1. Setup > Object Manager > Account > Buttons, Links, and Actions > New Button or Link
   - Label/Name sugerido: “New ( with CNPJ)”
   - Display Type: “List Button”
   - Behavior: "Display in existing window with sidebar"
   - Content Source : "URL"
   - Na caixa de texto insira a URL - /lightning/cmp/c\_\_newAccount
   - Clique em "Check Syntax" para confirmar a URL como válida e salve.
2. Adicione a ação ao Page Layout de Account:
   - Account > List View Button Layout > List View > Edit
   - Em Custom Buttons > Available Buttons selecione “New ( with CNPJ)”, clique em "Add" para mover para a lista "Selected Buttons" e "Save"

Permissões (CRUD/FLS e acesso)

- Objetos Account e Contact:
  - Garanta CRUD apropriado para o perfil/permission set do usuário (Create/Read/Edit conforme o caso)
- Campos custom (na sua org):
  - CNPJ\_\_c: conceder Read/Edit conforme necessidade; recomendado marcar como Unique + External Id
  - Status_Cadastral\_\_c: conceder Read/Edit conforme necessidade
- Acesso ao componente (LWC):
  - Conceda acesso ao App/Page/Quick Action conforme o perfil do usuário
- Permission Sets do projeto (se aplicável):
  - Caso exista um Permission Set em force-app/main/default/permissionsets, atribua:
    sf org assign permset --name <PermissionSetName> --target-org myOrgAlias

Execução
Via LWC (incluso neste repositório)

1. Na aba Account
2. Clique em “New ( with CNPJ)” , caso não abra o modal devido ao cache da página clique em "Search CNPJ"
3. Informe o CNPJ (14 dígitos)
   - Se já existir Account com o CNPJ, será mostrado um modal com opção para editar o registro existente
   - Se não existir, o componente chama o serviço Apex para buscar dados na ReceitaWS, mapeia os campos e abre a tela padrão “New Account” com campos pré‑preenchidos (você pode revisar/editar antes de salvar)
4. Salve o registro

Testes e validações

- Testes Apex
  - Executar: sf apex run test --target-org myOrgAlias --code-coverage --result-format human --wait 10
  - Existem testes para ReceitaWSService (com HttpCalloutMock) e para a busca por CNPJ no AccountController
- Validações recomendadas
  - CNPJ: o LWC valida quantidade de dígitos (14). É possível ampliar para validar dígitos verificadores
  - Duplicidade: o LWC verifica previamente via Apex e oferece edição do registro existente
- Limites e resiliência
  - A API pública ReceitaWS possui limites; evite muitas chamadas em sequência

Notas técnicas

- LWC: force-app/main/default/lwc/newAccount
  - Abre modal para entrada do CNPJ, verifica duplicidade, chama Apex e usa encodeDefaultFieldValues para abrir “New Account” pré‑preenchida
- Apex:
  - ReceitaWSService.searchCNPJ(String cnpj): callout GET ao endpoint da ReceitaWS (retorna JSON como String para o LWC)
  - AccountController.getAccountByCNPJ(String cnpj): consulta Account por CNPJ\_\_c (com validações associadas)
- Campos Account :
  - Name (Razão Social)
  - CNPJ\_\_c (Text/External Id/Unique)
  - BillingStreet (logradouro, número, complemento, bairro)
  - BillingCity (município)
  - BillingState (UF)
  - BillingPostalCode (CEP)
  - BillingCountry
  - Phone
  - Status_Cadastral\_\_c (situação cadastral)

Solução de problemas

- Verifique:
  - Autenticação na org:
    sf org list
    sf org display -o myOrgAlias
  - Remote Site Settings/Named Credential ativo para https://www.receitaws.com.br
  - Permissões (CRUD/FLS) do usuário
  - Debug Apex: Setup > Debug Logs
  - Console do navegador (LWC): verifique erros de rede/JS

Licença

- Uso educacional para o projeto de bootcamp
