public with sharing class ReceitaWSService {

    @AuraEnabled(cacheable=false)
    public static String searchCNPJ(String cnpj) {

        try {
            Http http = new Http();
            HttpRequest req = new HttpRequest();

            cnpj = cnpj.replaceAll('[^0-9]', '');

            req.setEndpoint('https://www.receitaws.com.br/v1/cnpj/' + cnpj);
            req.setMethod('GET');
            req.setTimeout(10000);

            HttpResponse res = http.send(req);

            if (res.getStatusCode() == 200) {
                return res.getBody();
            } else {
                return '{"erro":"HTTP ' + res.getStatusCode() + '"}';
            }

        } catch (Exception e) {
            return '{"erro":"' + e.getMessage() + '"}';
        }
    }

    // Método utilizado pelo LWC newAccount para verificar se já existe Account com o CNPJ informado.
    // Retorna o Id da Account se existir; caso contrário, retorna null.
    @AuraEnabled(cacheable=true)
    public static Id getAccountByCNPJ(String cnpj) {
        if (String.isBlank(cnpj)) {
            return null;
        }
        String onlyDigits = cnpj.replaceAll('[^0-9]', '');

        // Ajuste o campo CNPJ__c conforme seu org (API name correto do campo de CNPJ em Account)
        List<Account> accs = [
            SELECT Id
            FROM Account
            WHERE CNPJ__c = :onlyDigits
            LIMIT 1
        ];
        return accs.isEmpty() ? null : accs[0].Id;
    }
}
