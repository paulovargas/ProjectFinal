import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { encodeDefaultFieldValues } from "lightning/pageReferenceUtils";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getOrFetchByCNPJ from "@salesforce/apex/AccountController.getOrFetchByCNPJ";

export default class NewAccount extends NavigationMixin(LightningElement) {
  @api jsonData;

  @track isLoading = false;
  values = {};
  showFoundModal = false;
  showCnpjSearchModal = false;
  cnpjModalValue = "";
  foundRecordId;
  cnpjExist;
  nameExist;

  connectedCallback() {
    this.loadData();
    this.showCnpjSearchModal = true;
    this.cnpjModalValue = this.values?.CNPJ__c || "";
  }

  loadData() {
    try {
      let raw;

      if (this.jsonData) {
        raw =
          typeof this.jsonData === "string"
            ? JSON.parse(this.jsonData)
            : this.jsonData;
      }

      this.values = this.mapReceitaToAccount(raw);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
      this.values = {};
    }
  }

  mapReceitaToAccount(raw) {
    if (!raw) return {};

    return {
      Name: raw.nome || "",
      CNPJ__c: raw.cnpj || "",
      Phone: raw.telefone || "",
      BillingStreet: [
        [raw.logradouro, raw.numero].filter(Boolean).join(", "),
        raw.complemento,
        raw.bairro ? `- ${raw.bairro}` : null
      ]
        .filter(Boolean)
        .join(" "),
      BillingCity: raw.municipio || "",
      BillingState: raw.uf || "",
      BillingPostalCode: raw.cep || "",
      BillingCountry: "Brasil",
      Status_Cadastral__c: raw.situacao || ""
    };
  }

  get cnpj() {
    return this.values.CNPJ__c || "";
  }
  get name() {
    return this.values.Name || "";
  }
  get phone() {
    return this.values.Phone || "";
  }
  get street() {
    return this.values.BillingStreet || "";
  }
  get city() {
    return this.values.BillingCity || "";
  }
  get state() {
    return this.values.BillingState || "";
  }
  get cep() {
    return this.values.BillingPostalCode || "";
  }
  get status() {
    return this.values.Status_Cadastral__c || "";
  }

  handleInput(event) {
    const field = event.target.name;
    const value = event.target.value;

    this.values = {
      ...this.values,
      [field]: value
    };
  }

  handleCloseModal() {
    this.showFoundModal = false;
  }

  handleEditRecord() {
    if (!this.foundRecordId) {
      this.showFoundModal = false;
      return;
    }

    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: this.foundRecordId,
        actionName: "edit",
        objectApiName: "Account"
      }
    });

    this.showFoundModal = false;
  }

  buildDefaultFieldValues() {
    return {
      Name: this.values.Name,
      CNPJ__c: (this.values.CNPJ__c || "").replace(/\D/g, ""),
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
      type: "standard__objectPage",
      attributes: {
        objectApiName: "Account",
        actionName: "new"
      },
      state: {
        defaultFieldValues: encoded
      }
    });
  }

  openCnpjSearchModal() {
    this.cnpjModalValue = "";
    this.showCnpjSearchModal = true;

    Promise.resolve().then(() => {
      const input = this.template.querySelector(
        'lightning-input[name="cnpjModal"]'
      );
      if (input) {
        input.setCustomValidity("");
        input.reportValidity();
      }
    });
  }

  closeCnpjSearchModal() {
    this.showCnpjSearchModal = false;
    this.cnpjModalValue = "";

    Promise.resolve().then(() => {
      const input = this.template.querySelector(
        'lightning-input[name="cnpjModal"]'
      );
      if (input) {
        input.value = "";
        input.setCustomValidity("");
        input.reportValidity();
      }
    });
  }

  handleCnpjModalInput(event) {
    this.cnpjModalValue = event.target.value || "";
    const input = event.target;
    input.setCustomValidity("");
    input.reportValidity();
  }

  async handleCnpjModalSearch() {
    this.isLoading = true;

    try {
      const cnpj = (this.cnpjModalValue || "").replace(/\D/g, "");

      if (!cnpj) {
        this.showWarning("CNPJ vazio", "Preencha o CNPJ para prosseguir.");
        return;
      }

      if (cnpj.length < 14) {
        this.showWarning("CNPJ incompleto", "CNPJ deve conter 14 dígitos.");
        return;
      }

      // Usa método unificado no Apex para orquestrar (consulta + API)
      const result = await getOrFetchByCNPJ({ cnpj });

      if (!result || result.success === false) {
        const message = result?.message || "Falha ao consultar CNPJ.";
        this.values = {};
        this.showError("Erro na consulta", message);
        return;
      }

      // Se já existe conta
      if (result.foundAccount) {
        const acc = result.foundAccount;
        this.foundRecordId = acc.Id;
        this.cnpjExist = acc.CNPJ__c;
        this.nameExist = acc.Name;
        this.showFoundModal = true;
        return;
      }

      // Caso sem conta, usa dados da Receita
      if (result.receitaData) {
        this.values = this.mapReceitaToAccount(result.receitaData);
        this.openNewWithDefaults();
        this.showCnpjSearchModal = false;
        return;
      }

      // Fallback defensivo
      this.showError("Erro", "Resposta inesperada do servidor.");
    } catch (error) {
      console.error(error);
      this.showError("Erro", "Falha ao processar a busca por CNPJ.");
    } finally {
      this.isLoading = false;
    }
  }

  showWarning(title, message) {
    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant: "warning"
      })
    );
  }

  showError(title, message) {
    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant: "error"
      })
    );
  }
}
