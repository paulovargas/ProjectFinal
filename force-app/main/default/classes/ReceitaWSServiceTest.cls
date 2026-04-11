@isTest
public class ReceitaWSServiceTest {
  // Mock de sucesso
  class ReceitaSucessoMock implements HttpCalloutMock {
    public HTTPResponse respond(HTTPRequest req) {
      HttpResponse res = new HttpResponse();
      res.setHeader('Content-Type', 'application/json');
      res.setBody('{"nome": "Empresa Teste", "situacao": "ATIVA"}');
      res.setStatusCode(200);
      return res;
    }
  }

  // Mock de erro HTTP
  class ReceitaErroHttpMock implements HttpCalloutMock {
    public HTTPResponse respond(HTTPRequest req) {
      HttpResponse res = new HttpResponse();
      res.setStatusCode(404);
      res.setBody('Not Found');
      return res;
    }
  }

  // Mock de exceção (simula falha de rede)
  class ReceitaExceptionMock implements HttpCalloutMock {
    public HTTPResponse respond(HTTPRequest req) {
      throw new CalloutException('Timeout simulado');
    }
  }

  // Teste: sucesso
  @isTest
  static void deveRetornarDadosQuandoSucesso() {
    Test.setMock(HttpCalloutMock.class, new ReceitaSucessoMock());

    Test.startTest();
    Map<String, Object> result = ReceitaWSService.searchCNPJ('12345678000100');
    Test.stopTest();

    System.assertEquals('Empresa Teste', result.get('nome'));
    System.assertEquals('ATIVA', result.get('situacao'));
  }

  // Teste: erro HTTP
  @isTest
  static void deveRetornarErroQuandoHttpDiferenteDe200() {
    Test.setMock(HttpCalloutMock.class, new ReceitaErroHttpMock());

    Test.startTest();
    Map<String, Object> result = ReceitaWSService.searchCNPJ('12345678000100');
    Test.stopTest();

    System.assert(result.containsKey('erro'));
    System.assertEquals('HTTP 404', result.get('erro'));
  }

  // Teste: exceção de callout
  @isTest
  static void deveRetornarErroQuandoCalloutFalha() {
    Test.setMock(HttpCalloutMock.class, new ReceitaExceptionMock());

    Test.startTest();
    Map<String, Object> result = ReceitaWSService.searchCNPJ('12345678000100');
    Test.stopTest();

    System.assert(result.containsKey('erro'));
    System.assert(((String) result.get('erro')).contains('Falha de callout'));
  }

  // Teste: CNPJ vazio
  @isTest
  static void deveFalharQuandoCNPJVazio() {
    Test.startTest();
    Map<String, Object> result = ReceitaWSService.searchCNPJ('');
    Test.stopTest();

    System.assertEquals('CNPJ vazio', result.get('erro'));
  }

  // Teste: CNPJ inválido
  @isTest
  static void deveFalharQuandoCNPJInvalido() {
    Test.startTest();
    Map<String, Object> result = ReceitaWSService.searchCNPJ('123');
    Test.stopTest();

    System.assertEquals('CNPJ deve conter 14 dígitos', result.get('erro'));
  }

  // Teste: normalização (com máscara)
  @isTest
  static void deveNormalizarCNPJ() {
    Test.setMock(HttpCalloutMock.class, new ReceitaSucessoMock());

    Test.startTest();
    Map<String, Object> result = ReceitaWSService.searchCNPJ(
      '12.345.678/0001-00'
    );
    Test.stopTest();

    System.assertEquals('Empresa Teste', result.get('nome'));
  }
}
