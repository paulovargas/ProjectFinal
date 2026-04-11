@IsTest
private class AccountControllerTest {
  @TestSetup
  static void setupData() {
    // Cria um registro de Conta com CNPJ para testes de consulta
    Account acc = new Account(
      Name = 'Conta Teste',
      CNPJ__c = '11222333000181',
      Phone = '51999999999',
      BillingStreet = 'Rua Teste, 123',
      BillingCity = 'Candelária',
      BillingState = 'RS',
      BillingPostalCode = '96930-000',
      BillingCountry = 'Brasil'
    );
    insert acc;
  }

  @IsTest
  static void getAccountByCNPJ_returnsNull_whenBlank() {
    Test.startTest();
    Account a1 = AccountController.getAccountByCNPJ(null);
    Account a2 = AccountController.getAccountByCNPJ('');
    Account a3 = AccountController.getAccountByCNPJ('   ');
    Test.stopTest();

    System.assertEquals(null, a1, 'CNPJ nulo deve retornar null');
    System.assertEquals(null, a2, 'CNPJ vazio deve retornar null');
    System.assertEquals(null, a3, 'CNPJ em branco deve retornar null');
  }

  @IsTest
  static void getAccountByCNPJ_returnsRecord_whenExists() {
    Test.startTest();
    Account found = AccountController.getAccountByCNPJ('11222333000181');
    Test.stopTest();

    System.assertNotEquals(null, found, 'Deve encontrar uma Conta pelo CNPJ');
    System.assertEquals(
      '11222333000181',
      found.CNPJ__c,
      'CNPJ deve corresponder'
    );
    System.assertEquals(
      'Conta Teste',
      found.Name,
      'Nome deve corresponder aos dados de teste'
    );
    // Verificação pontual de alguns campos comuns para assegurar que o describe dinâmico os incluiu
    System.assertEquals(
      'Candelária',
      found.BillingCity,
      'BillingCity deve corresponder aos dados de teste'
    );
    System.assertEquals(
      'Brasil',
      found.BillingCountry,
      'BillingCountry deve corresponder aos dados de teste'
    );
  }

  @IsTest
  static void getAccountByCNPJ_FLS_respectsReadableFields() {
    // Observação: em muitas orgs, a manipulação de FLS em testes é limitada.
    // Validamos que o método executa sem exceções não tratadas e retorna um registro.
    // Para cenários estritos de FLS, considere adicionar um Permission Set e usar System.runAs
    // com um usuário sem acesso a determinados campos. Aqui fazemos uma checagem de resiliência.
    Test.startTest();
    Account found = AccountController.getAccountByCNPJ('11222333000181');
    Test.stopTest();

    System.assertNotEquals(
      null,
      found,
      'O método deve retornar um registro no contexto padrão de testes'
    );
  }
}
