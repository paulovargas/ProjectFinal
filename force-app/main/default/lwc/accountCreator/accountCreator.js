import { LightningElement, wire, api, track } from 'lwc';
import getAccountFields from '@salesforce/apex/AccountController.getAccountFields';

export default class AccountCreator extends LightningElement {
    @api jsonData;

    fields = [];
    // Expose fieldList for compatibility; templates will use fieldEntries instead
    get fieldList() {
        return this.fields;
    }
    values = {};
    // fieldEntries is an array of { name, value } used directly by the template (no computed access)
    @track fieldEntries = [];
    @track currentValue = '';

    mapReceitaToAccount(raw) {
        return {
            'Name': raw.nome,
        'CNPJ__c': raw.cnpj, // provavelmente custom field
        'Phone': raw.telefone,
        'BillingStreet': raw.logradouro,
        'BillingCity': raw.municipio,
        'BillingState': raw.uf,
        'BillingPostalCode': raw.cep,
        'BillingCountry': 'Brasil',
        'Description': raw.atividade_principal?.[0]?.text || '',
        'Industry': raw.atividade_principal?.[0]?.text || '',
        'Type': raw.tipo,
        'AccountNumber': raw.numero,
        'Website': raw.email ? `mailto:${raw.email}` : ''
        };
    }

    // Use a mock when the wire doesn't return data (useful in dev orgs without schema access).
    // The mock is only used when running locally in dev or when the wire returns no data.
    // It returns a representative set of Account field API names.
    // Update this array to the exact fields you want shown on the form.
    // Reverted to the previous (original) mock field list and will organize into blocks.
    // Approved fields grouped by block (use API names). Adjust order as requested.
    get MOCK_FIELDS() {
        return [
            // Use human labels as before but underlying aliasMap will map to API names for values
            'CNPJ',
            'Account Name',
            'Parent Account',
            'Account Number',
            'Account Site',
            'Type',
            'Industry',
            'Annual Revenue',
            'Rating',
            'Phone',
            'Fax',
            'Website',
            'Ticker Symbol',            
            'Ownership',
            'Employees',
            'SIC Code',

            // Address Information
            'BillingStreet',
            'BillingCity',
            'BillingState',
            'BillingPostalCode',
            'BillingCountry',
            
            // Additional Information
            'Customer Priority',
            'SLA Expiration Date',
            'Number of Locations',
            'Active',
            'SLA',
            'SLA Serial Number',
            'Upsell Opportunity',

            // Description Information
            'Description'
        ];
    }

    @wire(getAccountFields)
    wiredFields({ data, error }) {
        if (data) {
            this.fields = data;
        } else {
            // If the wire call fails or returns no data, fall back to the mock set.
            // This ensures the component renders in environments without Apex access or during testing.
            this.fields = this.MOCK_FIELDS;
        }

        // parse jsonData if present (do this regardless of source of fields)
        /* if (this.jsonData) {
            try {
                this.values = JSON.parse(this.jsonData) || {};
            } catch (e) {
                this.values = {};
            }
        } */

        if (this.jsonData) {
            try {
                console.log("this.jsonData : " + this.jsonData);
                // jsonData may be provided as a JSON string or an object.
                // Parse safely if it's a string, otherwise use as-is.
                let raw;
                if (typeof this.jsonData === 'string') {
                    try {
                        raw = JSON.parse(this.jsonData);
                    } catch (parseErr) {
                        // If parsing fails, log and fallback to empty object
                        console.error('Failed to parse jsonData string:', parseErr);
                        raw = {};
                    }
                } else {
                    raw = this.jsonData;
                }
                console.log("raw : ", raw);
                this.values = this.mapReceitaToAccount(raw);
            } catch (e) {
                console.error('Error mapping jsonData to account values:', e);
                this.values = {};
            }
        }

        // Ensure fields are ordered to match MOCK_FIELDS when possible, otherwise preserve wire order.
        const preferredOrder = this.MOCK_FIELDS;

        // Build a normalization helper to compare labels/API names tolerant to case/spacing/underscores
        const normalizeName = (s) => String(s || '').toLowerCase().replace(/[_\s]/g, '');

        // Map normalized apiName -> actual apiName from this.fields
        const fieldsMap = new Map();
        this.fields.forEach((api) => {
            fieldsMap.set(normalizeName(api), api);
        });

        // Build orderedFields as an array of objects: { label, apiName }
        const orderedFields = [];

        // First, take preferredOrder labels and resolve to actual api names when possible
        preferredOrder.forEach((label) => {
            const normalizedLabel = normalizeName(label);
            const matchingApi = fieldsMap.get(normalizedLabel);
            if (matchingApi) {
                orderedFields.push({ label: label, apiName: matchingApi });
            } else {
                // If no matching API found, still include the label as-is (apiName=null)
                orderedFields.push({ label: label, apiName: null });
            }
        });

        // Then append any remaining api fields from this.fields that weren't matched yet
        this.fields.forEach((api) => {
            const normalizedApi = normalizeName(api);
            const alreadyIncluded = orderedFields.some((o) => normalizeName(o.label) === normalizedApi || normalizeName(o.apiName) === normalizedApi);
            if (!alreadyIncluded) {
                // Use the API name as the label when no human label exists
                orderedFields.push({ label: api, apiName: api });
            }
        });

        // ALIAS MAP: map displayed labels (used in MOCK_FIELDS) to actual API names present in this.values
        // Expose aliasMap on the component instance so other methods (e.g., handleInput) can access it.
        this.aliasMap = {
            'Account Name': 'Name',
            'CNPJ': 'CNPJ__c',
            'Parent Account': 'ParentId',
            'Account Number': 'AccountNumber',
            'Account Site': 'Site',
            'Annual Revenue': 'AnnualRevenue',
            'Ticker Symbol': 'TickerSymbol',
            'Employees': 'NumberOfEmployees',
            'SIC Code': 'SIC',
            'Customer Priority': 'CustomerPriority__c',
            'SLA Expiration Date': 'SLA_Expiration_Date__c',
            'Number of Locations': 'Number_of_Locations__c',
            'Active': 'Active__c',
            'SLA': 'SLA__c',
            'SLA Serial Number': 'SLA_Serial_Number__c',
            'Upsell Opportunity': 'Upsell_Opportunity__c'
        };

        // build fieldEntries for template binding: [{ name, value, index }, ...] in the orderedFields sequence
        const flatEntries = orderedFields.map((f, i) => {
            // Resolve alias: if the displayed field name f has a mapping to an API name, use it to get the value
            const apiName = (this.aliasMap && this.aliasMap[f]) || f;
            const value = this.values && apiName in this.values ? this.values[apiName] : '';
            return { name: f, value: value, index: i };
        });

        // DIAGNOSTIC LOGS: help debug why template arrays might be empty in UI
        // These logs are temporary — remove them after debugging.
        console.log('DEBUG: this.fields ->', this.fields);
        console.log('DEBUG: orderedFields ->', orderedFields);
        console.log('DEBUG: flatEntries ->', flatEntries);
        // Also log parsed values and mapping to help trace why values may not match labels/API names
        console.log('DEBUG: this.values ->', this.values);
        try {
            console.log('DEBUG: mapReceitaToAccount(raw) sample ->', this.mapReceitaToAccount(
                typeof this.jsonData === 'string' ? (() => { try { return JSON.parse(this.jsonData); } catch(e){ return {}; } })() : this.jsonData
            ));
        } catch (mapErr) {
            console.error('DEBUG: mapReceitaToAccount threw', mapErr);
        }
        // Log block lengths after they're constructed to avoid ReferenceError
        // (will be printed further down once blocks are built)

        // Map fields to their intended blocks based on name patterns / explicit lists.
        // Define block membership by API name or label as used in MOCK_FIELDS.
        const accountNames = new Set([
            'CNPJ','Account Name','Parent Account','Account Number','Account Site','Type','Industry','Annual Revenue',
            'Rating','Phone','Fax','Website','Ticker Symbol','Ownership','Employees','SIC Code'
        ]);
        const addressNames = new Set([
            'BillingStreet','BillingCity','BillingState','BillingPostalCode','BillingCountry'
        ]);
        const additionalNames = new Set([
            'Customer Priority','SLA Expiration Date','Number of Locations','Active','SLA','SLA Serial Number','Upsell Opportunity'
        ]);
        const descriptionNames = new Set(['Description']);

        // Build arrays preserving the ordered sequence from flatEntries
        const accountBlock = [];
        const addressBlock = [];
        const additionalBlock = [];
        const descriptionBlock = [];
        const othersBlock = [];

        flatEntries.forEach((entry) => {
            if (accountNames.has(entry.name)) {
                accountBlock.push(entry);
            } else if (addressNames.has(entry.name)) {
                addressBlock.push(entry);
            } else if (additionalNames.has(entry.name)) {
                additionalBlock.push(entry);
            } else if (descriptionNames.has(entry.name)) {
                descriptionBlock.push(entry);
            } else {
                othersBlock.push(entry);
            }
        });

        // Use the assembled blocks as the canonical fieldEntries (flat) and also compute vertical splits
        this.fieldEntries = flatEntries;

        const splitVertically = (entries) => {
            const n = entries.length;
            const half = Math.floor(n / 2);
            return {
                col1: entries.slice(0, half),
                col2: entries.slice(half)
            };
        };

        const accSplit = splitVertically(accountBlock);
        const addrSplit = splitVertically(addressBlock);
        const addSplit = splitVertically(additionalBlock);
        const descSplit = splitVertically(descriptionBlock);

        // Expose arrays for template: each block has left/right column arrays
        this.accountInfoLeft = accSplit.col1;
        this.accountInfoRight = accSplit.col2;

        this.addressLeft = addrSplit.col1;
        this.addressRight = addrSplit.col2;

        this.additionalLeft = addSplit.col1;
        this.additionalRight = addSplit.col2;

        this.descriptionLeft = descSplit.col1;
        this.descriptionRight = descSplit.col2;

        // (Removed redundant block - block splitting and exposures are handled above
        // using the accountBlock/addressBlock/additionalBlock/descriptionBlock variables
        // and their splits.)
    }

    // Set the flat property used by the template before editing a given input
    prepareValue(event) {
        const index = Number(event.target.dataset.index);
        this.currentValue = (this.fieldEntries[index] && this.fieldEntries[index].value) || '';
    }

    // Persist changes back into the values map without computed access in template
    handleInput(event) {
        const index = Number(event.target.dataset.index);
        /* const field = this.fields[index]; */
        const displayedName = this.fieldEntries[index].name;
        const newVal = event.target.value;

        // Resolve to API name when recording into this.values (keep values keyed by API names)
        const apiName = (this.aliasMap && this.aliasMap[displayedName]) || displayedName;

        // Reassign to trigger reactivity; store under apiName
        this.values = { ...this.values, [apiName]: newVal };

        // update fieldEntries for template binding (preserve displayedName)
        const newEntries = this.fieldEntries.map((entry, i) => {
            if (i === index) {
                return { name: entry.name, value: newVal };
            }
            return entry;
        });
        this.fieldEntries = newEntries;

        // Keep currentValue in sync for the focused input
        this.currentValue = newVal;
    }
}
