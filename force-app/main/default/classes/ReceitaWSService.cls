public with sharing class ReceitaWSService {
  @AuraEnabled(cacheable=true)
  public static Map<String, Object> searchCNPJ(String cnpj) {
    try {
      if (String.isBlank(cnpj)) {
        return new Map<String, Object>{ 'erro' => 'CNPJ vazio' };
      }

      cnpj = cnpj.replaceAll('[^0-9]', '');
      if (cnpj.length() != 14) {
        return new Map<String, Object>{
          'erro' => 'CNPJ deve conter 14 dígitos'
        };
      }

      Http http = new Http();
      HttpRequest req = new HttpRequest();

      req.setEndpoint('https://www.receitaws.com.br/v1/cnpj/' + cnpj);
      req.setMethod('GET');
      req.setTimeout(10000);

      HttpResponse res = http.send(req);

      if (res.getStatusCode() == 200) {
        // Desserializa para Map<String,Object>
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(
          res.getBody()
        );
        return parsed;
      } else {
        return new Map<String, Object>{
          'erro' => 'HTTP ' + String.valueOf(res.getStatusCode())
        };
      }
    } catch (CalloutException ce) {
      return new Map<String, Object>{
        'erro' => 'Falha de callout: ' + ce.getMessage()
      };
    } catch (Exception e) {
      return new Map<String, Object>{ 'erro' => e.getMessage() };
    }
  }
}
