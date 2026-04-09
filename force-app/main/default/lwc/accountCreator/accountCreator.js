import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import NAME_FIELD from '@salesforce/schema/User.Name';
import SMALL_PHOTO from '@salesforce/schema/User.SmallPhotoUrl';

export default class AccountCreator extends LightningElement {
    @api jsonData;

    @track values = {};

    ownerName;

    @wire(getRecord, { recordId: USER_ID, fields: [NAME_FIELD, SMALL_PHOTO] })
    user({ data }) {
        if (data) {
            this.ownerName = data.fields.Name.value;
            this.ownerPhoto = data.fields.SmallPhotoUrl.value;
        }
    }

    connectedCallback() {
        this.loadData();
    }

    loadData() {
        try {
            let raw;

            if (this.jsonData) {
                console.log('jsonData :', this.jsonData);
                raw = typeof this.jsonData === 'string'
                    ? JSON.parse(this.jsonData)
                    : this.jsonData;
            }

            // MOCK (pra teste)
            const mock = {
                nome: 'Empresa Teste LTDA',
                cnpj: '12.345.678/0001-99',
                telefone: '(51) 99999-9999',
                logradouro: 'Rua Teste',
                municipio: 'Candelária',
                uf: 'RS',
                cep: '96930-000',
                numero: '123',
                tipo: 'MATRIZ',
                email: 'teste@email.com',
                atividade_principal: [{ text: 'Tecnologia' }]
            };

            const useMock = false;

            const data = useMock ? mock : raw;

            this.values = this.mapReceitaToAccount(data);

        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            this.values = {};
        }
    }

    mapReceitaToAccount(raw) {
        if (!raw) return {};

        return {
            Name: raw.nome || '',
            CNPJ__c: raw.cnpj || '',
            Phone: raw.telefone || '',
            BillingStreet: [
                [raw.logradouro, raw.numero].filter(Boolean).join(', '),
                raw.complemento,
                raw.bairro ? `- ${raw.bairro}` : null
            ]
            .filter(Boolean)
            .join(' '),
            BillingCity: raw.municipio || '',
            BillingState: raw.uf || '',
            BillingPostalCode: raw.cep || '',
            BillingCountry: 'Brasil',
            Description: raw.atividade_principal?.[0]?.text || '',
            Industry: raw.atividade_principal?.[0]?.text || '',
            Type: raw.tipo || '',
            AccountNumber: raw.numero || '',
            Website: raw.email ? `mailto:${raw.email}` : ''
        };
    }

    // 🔥 GETTERS (usados no HTML)
    get cnpj() { return this.values.CNPJ__c || ''; }
    get name() { return this.values.Name || ''; }
    get phone() { return this.values.Phone || ''; }
    get street() { return this.values.BillingStreet || ''; }
    get city() { return this.values.BillingCity || ''; }
    get state() { return this.values.BillingState || ''; }
    get cep() { return this.values.BillingPostalCode || ''; }
    get type() { return this.values.Type || ''; }
    get industry() { return this.values.Industry || ''; }
    get accountNumber() { return this.values.AccountNumber || ''; }
    get website() { return this.values.Website || ''; }

    // 🔥 CAPTURA INPUT
    handleInput(event) {
        const field = event.target.name;
        const value = event.target.value;

        this.values = {
            ...this.values,
            [field]: value
        };
    }
}