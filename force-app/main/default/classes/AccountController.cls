public with sharing class AccountController {

    @AuraEnabled(cacheable=true)
    public static Account getAccountByCNPJ(String cnpj){
        if (cnpj == null) {
            return null;            
        }
        try {
            return [
                SELECT Id, CNPJ__c, Name, AccountNumber, ParentId, Site, Phone, Fax, Website, BillingStreet, 
                BillingCity, BillingState, BillingPostalCode, BillingCountry, BillingLatitude, ShippingStreet,
                ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry, Industry, Type, AnnualRevenue,
                NumberOfEmployees, Rating
                FROM Account
                WHERE CNPJ__c = :cnpj
                LIMIT 1
            ];
            
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}