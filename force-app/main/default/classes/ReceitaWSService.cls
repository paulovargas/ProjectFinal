public with sharing class ReceitaWSService {

    @AuraEnabled
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
}
