public with sharing class AccountController {
    @AuraEnabled(cacheable=true)
    public static List<String> getAccountFields() {
        Map<String, Schema.SObjectField> fields = Schema.SObjectType.Account.fields.getMap();
        return new List<String>(fields.keySet());
    }
}