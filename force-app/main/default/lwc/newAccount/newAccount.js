import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { encodeDefaultFieldValues } from 'lightning/pageReferenceUtils';
import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import USER_ID from '@salesforce/user/Id';
import NAME_FIELD from '@salesforce/schema/User.Name';
import SMALL_PHOTO from '@salesforce/schema/User.SmallPhotoUrl';
import search from '@salesforce/apex/ReceitaWSService.searchCNPJ';
import verify from '@salesforce/apex/ReceitaWSService.getAccountByCNPJ';

export default class NewAccount extends NavigationMixin(LightningElement) {
     @api jsonData;

    @track isLoading = false;
    @track values = {};
    @track showFoundModal = false;
    @track showCnpjSearchModal = false;
    cnpjModalValue = '';
    foundRecordId;

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

    handleInput(event) {
        const field = event.target.name;
        const value = event.target.value;

        this.values = {
            ...this.values,
            [field]: value
        };
    }

    // Modal: registro existente (já cadastrado)
    handleCloseModal() {
        this.showFoundModal = false;
    }

    handleEditRecord() {
        if (!this.foundRecordId) {
            this.showFoundModal = false;
            return;
        }
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.foundRecordId,
                actionName: 'edit',
                objectApiName: 'Account'
            }
        });
        this.showFoundModal = false;
    }

    buildDefaultFieldValues() {
        return {
            Name: this.values.Name,
            CNPJ__c: (this.values.CNPJ__c || '').replace(/\D/g, ''),
            Phone: this.values.Phone,
            BillingStreet: this.values.BillingStreet,
            BillingCity: this.values.BillingCity,
            BillingState: this.values.BillingState,
            BillingPostalCode: this.values.BillingPostalCode,
            BillingCountry: this.values.BillingCountry,
            Industry: this.values.Industry,
            Type: this.values.Type,
            AccountNumber: this.values.AccountNumber,
            Website: this.values.Website
        };
    }

    openNewWithDefaults() {
        const defaults = this.buildDefaultFieldValues();
        const encoded = encodeDefaultFieldValues(defaults);
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Account',
                actionName: 'new'
            },
            state: {
                defaultFieldValues: encoded
            }
        });
    }

    // Modal: busca por CNPJ (abrir/fechar e input controlado)
    openCnpjSearchModal() {
        this.showCnpjSearchModal = true;
        this.cnpjModalValue = (this.values?.CNPJ__c || '');
    }
    closeCnpjSearchModal() {
        this.showCnpjSearchModal = false;
    }
    handleCnpjModalInput(event) {
        this.cnpjModalValue = event.target.value || '';
    }

    // Handler do botão "Buscar" dentro do modal de CNPJ
    async handleCnpjModalSearch() {
        this.isLoading = true;
        try {
            const cnpj = (this.cnpjModalValue || '').replace(/\D/g, '');
            if (!cnpj) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'CNPJ vazio',
                    message: 'Preencha o CNPJ para prosseguir.',
                    variant: 'warning',
                }));
                return;
            } else if (cnpj.length < 14) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'CNPJ incompleto',
                    message: 'CNPJ deve conter 14 dígitos.',
                    variant: 'warning',
                }));
                return;
            }

            // Verifica no Salesforce
            const checked = await verify({ cnpj });
            const foundId = typeof checked === 'string' ? checked : checked?.Id;
            if (foundId) {
                // Existe: abre modal de registro encontrado
                this.foundRecordId = foundId;
                this.showFoundModal = true;
                this.showCnpjSearchModal = false;
                return;
            }

            // Não existe: busca na API externa
            const result = await search({ cnpj });
            const data = JSON.parse(result);
            if (data.erro) {
                this.values = {};
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Erro na consulta',
                    message: typeof data.erro === 'string' ? data.erro : 'Falha na consulta externa de CNPJ.',
                    variant: 'error',
                }));
                return;
            }

            // Mapeia valores e abre a tela padrão de New Account pré-preenchida
            this.values = this.mapReceitaToAccount(data);
            this.openNewWithDefaults();
            this.showCnpjSearchModal = false;
            return;

        } catch (error) {
            console.error('Erro ao processar busca por CNPJ via modal:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Erro',
                message: 'Falha ao processar a busca por CNPJ.',
                variant: 'error',
            }));
        } finally {
            this.isLoading = false;
        }
    }

    // Handler legado (botão Search inline) - manter por compatibilidade
    async handleSearchCnpj(){
        this.isLoading = true;
        try {
            const cnpj = (this.values?.CNPJ__c || '').replace(/\D/g, '');
            console.log('CNPJ capturado:', cnpj);

            if (!cnpj) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'CNPJ vazio',
                    message: 'Preencha o CNPJ para prosseguir.',
                    variant: 'warning',
                }));
                this.isLoading = false;
                return;
            } else if (cnpj.length < 14) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'CNPJ incompleto',
                    message: 'CNPJ deve conter 14 dígitos.',
                    variant: 'warning',
                }));
                this.isLoading = false;
                return;
            }
            
            const checked = await verify({ cnpj });

            try {
                // Se o Apex retornar um Id (string) ou objeto com Id, abra modal
                const foundId = typeof checked === 'string' ? checked : checked?.Id;
                if (foundId) {
                    this.foundRecordId = foundId;
                    this.showFoundModal = true;
                    // Quando já existe no Salesforce, abrimos o modal e PARAMOS o fluxo,
                    // não chamando a API externa 'searchCNPJ'.
                    return;
                }
            } catch (error) {
                console.error('Erro ao processar verificação de CNPJ:', error);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Erro',
                    message: 'Falha ao verificar CNPJ no Salesforce.',
                    variant: 'error',
                }));
            }


            const result = await search({ cnpj });
            try {
                const data = JSON.parse(result);

                if (data.erro) {
                    console.error('Erro na consulta:', data.erro);
                    this.values = {};
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Erro na consulta',
                        message: typeof data.erro === 'string' ? data.erro : 'Falha na consulta externa de CNPJ.',
                        variant: 'error',
                    }));
                    return;
                }

                this.values = this.mapReceitaToAccount(data);

                // Abrir a tela padrão de "New Account" já pré-preenchida
                this.openNewWithDefaults();
                return;
            } catch (e) {
                console.error('Erro ao processar JSON:', e);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Erro',
                    message: 'Resposta inválida da API externa.',
                    variant: 'error',
                }));
            }
        } catch (error) {
            console.error('Erro ao chamar Apex:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Erro',
                message: 'Falha na comunicação com o servidor.',
                variant: 'error',
            }));
        } finally {
            this.isLoading = false;
        }
    }
}