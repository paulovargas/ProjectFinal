public with sharing class AccountController {

    @AuraEnabled(cacheable=true)
    public static Account getAccountByCNPJ(String cnpj){
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
            String soql = 'SELECT ' + String.join(fieldNames, ',') +
                          ' FROM Account WHERE CNPJ__c = :cnpj LIMIT 1';
            List<Account> accs = (List<Account>) Database.query(soql);
            return accs.isEmpty() ? null : accs[0];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}