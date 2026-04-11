@isTest
public class AccountControllerTest {
  // Dados reutilizáveis
  @testSetup
  static void setup() {
    Account acc = new Account(
      Name = 'Empresa Teste',
      CNPJ__c = '12345678000100'
    );
    insert acc;
  }

  // Testa: retorno quando encontra Account
  @isTest
  static void deveRetornarAccountPorCNPJ() {
    Test.startTest();
    Account acc = AccountController.getAccountByCNPJ('12345678000100');
    Test.stopTest();

    System.assertNotEquals(null, acc);
    System.assertEquals('Empresa Teste', acc.Name);
  }

  // Testa: CNPJ vazio
  @isTest
  static void naoDeveRetornarQuandoCNPJVazio() {
    Test.startTest();
    Account acc = AccountController.getAccountByCNPJ('');
    Test.stopTest();

    System.assertEquals(null, acc);
  }

  // Testa: getOrFetch retorna Account existente
  @isTest
  static void deveRetornarAccountExistente() {
    Test.startTest();
    AccountController.GetOrFetchResult result = AccountController.getOrFetchByCNPJ(
      '12345678000100'
    );
    Test.stopTest();

    System.assertEquals(true, result.success);
    System.assertNotEquals(null, result.foundAccount);
    System.assertEquals(null, result.receitaData);
  }

  // Testa: CNPJ inválido
  @isTest
  static void deveFalharQuandoCNPJInvalido() {
    Test.startTest();
    AccountController.GetOrFetchResult result = AccountController.getOrFetchByCNPJ(
      '123'
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('CNPJ deve conter 14 dígitos', result.message);
  }

  // Testa: CNPJ vazio
  @isTest
  static void deveFalharQuandoCNPJVazio() {
    Test.startTest();
    AccountController.GetOrFetchResult result = AccountController.getOrFetchByCNPJ(
      ''
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('CNPJ vazio', result.message);
  }

  // Testa: busca na Receita (sucesso)
  @isTest
  static void deveBuscarNaReceitaQuandoNaoExiste() {
    Test.setMock(HttpCalloutMock.class, new ReceitaMockSucesso());

    Test.startTest();
    AccountController.GetOrFetchResult result = AccountController.getOrFetchByCNPJ(
      '11111111000111'
    );
    Test.stopTest();

    System.assertEquals(true, result.success);
    System.assertEquals(null, result.foundAccount);
    System.assertNotEquals(null, result.receitaData);
    System.assertEquals(
      'Empresa Mock',
      (String) result.receitaData.get('nome')
    );
  }

  // Testa: Receita retorna erro
  @isTest
  static void deveFalharQuandoReceitaRetornaErro() {
    Test.setMock(HttpCalloutMock.class, new ReceitaMockErro());

    Test.startTest();
    AccountController.GetOrFetchResult result = AccountController.getOrFetchByCNPJ(
      '22222222000122'
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('Erro na API', result.message);
  }

  // Testa: CNPJ com máscara (normalização)
  @isTest
  static void deveBuscarComCNPJFormatado() {
    Test.startTest();
    AccountController.GetOrFetchResult result = AccountController.getOrFetchByCNPJ(
      '12.345.678/0001-00'
    );
    Test.stopTest();

    System.assertEquals(true, result.success);
  }

  // Testa: garante que método não quebra com null
  @isTest
  static void deveTratarCNPJNull() {
    Test.startTest();
    Account acc = AccountController.getAccountByCNPJ(null);
    Test.stopTest();

    System.assertEquals(null, acc);
  }

  // =========================
  // 🔧 MOCKS
  // =========================

  // Mock sucesso
  class ReceitaMockSucesso implements HttpCalloutMock {
    public HTTPResponse respond(HTTPRequest req) {
      HttpResponse res = new HttpResponse();
      res.setHeader('Content-Type', 'application/json');
      res.setBody('{"nome": "Empresa Mock", "situacao": "ATIVA"}');
      res.setStatusCode(200);
      return res;
    }
  }

  // Mock erro (retorna "erro" no JSON)
  class ReceitaMockErro implements HttpCalloutMock {
    public HTTPResponse respond(HTTPRequest req) {
      HttpResponse res = new HttpResponse();
      res.setHeader('Content-Type', 'application/json');
      res.setBody('{"erro": "Erro na API"}');
      res.setStatusCode(200);
      return res;
    }
  }
}
