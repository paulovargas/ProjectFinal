import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { encodeDefaultFieldValues } from 'lightning/pageReferenceUtils';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import search from '@salesforce/apex/ReceitaWSService.searchCNPJ';
import verify from '@salesforce/apex/AccountController.getAccountByCNPJ';

export default class NewAccount extends NavigationMixin(LightningElement) {
     @api jsonData;

    @track isLoading = false;
    @track values = {};
    @track showFoundModal = false;
    @track showCnpjSearchModal = false;
    cnpjModalValue = '';
    foundRecordId;
    cnpjExist;
    nameExist;

    connectedCallback() {
        this.loadData();
        // Abrir o modal de busca por CNPJ automaticamente ao acessar a página
        this.showCnpjSearchModal = true;
        // Sincroniza o valor inicial do campo no modal com o CNPJ atual (se houver)
        this.cnpjModalValue = (this.values?.CNPJ__c || '');
    }

    loadData() {
        try {
            let raw;

            if (this.jsonData) {
                raw = typeof this.jsonData === 'string'
                    ? JSON.parse(this.jsonData)
                    : this.jsonData;
            }

            const data = raw;
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
            Status_Cadastral__c: raw.situacao || ''
        };
    }

    get cnpj() { return this.values.CNPJ__c || ''; }
    get name() { return this.values.Name || ''; }
    get phone() { return this.values.Phone || ''; }
    get street() { return this.values.BillingStreet || ''; }
    get city() { return this.values.BillingCity || ''; }
    get state() { return this.values.BillingState || ''; }
    get cep() { return this.values.BillingPostalCode || ''; }
    get status() { return this.values.Status_Cadastral__c || ''; }

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
            Status_Cadastral__c: this.values.Status_Cadastral__c
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
        // Garante estado limpo ao reabrir
        this.cnpjModalValue = '';
        this.showCnpjSearchModal = true;
        // limpa qualquer erro preso após montar
        requestAnimationFrame(() => {
            const input = this.template.querySelector('lightning-input[name="cnpjModal"]');
            if (input) {
                input.setCustomValidity('');
                input.reportValidity();
            }
        });
    }
    closeCnpjSearchModal() {
        // Fecha modal
        this.showCnpjSearchModal = false;

        // Zera o valor controlado imediatamente
        this.cnpjModalValue = '';

        // Limpa o input (se ainda presente no DOM) no próximo tick
        setTimeout(() => {
            const input = this.template.querySelector('lightning-input[name="cnpjModal"]');
            if (input) {
                input.value = '';
                input.setCustomValidity('');
                input.reportValidity();
            }
        }, 0);
    }
    handleCnpjModalInput(event) {
        this.cnpjModalValue = event.target.value || '';
        // Ao digitar, remova mensagens antigas de erro do input do modal
        const input = event.target;
        input.setCustomValidity('');
        input.reportValidity();
    }

    // Handler do botão "Buscar" dentro do modal de CNPJ
    async handleCnpjModalSearch() {
        this.isLoading = true;
        try {
            const cnpj = (this.cnpjModalValue || '').replace(/\D/g, '');
            if (!cnpj) {
                const input = this.template.querySelector('lightning-input[name="cnpjModal"]');
                if (input) {
                    input.setCustomValidity('Informe um CNPJ válido');
                    input.reportValidity();
                }
                this.dispatchEvent(new ShowToastEvent({
                    title: 'CNPJ vazio',
                    message: 'Preencha o CNPJ para prosseguir.',
                    variant: 'warning',
                }));
                return;
            } else if (cnpj.length < 14) {
                const input = this.template.querySelector('lightning-input[name="cnpjModal"]');
                if (input) {
                    input.setCustomValidity('CNPJ deve conter 14 dígitos');
                    input.reportValidity();
                }
                this.dispatchEvent(new ShowToastEvent({
                    title: 'CNPJ incompleto',
                    message: 'CNPJ deve conter 14 dígitos.',
                    variant: 'warning',
                }));
                return;
            } else {
                const input = this.template.querySelector('lightning-input[name="cnpjModal"]');
                if (input) {
                    input.setCustomValidity('');
                    input.reportValidity();
                }
            }

            // Verifica no Salesforce
            const checked = await verify({ cnpj });
            const foundId = typeof checked === 'string' ? checked : checked?.Id;
            const cnpjExist = typeof checked === 'string' ? checked : checked?.CNPJ__c;
            if (foundId) {
                // Existe: abre modal de registro encontrado e mantém o modal de busca visível
                // para evitar fechamento abrupto; o modal de encontrado deve ser renderizado (HTML ainda não implementado)
                this.foundRecordId = foundId;
                this.cnpjExist = cnpjExist;
                this.nameExist = checked.Name;
                this.showFoundModal = true;
                // NÃO feche o modal de busca aqui para evitar "sumir" sem feedback visual
                // this.showCnpjSearchModal = false;
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

}