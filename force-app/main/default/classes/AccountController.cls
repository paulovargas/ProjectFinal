public with sharing class AccountController {
  @AuraEnabled(cacheable=true)
  public static Account getAccountByCNPJ(String cnpj) {
    if (String.isBlank(cnpj)) {
      return null;
    }
    try {
      // Retorna todos os campos acessíveis do objeto Account respeitando FLS
      // Para obter "todos os campos", usamos um campo agregado padrão (Id)
      // e em seguida preenchemos os demais campos via SObject.clone(true, true, true)
      // não é aplicável aqui. Alternativa: usar Dynamic SOQL com describe para
      // construir a lista de campos disponíveis em runtime respeitando FLS.
      //
      // Implementação: descreve Account, filtra apenas campos acessíveis ao usuário,
      // monta a lista de campos e executa o SOQL dinâmico.
      Schema.DescribeSObjectResult d = Account.SObjectType.getDescribe();
      Map<String, Schema.SObjectField> fields = d.fields.getMap();
      List<String> fieldNames = new List<String>();
      for (Schema.SObjectField f : fields.values()) {
        Schema.DescribeFieldResult fd = f.getDescribe();
        // Inclui somente campos que o usuário pode ler
        if (fd.isAccessible()) {
          fieldNames.add(fd.getName());
        }
      }
      // Garante que Id esteja presente
      if (!fieldNames.contains('Id')) {
        fieldNames.add('Id');
      }
      // Monta a query dinâmica
      String soql =
        'SELECT ' +
        String.join(fieldNames, ',') +
        ' FROM Account WHERE CNPJ__c = :cnpj LIMIT 1';
      List<Account> accs = (List<Account>) Database.query(soql);
      return accs.isEmpty() ? null : accs[0];
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  public class GetOrFetchResult {
    @AuraEnabled
    public Account foundAccount;
    @AuraEnabled
    public Map<String, Object> receitaData;
    @AuraEnabled
    public Boolean success;
    @AuraEnabled
    public String message;
  }

  @AuraEnabled(cacheable=true)
  public static GetOrFetchResult getOrFetchByCNPJ(String cnpj) {
    GetOrFetchResult result = new GetOrFetchResult();
    try {
      if (String.isBlank(cnpj)) {
        result.success = false;
        result.message = 'CNPJ vazio';
        return result;
      }
      String normalized = cnpj.replaceAll('[^0-9]', '');
      if (normalized.length() != 14) {
        result.success = false;
        result.message = 'CNPJ deve conter 14 dígitos';
        return result;
      }

      Account existing = getAccountByCNPJ(normalized);
      if (existing != null) {
        result.success = true;
        result.foundAccount = existing;
        result.message = null;
        return result;
      }

      // Não encontrado -> consulta ReceitaWSService
      Map<String, Object> api = ReceitaWSService.searchCNPJ(normalized);
      if (api == null) {
        result.success = false;
        result.message = 'Resposta vazia da ReceitaWS';
        return result;
      }
      if (api.containsKey('erro')) {
        result.success = false;
        result.message = (String) api.get('erro');
        return result;
      }

      result.success = true;
      result.receitaData = api;
      return result;
    } catch (Exception e) {
      result.success = false;
      result.message = e.getMessage();
      return result;
    }
  }
}
